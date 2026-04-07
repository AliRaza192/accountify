"""
Tax Management Service
Handles tax rates, sales tax returns, WHT calculations, and challan generation
"""

import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID

from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.models.tax_management import TaxRate, TaxReturn, WHTTransaction
from app.schemas.tax_management import (
    TaxRateCreate, TaxRateUpdate, TaxReturnCreate, TaxReturnUpdate,
    WHTTransactionCreate, WHTChallanRequest, NTNVerificationRequest
)

logger = logging.getLogger(__name__)


class TaxManagementService:
    """Service for tax management operations"""

    def __init__(self, db: Session):
        self.db = db

    # ============ Tax Rate Operations ============

    def get_tax_rates(
        self,
        company_id: UUID,
        tax_type: Optional[str] = None,
        is_active: bool = True,
        effective_date: Optional[date] = None
    ) -> List[TaxRate]:
        """Get tax rates with optional filters"""
        query = select(TaxRate).where(TaxRate.company_id == company_id)

        if tax_type:
            query = query.where(TaxRate.tax_type == tax_type)
        if is_active is not None:
            query = query.where(TaxRate.is_active == is_active)
        if effective_date:
            query = query.where(
                and_(
                    TaxRate.effective_date <= effective_date,
                    or_(
                        TaxRate.end_date.is_(None),
                        TaxRate.end_date >= effective_date
                    )
                )
            )

        result = self.db.execute(query.order_by(TaxRate.tax_name))
        return list(result.scalars().all())

    def get_tax_rate(self, company_id: UUID, rate_id: UUID) -> Optional[TaxRate]:
        """Get a single tax rate by ID"""
        query = select(TaxRate).where(
            and_(
                TaxRate.id == rate_id,
                TaxRate.company_id == company_id
            )
        )
        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def create_tax_rate(self, company_id: UUID, rate_data: TaxRateCreate, created_by: UUID) -> TaxRate:
        """Create a new tax rate"""
        rate = TaxRate(
            company_id=company_id,
            created_by=created_by,
            **rate_data.model_dump()
        )
        self.db.add(rate)
        self.db.commit()
        self.db.refresh(rate)
        logger.info(f"Created tax rate: {rate.tax_name} ({rate.rate_percent}%)")
        return rate

    def update_tax_rate(
        self,
        company_id: UUID,
        rate_id: UUID,
        update_data: TaxRateUpdate
    ) -> Optional[TaxRate]:
        """Update an existing tax rate"""
        rate = self.get_tax_rate(company_id, rate_id)
        if not rate:
            return None

        for field, value in update_data.model_dump(exclude_unset=True).items():
            setattr(rate, field, value)

        self.db.commit()
        self.db.refresh(rate)
        logger.info(f"Updated tax rate: {rate.tax_name}")
        return rate

    def get_active_sales_tax_rate(self, company_id: UUID, transaction_date: date) -> Optional[TaxRate]:
        """Get the active sales tax rate for a given date"""
        rates = self.get_tax_rates(
            company_id=company_id,
            tax_type="sales_tax",
            is_active=True,
            effective_date=transaction_date
        )
        return rates[0] if rates else None

    def get_active_wht_rate(
        self,
        company_id: UUID,
        category: str,
        transaction_date: date
    ) -> Optional[TaxRate]:
        """Get the active WHT rate for a given category and date"""
        rates = self.get_tax_rates(
            company_id=company_id,
            tax_type="wht",
            is_active=True,
            effective_date=transaction_date
        )
        # Filter by category match in tax_name
        for rate in rates:
            if category.lower() in rate.tax_name.lower():
                return rate
        return None

    # ============ Sales Tax Calculation ============

    def calculate_sales_tax(
        self,
        company_id: UUID,
        taxable_amount: Decimal,
        transaction_date: date,
        is_tax_registered: bool = True
    ) -> Tuple[Decimal, Decimal]:
        """
        Calculate sales tax (output tax) on a taxable sale.
        Returns (tax_amount, total_amount)
        """
        if not is_tax_registered:
            # No output tax for unregistered customers
            return Decimal("0"), taxable_amount

        tax_rate = self.get_active_sales_tax_rate(company_id, transaction_date)
        if not tax_rate:
            # Default to 17% GST if no rate found
            tax_rate_percent = Decimal("17.0")
        else:
            tax_rate_percent = tax_rate.rate_percent

        tax_amount = (taxable_amount * tax_rate_percent / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        total_amount = taxable_amount + tax_amount
        return tax_amount, total_amount

    def calculate_input_tax(
        self,
        company_id: UUID,
        taxable_amount: Decimal,
        transaction_date: date,
        supplier_is_registered: bool = True
    ) -> Tuple[Decimal, Decimal]:
        """
        Calculate input tax on a taxable purchase.
        Returns (input_tax_amount, total_amount)
        """
        if not supplier_is_registered:
            return Decimal("0"), taxable_amount

        tax_rate = self.get_active_sales_tax_rate(company_id, transaction_date)
        if not tax_rate:
            tax_rate_percent = Decimal("17.0")
        else:
            tax_rate_percent = tax_rate.rate_percent

        tax_amount = (taxable_amount * tax_rate_percent / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        total_amount = taxable_amount + tax_amount
        return tax_amount, total_amount

    # ============ WHT Calculation ============

    def calculate_wht(
        self,
        company_id: UUID,
        amount: Decimal,
        category: str,
        transaction_date: date,
        is_filer: bool = True
    ) -> Tuple[Decimal, Decimal]:
        """
        Calculate withholding tax on a payment.
        Returns (wht_amount, net_payment_amount)
        """
        wht_rate_obj = self.get_active_wht_rate(company_id, category, transaction_date)

        if wht_rate_obj:
            wht_rate = wht_rate_obj.rate_percent
        else:
            # Default rates based on category
            default_rates = {
                "goods": Decimal("1.5"),
                "services": Decimal("6.0"),
                "rent": Decimal("10.0"),
                "salary": Decimal("0"),  # Salary uses slab rates
            }
            wht_rate = default_rates.get(category.lower(), Decimal("0"))

            # Non-filers pay double rate as per FBR rules
            if not is_filer:
                wht_rate *= 2

        wht_amount = (amount * wht_rate / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        net_payment = amount - wht_amount
        return wht_amount, net_payment

    def record_wht_transaction(
        self,
        company_id: UUID,
        transaction_data: WHTTransactionCreate,
        created_by: UUID
    ) -> WHTTransaction:
        """Record a WHT deduction transaction"""
        wht_txn = WHTTransaction(
            company_id=company_id,
            created_by=created_by,
            **transaction_data.model_dump()
        )
        self.db.add(wht_txn)
        self.db.commit()
        self.db.refresh(wht_txn)
        logger.info(
            f"Recorded WHT: {wht_txn.wht_category} - PKR {wht_txn.wht_amount} "
            f"on PKR {wht_txn.amount}"
        )
        return wht_txn

    def get_wht_transactions(
        self,
        company_id: UUID,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        wht_category: Optional[str] = None,
        challan_id: Optional[UUID] = None
    ) -> List[WHTTransaction]:
        """Get WHT transactions with optional filters"""
        query = select(WHTTransaction).where(WHTTransaction.company_id == company_id)

        if from_date:
            query = query.where(WHTTransaction.transaction_date >= from_date)
        if to_date:
            query = query.where(WHTTransaction.transaction_date <= to_date)
        if wht_category:
            query = query.where(WHTTransaction.wht_category == wht_category)
        if challan_id:
            query = query.where(WHTTransaction.challan_id == challan_id)

        result = self.db.execute(query.order_by(WHTTransaction.transaction_date.desc()))
        return list(result.scalars().all())

    # ============ Tax Return Operations ============

    def get_tax_returns(
        self,
        company_id: UUID,
        status: Optional[str] = None
    ) -> List[TaxReturn]:
        """Get tax returns for a company"""
        query = select(TaxReturn).where(TaxReturn.company_id == company_id)
        if status:
            query = query.where(TaxReturn.status == status)
        result = self.db.execute(
            query.order_by(TaxReturn.return_period_year.desc(), TaxReturn.return_period_month.desc())
        )
        return list(result.scalars().all())

    def get_tax_return(self, company_id: UUID, return_id: UUID) -> Optional[TaxReturn]:
        """Get a single tax return by ID"""
        query = select(TaxReturn).where(
            and_(
                TaxReturn.id == return_id,
                TaxReturn.company_id == company_id
            )
        )
        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def generate_sales_tax_return(
        self,
        company_id: UUID,
        period_month: int,
        period_year: int
    ) -> Dict[str, Any]:
        """
        Generate Sales Tax Return report in SRB/FBR format.
        Calculates output tax from sales invoices and input tax from purchase bills.
        """
        total_output_tax = Decimal("0")
        taxable_sales_items = []
        total_input_tax = Decimal("0")
        taxable_purchase_items = []

        # Try to get data from invoices/bills if they exist
        try:
            from app.models.invoices import Invoice
            from app.models.bills import Bill
            from app.models.customers import Customer
            from app.models.vendors import Vendor
            from sqlalchemy import func

            # Get all taxable sales for the period
            sales_query = (
                select(Invoice, Customer)
                .join(Customer, Invoice.customer_id == Customer.id)
                .where(
                    and_(
                        Invoice.company_id == company_id,
                        func.extract('month', Invoice.invoice_date) == period_month,
                        func.extract('year', Invoice.invoice_date) == period_year,
                        Invoice.status == 'posted'
                    )
                )
            )
            sales_result = self.db.execute(sales_query)
            sales_invoices = sales_result.all()

            for inv, cust in sales_invoices:
                if inv.tax_amount and inv.tax_amount > 0:
                    total_output_tax += inv.tax_amount
                    taxable_sales_items.append({
                        "invoice_number": inv.invoice_number,
                        "party_name": cust.name,
                        "party_ntn": cust.ntn,
                        "taxable_amount": inv.subtotal,
                        "tax_amount": inv.tax_amount,
                        "transaction_date": inv.invoice_date
                    })

            # Get all taxable purchases for the period
            purchase_query = (
                select(Bill, Vendor)
                .join(Vendor, Bill.vendor_id == Vendor.id)
                .where(
                    and_(
                        Bill.company_id == company_id,
                        func.extract('month', Bill.bill_date) == period_month,
                        func.extract('year', Bill.bill_date) == period_year,
                        Bill.status == 'posted'
                    )
                )
            )
            purchase_result = self.db.execute(purchase_query)
            purchase_bills = purchase_result.all()

            for bill, vend in purchase_bills:
                if bill.tax_amount and bill.tax_amount > 0:
                    total_input_tax += bill.tax_amount
                    taxable_purchase_items.append({
                        "bill_number": bill.bill_number,
                        "party_name": vend.name,
                        "party_ntn": vend.ntn,
                        "taxable_amount": bill.subtotal,
                        "tax_amount": bill.tax_amount,
                        "transaction_date": bill.bill_date
                    })
        except ImportError:
            # Invoice/Bill models don't exist yet - return empty data
            logger.info("Invoice/Bill models not available yet - returning empty tax return data")
        except Exception as e:
            logger.warning(f"Error fetching invoice/bill data for tax return: {e}")

        net_tax_payable = total_output_tax - total_input_tax

        return {
            "return_period": f"{period_month:02d}/{period_year}",
            "output_tax_total": total_output_tax.quantize(Decimal("0.01")),
            "input_tax_total": total_input_tax.quantize(Decimal("0.01")),
            "net_tax_payable": net_tax_payable.quantize(Decimal("0.01")),
            "taxable_sales": taxable_sales_items,
            "taxable_purchases": taxable_purchase_items
        }

    def create_tax_return(
        self,
        company_id: UUID,
        return_data: TaxReturnCreate,
        created_by: UUID
    ) -> TaxReturn:
        """Create/file a tax return"""
        tax_return = TaxReturn(
            company_id=company_id,
            created_by=created_by,
            **return_data.model_dump()
        )
        self.db.add(tax_return)
        self.db.commit()
        self.db.refresh(tax_return)
        logger.info(
            f"Created tax return: {tax_return.return_period_month}/{tax_return.return_period_year} "
            f"- Status: {tax_return.status}"
        )
        return tax_return

    def update_tax_return(
        self,
        company_id: UUID,
        return_id: UUID,
        update_data: TaxReturnUpdate
    ) -> Optional[TaxReturn]:
        """Update an existing tax return"""
        tax_return = self.get_tax_return(company_id, return_id)
        if not tax_return:
            return None

        for field, value in update_data.model_dump(exclude_unset=True).items():
            setattr(tax_return, field, value)

        self.db.commit()
        self.db.refresh(tax_return)
        logger.info(f"Updated tax return: {tax_return.id}")
        return tax_return

    # ============ WHT Challan Generation ============

    def generate_wht_challan(
        self,
        company_id: UUID,
        request: WHTChallanRequest,
        created_by: UUID
    ) -> Dict[str, Any]:
        """
        Generate WHT challan for a given period.
        Creates a tax return record and links all eligible WHT transactions.
        """
        # Get unlinked WHT transactions for the period
        query = select(WHTTransaction).where(
            and_(
                WHTTransaction.company_id == company_id,
                func.extract('month', WHTTransaction.transaction_date) == request.period_month,
                func.extract('year', WHTTransaction.transaction_date) == request.period_year,
                WHTTransaction.challan_id.is_(None)
            )
        )

        if request.wht_categories:
            query = query.where(WHTTransaction.wht_category.in_(request.wht_categories))

        result = self.db.execute(query)
        transactions = list(result.scalars().all())

        if not transactions:
            return {
                "challan_number": None,
                "period_month": request.period_month,
                "period_year": request.period_year,
                "total_wht": Decimal("0"),
                "categories": [],
                "transaction_ids": [],
                "message": "No unlinked WHT transactions found for this period"
            }

        # Generate challan number
        challan_number = f"WHT-{request.period_year}{request.period_month:02d}-{company_id.hex[:6].upper()}"

        # Calculate totals
        total_wht = sum(t.wht_amount for t in transactions)
        categories = list(set(t.wht_category for t in transactions))
        transaction_ids = [t.id for t in transactions]

        # Create tax return record for WHT
        tax_return = TaxReturn(
            company_id=company_id,
            created_by=created_by,
            return_period_month=request.period_month,
            return_period_year=request.period_year,
            output_tax_total=Decimal("0"),
            input_tax_total=Decimal("0"),
            net_tax_payable=total_wht,
            challan_number=challan_number,
            challan_date=date.today(),
            status="draft"
        )
        self.db.add(tax_return)
        self.db.commit()
        self.db.refresh(tax_return)

        # Link all transactions to this challan
        for txn in transactions:
            txn.challan_id = tax_return.id

        self.db.commit()

        logger.info(
            f"Generated WHT challan: {challan_number} - "
            f"Total: PKR {total_wht}, Transactions: {len(transactions)}"
        )

        return {
            "challan_number": challan_number,
            "period_month": request.period_month,
            "period_year": request.period_year,
            "total_wht": total_wht.quantize(Decimal("0.01")),
            "categories": categories,
            "transaction_ids": transaction_ids,
            "tax_return_id": tax_return.id
        }

    # ============ NTN/STRN Verification ============

    def verify_ntn(
        self,
        company_id: UUID,
        request: NTNVerificationRequest,
        verified_by: UUID
    ) -> Dict[str, Any]:
        """
        Verify NTN/STRN number.
        Currently supports manual verification. FBR API integration can be added later.
        """
        # Manual verification by user
        # In future: call FBR IRIS API for automated verification
        return {
            "verified": request.verified_by_user,
            "ntn": request.ntn,
            "strn": request.strn,
            "verification_timestamp": date.today().isoformat()
        }

    # ============ Tax Reports ============

    def get_input_output_tax_report(
        self,
        company_id: UUID,
        period_month: int,
        period_year: int
    ) -> Dict[str, Any]:
        """Generate Input/Output Tax Reconciliation Report"""
        sales_data = self.generate_sales_tax_return(company_id, period_month, period_year)

        return {
            "period": f"{period_month:02d}/{period_year}",
            "total_output_tax": sales_data["output_tax_total"],
            "total_input_tax": sales_data["input_tax_total"],
            "net_tax_payable": sales_data["net_tax_payable"],
            "output_tax_details": sales_data["taxable_sales"],
            "input_tax_details": sales_data["taxable_purchases"]
        }

    def get_tax_reconciliation(
        self,
        company_id: UUID,
        period_month: int,
        period_year: int
    ) -> Dict[str, Any]:
        """Generate Tax Reconciliation Report"""
        sales_data = self.generate_sales_tax_return(company_id, period_month, period_year)

        # Get filed tax returns for the period
        tax_returns = self.get_tax_returns(company_id)
        period_returns = [
            r for r in tax_returns
            if r.return_period_month == period_month and r.return_period_year == period_year
        ]

        return {
            "period": f"{period_month:02d}/{period_year}",
            "calculated_output_tax": sales_data["output_tax_total"],
            "calculated_input_tax": sales_data["input_tax_total"],
            "calculated_net_payable": sales_data["net_tax_payable"],
            "filed_returns": [
                {
                    "id": str(r.id),
                    "status": r.status,
                    "challan_number": r.challan_number,
                    "filed_date": r.filed_date.isoformat() if r.filed_date else None
                }
                for r in period_returns
            ],
            "taxable_sales_count": len(sales_data["taxable_sales"]),
            "taxable_purchases_count": len(sales_data["taxable_purchases"])
        }

    def get_wht_summary(
        self,
        company_id: UUID,
        from_date: date,
        to_date: date
    ) -> Dict[str, Any]:
        """Generate WHT Summary Report by category"""
        transactions = self.get_wht_transactions(
            company_id=company_id,
            from_date=from_date,
            to_date=to_date
        )

        # Group by category
        category_summary: Dict[str, Dict[str, Any]] = {}
        for txn in transactions:
            cat = txn.wht_category
            if cat not in category_summary:
                category_summary[cat] = {
                    "category": cat,
                    "total_amount": Decimal("0"),
                    "total_wht": Decimal("0"),
                    "count": 0
                }
            category_summary[cat]["total_amount"] += txn.amount
            category_summary[cat]["total_wht"] += txn.wht_amount
            category_summary[cat]["count"] += 1

        categories = list(category_summary.values())
        grand_total = sum(c["total_wht"] for c in categories)

        return {
            "period": f"{from_date.isoformat()} to {to_date.isoformat()}",
            "categories": categories,
            "grand_total_wht": grand_total.quantize(Decimal("0.01")) if categories else Decimal("0")
        }
