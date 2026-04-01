"""
Tax Management API Router
Endpoints: Tax rates, returns, WHT, reports
"""

import logging
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date
from uuid import UUID

from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user
from app.models.tax_management import TaxRate, TaxReturn, WHTTransaction
from app.schemas.tax_management import (
    TaxRateCreate, TaxRateUpdate, TaxRateResponse,
    TaxReturnCreate, TaxReturnGenerate, TaxReturnUpdate, TaxReturnResponse, TaxReturnDetail,
    WHTTransactionCreate, WHTTransactionResponse, WHTSummary,
    TaxSummary, OutputTaxItem, InputTaxItem
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ============ Helper Functions ============

def get_tax_rate_or_404(db: Session, company_id: UUID, rate_id: UUID) -> TaxRate:
    """Get tax rate or raise 404"""
    from sqlalchemy import select, and_
    query = select(TaxRate).where(
        and_(
            TaxRate.id == rate_id,
            TaxRate.company_id == company_id
        )
    )
    result = db.execute(query).scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Tax rate not found")
    return result


def get_tax_return_or_404(db: Session, company_id: UUID, return_id: UUID) -> TaxReturn:
    """Get tax return or raise 404"""
    from sqlalchemy import select, and_
    query = select(TaxReturn).where(
        and_(
            TaxReturn.id == return_id,
            TaxReturn.company_id == company_id
        )
    )
    result = db.execute(query).scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Tax return not found")
    return result


# ============ Tax Rates Endpoints ============

@router.get("/rates", response_model=List[TaxRateResponse])
async def list_tax_rates(
    tax_type: Optional[str] = None,
    is_active: bool = True,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all tax rates"""
    try:
        from sqlalchemy import select, and_
        query = select(TaxRate).where(TaxRate.company_id == current_user.company_id)
        
        if tax_type:
            query = query.where(TaxRate.tax_type == tax_type)
        if is_active:
            query = query.where(TaxRate.is_active == True)
        
        query = query.order_by(TaxRate.tax_type, TaxRate.rate_percent)
        result = service.execute(query)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error listing tax rates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rates", response_model=TaxRateResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_rate(
    tax_rate: TaxRateCreate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new tax rate"""
    try:
        db_tax_rate = TaxRate(
            company_id=current_user.company_id,
            **tax_rate.model_dump()
        )
        service.add(db_tax_rate)
        service.commit()
        service.refresh(db_tax_rate)
        return db_tax_rate
    except Exception as e:
        logger.error(f"Error creating tax rate: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/rates/{rate_id}", response_model=TaxRateResponse)
async def update_tax_rate(
    rate_id: UUID,
    tax_rate: TaxRateUpdate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing tax rate"""
    try:
        db_tax_rate = get_tax_rate_or_404(service, current_user.company_id, rate_id)
        
        update_data = tax_rate.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_tax_rate, field, value)
        
        service.commit()
        service.refresh(db_tax_rate)
        return db_tax_rate
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating tax rate: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Tax Returns Endpoints ============

@router.get("/returns", response_model=List[TaxReturnResponse])
async def list_tax_returns(
    status_filter: Optional[str] = Query(None, alias="status"),
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all tax returns"""
    try:
        from sqlalchemy import select, and_
        query = select(TaxReturn).where(TaxReturn.company_id == current_user.company_id)
        
        if status_filter:
            query = query.where(TaxReturn.status == status_filter)
        
        query = query.order_by(TaxReturn.return_period_year.desc(), TaxReturn.return_period_month.desc())
        result = service.execute(query)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error listing tax returns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/returns/generate", response_model=TaxReturnResponse, status_code=status.HTTP_201_CREATED)
async def generate_tax_return(
    generate_data: TaxReturnGenerate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Auto-generate monthly tax return from invoices and bills"""
    try:
        from sqlalchemy import select, func, and_
        from app.models.invoices import Invoice
        from app.models.bills import Bill
        
        # Check if return already exists
        existing = service.execute(
            select(TaxReturn).where(
                and_(
                    TaxReturn.company_id == current_user.company_id,
                    TaxReturn.return_period_month == generate_data.return_period_month,
                    TaxReturn.return_period_year == generate_data.return_period_year
                )
            )
        ).scalar_one_or_none()
        
        if existing:
            raise HTTPException(status_code=400, detail="Tax return already exists for this period")
        
        # Calculate output tax from invoices
        from datetime import datetime, timezone
        start_date = date(generate_data.return_period_year, generate_data.return_period_month, 1)
        if generate_data.return_period_month == 12:
            end_date = date(generate_data.return_period_year + 1, 1, 1)
        else:
            end_date = date(generate_data.return_period_year, generate_data.return_period_month + 1, 1)
        
        output_tax_query = select(func.sum(Invoice.tax_amount)).where(
            and_(
                Invoice.company_id == current_user.company_id,
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date < end_date
            )
        )
        output_tax = service.execute(output_tax_query).scalar() or Decimal('0')
        
        # Calculate input tax from bills
        input_tax_query = select(func.sum(Bill.tax_amount)).where(
            and_(
                Bill.company_id == current_user.company_id,
                Bill.bill_date >= start_date,
                Bill.bill_date < end_date
            )
        )
        input_tax = service.execute(input_tax_query).scalar() or Decimal('0')
        
        # Calculate net payable
        net_payable = output_tax - input_tax
        
        # Create tax return
        tax_return = TaxReturn(
            company_id=current_user.company_id,
            return_period_month=generate_data.return_period_month,
            return_period_year=generate_data.return_period_year,
            output_tax_total=output_tax,
            input_tax_total=input_tax,
            net_tax_payable=net_payable,
            status="draft"
        )
        service.add(tax_return)
        service.commit()
        service.refresh(tax_return)
        
        logger.info(f"Generated tax return for {generate_data.return_period_month}/{generate_data.return_period_year}")
        return tax_return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating tax return: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/returns/{return_id}", response_model=TaxReturnDetail)
async def get_tax_return(
    return_id: UUID,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tax return detail with breakdown"""
    try:
        tax_return = get_tax_return_or_404(service, current_user.company_id, return_id)
        
        # In production, would fetch invoice/bill breakdown here
        return TaxReturnDetail(
            id=tax_return.id,
            return_period_month=tax_return.return_period_month,
            return_period_year=tax_return.return_period_year,
            output_tax_total=tax_return.output_tax_total,
            input_tax_total=tax_return.input_tax_total,
            net_tax_payable=tax_return.net_tax_payable,
            filed_date=tax_return.filed_date,
            challan_number=tax_return.challan_number,
            challan_date=tax_return.challan_date,
            status=tax_return.status,
            created_at=tax_return.created_at,
            output_tax_items=[],
            input_tax_items=[]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tax return: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/returns/{return_id}/file", response_model=TaxReturnResponse)
async def file_tax_return(
    return_id: UUID,
    filing_data: TaxReturnUpdate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark tax return as filed"""
    try:
        tax_return = get_tax_return_or_404(service, current_user.company_id, return_id)
        
        update_data = filing_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tax_return, field, value)
        
        tax_return.status = "filed"
        if not tax_return.filed_date:
            tax_return.filed_date = date.today()
        
        service.commit()
        service.refresh(tax_return)
        return tax_return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error filing tax return: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ WHT Transactions Endpoints ============

@router.get("/wht", response_model=List[WHTTransactionResponse])
async def list_wht_transactions(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    wht_category: Optional[str] = None,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List WHT transactions"""
    try:
        from sqlalchemy import select, and_
        query = select(WHTTransaction).where(WHTTransaction.company_id == current_user.company_id)
        
        if from_date:
            query = query.where(WHTTransaction.transaction_date >= from_date)
        if to_date:
            query = query.where(WHTTransaction.transaction_date <= to_date)
        if wht_category:
            query = query.where(WHTTransaction.wht_category == wht_category)
        
        query = query.order_by(WHTTransaction.transaction_date.desc())
        result = service.execute(query)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error listing WHT transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/wht", response_model=WHTTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_wht_transaction(
    wht_transaction: WHTTransactionCreate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a WHT transaction"""
    try:
        db_transaction = WHTTransaction(
            company_id=current_user.company_id,
            **wht_transaction.model_dump()
        )
        service.add(db_transaction)
        service.commit()
        service.refresh(db_transaction)
        return db_transaction
    except Exception as e:
        logger.error(f"Error creating WHT transaction: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/wht/summary", response_model=List[WHTSummary])
async def get_wht_summary(
    period_month: int = Query(None, ge=1, le=12),
    period_year: int = Query(None, ge=2020),
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get WHT summary by category"""
    try:
        from sqlalchemy import select, func, and_
        query = select(
            WHTTransaction.wht_category,
            func.sum(WHTTransaction.amount).label('total_amount'),
            func.sum(WHTTransaction.wht_amount).label('total_wht'),
            func.count(WHTTransaction.id).label('transaction_count')
        ).where(WHTTransaction.company_id == current_user.company_id)
        
        if period_month and period_year:
            start_date = date(period_year, period_month, 1)
            if period_month == 12:
                end_date = date(period_year + 1, 1, 1)
            else:
                end_date = date(period_year, period_month + 1, 1)
            query = query.where(and_(
                WHTTransaction.transaction_date >= start_date,
                WHTTransaction.transaction_date < end_date
            ))
        
        query = query.group_by(WHTTransaction.wht_category)
        result = service.execute(query)
        
        return [
            WHTSummary(
                category=row.wht_category,
                total_amount=Decimal(str(row.total_amount)),
                total_wht=Decimal(str(row.total_wht)),
                transaction_count=row.transaction_count
            )
            for row in result
        ]
    except Exception as e:
        logger.error(f"Error getting WHT summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Tax Reports Endpoints ============

@router.get("/summary", response_model=TaxSummary)
async def get_tax_summary(
    period_month: int = Query(None, ge=1, le=12),
    period_year: int = Query(None, ge=2020),
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tax dashboard summary"""
    try:
        from sqlalchemy import select, func, and_
        
        # Get current period
        if not period_month or not period_year:
            today = date.today()
            period_month = today.month
            period_year = today.year
        
        # Calculate output tax
        start_date = date(period_year, period_month, 1)
        if period_month == 12:
            end_date = date(period_year + 1, 1, 1)
        else:
            end_date = date(period_year, period_month + 1, 1)
        
        from app.models.invoices import Invoice
        output_tax_query = select(func.sum(Invoice.tax_amount)).where(
            and_(
                Invoice.company_id == current_user.company_id,
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date < end_date
            )
        )
        output_tax = service.execute(output_tax_query).scalar() or Decimal('0')
        
        # Calculate input tax
        from app.models.bills import Bill
        input_tax_query = select(func.sum(Bill.tax_amount)).where(
            and_(
                Bill.company_id == current_user.company_id,
                Bill.bill_date >= start_date,
                Bill.bill_date < end_date
            )
        )
        input_tax = service.execute(input_tax_query).scalar() or Decimal('0')
        
        # Calculate WHT deducted
        wht_query = select(func.sum(WHTTransaction.wht_amount)).where(
            and_(
                WHTTransaction.company_id == current_user.company_id,
                WHTTransaction.transaction_date >= start_date,
                WHTTransaction.transaction_date < end_date
            )
        )
        wht_deducted = service.execute(wht_query).scalar() or Decimal('0')
        
        # Count returns
        returns_query = select(TaxReturn).where(TaxReturn.company_id == current_user.company_id)
        all_returns = service.execute(returns_query).scalars().all()
        returns_filed = len([r for r in all_returns if r.status == 'filed'])
        returns_pending = len([r for r in all_returns if r.status == 'draft'])
        
        return TaxSummary(
            period=f"{period_month}/{period_year}",
            output_tax=output_tax,
            input_tax=input_tax,
            net_payable=output_tax - input_tax,
            wht_deducted=wht_deducted,
            returns_filed=returns_filed,
            returns_pending=returns_pending
        )
    except Exception as e:
        logger.error(f"Error getting tax summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/output-tax", response_model=List[OutputTaxItem])
async def get_output_tax_report(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get output tax report (sales tax collected)"""
    try:
        from sqlalchemy import select, and_
        from app.models.invoices import Invoice
        from app.models.customers import Customer
        
        query = select(
            Invoice.invoice_number,
            Customer.name.label('customer_name'),
            Customer.ntn,
            Invoice.taxable_amount,
            Invoice.tax_amount,
            Invoice.invoice_date
        ).join(
            Customer, Invoice.customer_id == Customer.id
        ).where(
            and_(
                Invoice.company_id == current_user.company_id,
                Invoice.tax_amount > 0
            )
        )
        
        if from_date:
            query = query.where(Invoice.invoice_date >= from_date)
        if to_date:
            query = query.where(Invoice.invoice_date <= to_date)
        
        query = query.order_by(Invoice.invoice_date)
        result = service.execute(query)
        
        return [
            OutputTaxItem(
                invoice_number=row.invoice_number,
                customer_name=row.customer_name,
                customer_ntn=row.ntn,
                taxable_amount=Decimal(str(row.taxable_amount)),
                tax_amount=Decimal(str(row.tax_amount)),
                date=row.invoice_date
            )
            for row in result
        ]
    except Exception as e:
        logger.error(f"Error getting output tax report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/input-tax", response_model=List[InputTaxItem])
async def get_input_tax_report(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get input tax report (purchase tax paid)"""
    try:
        from sqlalchemy import select, and_
        from app.models.bills import Bill
        from app.models.vendors import Vendor
        
        query = select(
            Bill.bill_number,
            Vendor.name.label('vendor_name'),
            Vendor.ntn,
            Bill.taxable_amount,
            Bill.tax_amount,
            Bill.bill_date
        ).join(
            Vendor, Bill.vendor_id == Vendor.id
        ).where(
            and_(
                Bill.company_id == current_user.company_id,
                Bill.tax_amount > 0
            )
        )
        
        if from_date:
            query = query.where(Bill.bill_date >= from_date)
        if to_date:
            query = query.where(Bill.bill_date <= to_date)
        
        query = query.order_by(Bill.bill_date)
        result = service.execute(query)
        
        return [
            InputTaxItem(
                bill_number=row.bill_number,
                vendor_name=row.vendor_name,
                vendor_ntn=row.ntn,
                taxable_amount=Decimal(str(row.taxable_amount)),
                tax_amount=Decimal(str(row.tax_amount)),
                date=row.bill_date
            )
            for row in result
        ]
    except Exception as e:
        logger.error(f"Error getting input tax report: {e}")
        raise HTTPException(status_code=500, detail=str(e))
