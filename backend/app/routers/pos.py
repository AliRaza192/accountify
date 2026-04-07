from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone, date
from decimal import Decimal
import logging

from app.database import supabase
from app.types import User
from app.routers.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class POSItem(BaseModel):
    product_id: UUID
    quantity: int = 1
    rate: Optional[Decimal] = None
    tax_rate: Decimal = Decimal("18")  # Default 18% tax


class POSSaleRequest(BaseModel):
    customer_id: Optional[UUID] = None
    items: List[POSItem]
    discount: Decimal = Decimal("0")
    payment_method: str = "cash"  # cash, card, bank
    notes: Optional[str] = None


class ReceiptItem(BaseModel):
    product_name: str
    product_code: str
    quantity: int
    rate: Decimal
    tax_rate: Decimal
    amount: Decimal


class ReceiptData(BaseModel):
    invoice_number: str
    date: datetime
    customer_name: Optional[str]
    items: List[ReceiptItem]
    subtotal: Decimal
    tax_total: Decimal
    discount: Decimal
    total: Decimal
    payment_method: str
    notes: Optional[str]


class POSSaleResponse(BaseModel):
    success: bool
    message: str
    invoice_id: UUID
    invoice_number: str
    total: Decimal
    receipt: ReceiptData


# ============ Shift Management ============

class ShiftOpen(BaseModel):
    opening_cash: Decimal
    notes: Optional[str] = None


class ShiftClose(BaseModel):
    closing_cash: Decimal
    notes: Optional[str] = None


class ShiftSummary(BaseModel):
    id: UUID
    shift_number: str
    opened_at: datetime
    closed_at: Optional[datetime]
    opening_cash: Decimal
    expected_cash: Decimal
    actual_cash: Decimal
    difference: Decimal
    total_sales: int
    total_amount: Decimal
    status: str  # open, closed
    cashier_id: UUID
    cashier_name: str


@router.post("/shift/open", response_model=ShiftSummary)
async def open_pos_shift(
    shift_data: ShiftOpen,
    current_user: User = Depends(get_current_user)
):
    """Open a new POS shift with cash count"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Check if there's already an open shift
    open_shift = supabase.table("pos_shifts").select("*").eq("company_id", str(current_user.company_id)).eq("cashier_id", str(current_user.id)).eq("status", "open").execute()
    if open_shift.data and len(open_shift.data) > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have an open shift. Close it first.")

    # Generate shift number
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count_response = supabase.table("pos_shifts").select("id", count="exact").eq("company_id", str(current_user.company_id)).execute()
    shift_num = f"SHIFT-{today}-{(count_response.count or 0) + 1:03d}"

    shift_dict = {
        "shift_number": shift_num,
        "company_id": str(current_user.company_id),
        "cashier_id": str(current_user.id),
        "cashier_name": current_user.full_name,
        "opening_cash": float(shift_data.opening_cash),
        "expected_cash": float(shift_data.opening_cash),
        "actual_cash": float(shift_data.opening_cash),
        "difference": 0,
        "total_sales": 0,
        "total_amount": 0,
        "status": "open",
        "opened_at": datetime.now(timezone.utc).isoformat(),
        "notes": shift_data.notes,
    }

    response = supabase.table("pos_shifts").insert(shift_dict).execute()
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to open shift")

    return ShiftSummary(**response.data[0])


@router.post("/shift/{shift_id}/close", response_model=ShiftSummary)
async def close_pos_shift(
    shift_id: UUID,
    close_data: ShiftClose,
    current_user: User = Depends(get_current_user)
):
    """Close POS shift with cash count"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    shift_response = supabase.table("pos_shifts").select("*").eq("id", str(shift_id)).eq("company_id", str(current_user.company_id)).execute()
    if not shift_response.data or len(shift_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    shift = shift_response.data[0]
    if shift["status"] == "closed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shift is already closed")

    difference = close_data.closing_cash - Decimal(str(shift["expected_cash"]))

    update_data = {
        "actual_cash": float(close_data.closing_cash),
        "difference": float(difference),
        "status": "closed",
        "closed_at": datetime.now(timezone.utc).isoformat(),
        "notes": close_data.notes,
    }

    response = supabase.table("pos_shifts").update(update_data).eq("id", str(shift_id)).execute()
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to close shift")

    return ShiftSummary(**response.data[0])


@router.get("/shifts", response_model=List[ShiftSummary])
async def list_pos_shifts(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    current_user: User = Depends(get_current_user)
):
    """List POS shifts with optional date filter"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    query = supabase.table("pos_shifts").select("*").eq("company_id", str(current_user.company_id))
    
    if from_date:
        query = query.gte("opened_at", from_date.isoformat())
    if to_date:
        query = query.lte("opened_at", to_date.isoformat())

    response = query.order("opened_at", desc=True).execute()
    return [ShiftSummary(**shift) for shift in response.data or []]


# ============ Hold/Resume Transactions ============

class HeldTransaction(BaseModel):
    id: UUID
    hold_number: str
    items: List[dict]
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    held_at: datetime
    held_by: UUID


@router.post("/hold", response_model=dict)
async def hold_pos_transaction(
    transaction_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Hold a POS transaction for later completion"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Generate hold number
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count_response = supabase.table("pos_held_transactions").select("id", count="exact").eq("company_id", str(current_user.company_id)).eq("hold_date", today).execute()
    hold_num = f"HOLD-{today}-{(count_response.count or 0) + 1:03d}"

    held_txn = {
        "hold_number": hold_num,
        "company_id": str(current_user.company_id),
        "held_by": str(current_user.id),
        "items": transaction_data.get("items", []),
        "customer_id": str(transaction_data.get("customer_id")) if transaction_data.get("customer_id") else None,
        "customer_name": transaction_data.get("customer_name"),
        "discount": float(transaction_data.get("discount", 0)),
        "notes": transaction_data.get("notes"),
        "hold_date": today,
        "status": "held",
    }

    response = supabase.table("pos_held_transactions").insert(held_txn).execute()
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to hold transaction")

    return {"success": True, "hold_number": hold_num, "id": response.data[0]["id"]}


@router.get("/held", response_model=List[dict])
async def list_held_transactions(
    current_user: User = Depends(get_current_user)
):
    """List all held transactions for today"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    response = supabase.table("pos_held_transactions").select("*").eq("company_id", str(current_user.company_id)).eq("hold_date", today).eq("status", "held").order("held_at", desc=True).execute()
    
    return response.data or []


@router.post("/held/{hold_id}/resume", response_model=dict)
async def resume_held_transaction(
    hold_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Resume a held transaction"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    response = supabase.table("pos_held_transactions").select("*").eq("id", str(hold_id)).eq("company_id", str(current_user.company_id)).execute()
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Held transaction not found")

    held_txn = response.data[0]
    if held_txn["status"] != "held":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transaction is not on hold")

    # Mark as resumed (will be deleted when sale is completed)
    supabase.table("pos_held_transactions").update({
        "status": "resumed",
        "resumed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(hold_id)).execute()

    return {
        "success": True,
        "items": held_txn["items"],
        "customer_id": held_txn["customer_id"],
        "customer_name": held_txn["customer_name"],
        "discount": held_txn["discount"],
        "notes": held_txn["notes"],
    }


@router.delete("/held/{hold_id}")
async def delete_held_transaction(
    hold_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Delete a held transaction"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    response = supabase.table("pos_held_transactions").select("*").eq("id", str(hold_id)).eq("company_id", str(current_user.company_id)).execute()
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Held transaction not found")

    supabase.table("pos_held_transactions").delete().eq("id", str(hold_id)).execute()
    return {"success": True, "message": "Held transaction deleted"}


# ============ POS Reports ============

@router.get("/reports/daily-summary")
async def get_pos_daily_summary(
    report_date: Optional[date] = None,
    current_user: User = Depends(get_current_user)
):
    """Get daily POS sales summary"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    if not report_date:
        report_date = datetime.now(timezone.utc).date()

    # Get all POS sales for the date
    invoices = supabase.table("invoices").select("*").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).eq("status", "confirmed").gte("created_at", report_date.isoformat()).execute()

    total_sales = 0
    total_amount = Decimal("0")
    payment_summary = {}

    for inv in (invoices.data or []):
        total_sales += 1
        total_amount += Decimal(str(inv["total"]))
        method = inv.get("payment_method", "cash")
        if method not in payment_summary:
            payment_summary[method] = {"count": 0, "amount": 0}
        payment_summary[method]["count"] += 1
        payment_summary[method]["amount"] += float(inv["total"])

    return {
        "date": report_date.isoformat(),
        "total_sales": total_sales,
        "total_amount": float(total_amount),
        "payment_methods": payment_summary,
    }


@router.get("/reports/cashier-summary")
async def get_pos_cashier_summary(
    report_date: Optional[date] = None,
    current_user: User = Depends(get_current_user)
):
    """Get cashier-wise POS sales summary"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    if not report_date:
        report_date = datetime.now(timezone.utc).date()

    # Get shifts for the date
    shifts = supabase.table("pos_shifts").select("*").eq("company_id", str(current_user.company_id)).gte("opened_at", report_date.isoformat()).execute()

    cashier_summary = {}
    for shift in (shifts.data or []):
        cashier = shift["cashier_name"]
        if cashier not in cashier_summary:
            cashier_summary[cashier] = {
                "cashier_id": shift["cashier_id"],
                "shifts": 0,
                "total_sales": 0,
                "opening_cash": 0,
                "expected_cash": 0,
                "actual_cash": 0,
                "difference": 0,
            }
        cashier_summary[cashier]["shifts"] += 1
        cashier_summary[cashier]["total_sales"] += shift["total_sales"]
        cashier_summary[cashier]["opening_cash"] += shift["opening_cash"]
        cashier_summary[cashier]["expected_cash"] += shift["expected_cash"]
        cashier_summary[cashier]["actual_cash"] += shift["actual_cash"]
        cashier_summary[cashier]["difference"] += shift["difference"]

    return {
        "date": report_date.isoformat(),
        "cashiers": list(cashier_summary.values()),
    }


@router.post("/sale", response_model=POSSaleResponse)
async def process_pos_sale(
    sale_data: POSSaleRequest,
    current_user: User = Depends(get_current_user)
):
    """Process a quick POS sale - creates confirmed invoice instantly"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Validate items and get product details
    items_data = []
    for item in sale_data.items:
        product_response = supabase.table("products").select("*").eq("id", str(item.product_id)).eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
        if not product_response.data or len(product_response.data) == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found")

        product = product_response.data[0]

        # Check stock
        if product.get("track_inventory", True):
            stock_response = supabase.table("inventory").select("quantity").eq("product_id", str(item.product_id)).eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
            current_stock = sum(item.get("quantity", 0) for item in stock_response.data or [])
            if current_stock < item.quantity:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Insufficient stock for {product['name']}")

        rate = item.rate if item.rate else Decimal(str(product["sale_price"]))
        items_data.append({
            "product": product,
            "quantity": item.quantity,
            "rate": rate,
            "tax_rate": item.tax_rate,
        })

    # Calculate totals
    subtotal = Decimal("0")
    tax_total = Decimal("0")

    for item in items_data:
        line_total = item["rate"] * item["quantity"]
        line_tax = line_total * (item["tax_rate"] / Decimal("100"))
        subtotal += line_total
        tax_total += line_tax

    total = subtotal + tax_total - sale_data.discount

    # Generate invoice number
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count_response = supabase.table("invoices").select("invoice_number", count="exact").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
    next_num = (count_response.count or 0) + 1
    invoice_number = f"INV-{today}-{next_num:04d}"

    # Create invoice (confirmed immediately)
    invoice_dict = {
        "invoice_number": invoice_number,
        "customer_id": str(sale_data.customer_id) if sale_data.customer_id else None,
        "date": datetime.now(timezone.utc).isoformat(),
        "due_date": datetime.now(timezone.utc).isoformat(),
        "subtotal": float(subtotal),
        "tax_total": float(tax_total),
        "discount": float(sale_data.discount),
        "total": float(total),
        "amount_paid": float(total),  # Fully paid in POS
        "balance_due": 0,
        "status": "confirmed",
        "notes": sale_data.notes,
        "company_id": str(current_user.company_id),
        "payment_method": sale_data.payment_method,
    }

    invoice_response = supabase.table("invoices").insert(invoice_dict).execute()
    if not invoice_response.data or len(invoice_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create invoice")

    invoice_id = invoice_response.data[0]["id"]

    # Create invoice items
    for item in items_data:
        line_total = item["rate"] * item["quantity"]
        item_dict = {
            "invoice_id": str(invoice_id),
            "product_id": str(item["product"]["id"]),
            "description": item["product"]["name"],
            "quantity": item["quantity"],
            "rate": float(item["rate"]),
            "tax_rate": float(item["tax_rate"]),
            "amount": float(line_total),
        }
        supabase.table("invoice_items").insert(item_dict).execute()

        # Update inventory
        if item["product"].get("track_inventory", True):
            # Reduce stock
            supabase.table("inventory").update({
                "quantity": supabase.table("inventory").select("quantity").eq("product_id", str(item["product"]["id"])).eq("company_id", str(current_user.company_id)).execute().data[0]["quantity"] - item["quantity"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("product_id", str(item["product"]["id"])).eq("company_id", str(current_user.company_id)).execute()

    # Create journal entry
    try:
        # Find accounts
        cash_account = supabase.table("accounts").select("id").eq("code", "1110").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
        sales_account = supabase.table("accounts").select("id").eq("code", "4000").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()

        if cash_account.data and sales_account.data:
            journal_data = {
                "company_id": str(current_user.company_id),
                "date": datetime.now(timezone.utc).isoformat(),
                "reference_type": "invoice",
                "reference_id": str(invoice_id),
                "description": f"POS Sale {invoice_number}",
                "is_system_generated": True,
            }
            journal_response = supabase.table("journals").insert(journal_data).execute()

            if journal_response.data:
                journal_id = journal_response.data[0]["id"]

                # Debit Cash
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": cash_account.data[0]["id"],
                    "debit": float(total),
                    "credit": 0,
                    "description": f"Cash sale {invoice_number}",
                }).execute()

                # Credit Sales
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": sales_account.data[0]["id"],
                    "debit": 0,
                    "credit": float(total),
                    "description": f"Sales revenue {invoice_number}",
                }).execute()
    except Exception as e:
        logger.error(f"Failed to create journal entry for POS sale: {e}")

    # Build receipt data
    receipt_items = [
        ReceiptItem(
            product_name=item["product"]["name"],
            product_code=item["product"]["code"],
            quantity=item["quantity"],
            rate=item["rate"],
            tax_rate=item["tax_rate"],
            amount=item["rate"] * item["quantity"],
        )
        for item in items_data
    ]

    # Get customer name if provided
    customer_name = None
    if sale_data.customer_id:
        customer_response = supabase.table("customers").select("name").eq("id", str(sale_data.customer_id)).execute()
        if customer_response.data:
            customer_name = customer_response.data[0]["name"]

    receipt = ReceiptData(
        invoice_number=invoice_number,
        date=datetime.now(timezone.utc),
        customer_name=customer_name,
        items=receipt_items,
        subtotal=subtotal,
        tax_total=tax_total,
        discount=sale_data.discount,
        total=total,
        payment_method=sale_data.payment_method,
        notes=sale_data.notes,
    )

    return POSSaleResponse(
        success=True,
        message="Sale processed successfully",
        invoice_id=invoice_id,
        invoice_number=invoice_number,
        total=total,
        receipt=receipt,
    )


@router.get("/receipt/{invoice_id}", response_model=ReceiptData)
async def get_receipt(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get receipt data for printing"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Get invoice
    invoice_response = supabase.table("invoices").select("*").eq("id", str(invoice_id)).eq("company_id", str(current_user.company_id)).execute()
    if not invoice_response.data or len(invoice_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    invoice = invoice_response.data[0]

    # Get items
    items_response = supabase.table("invoice_items").select("*, products(name, code)").eq("invoice_id", str(invoice_id)).execute()

    receipt_items = [
        ReceiptItem(
            product_name=item["products"]["name"] if item["products"] else "Unknown",
            product_code=item["products"]["code"] if item["products"] else "",
            quantity=item["quantity"],
            rate=Decimal(str(item["rate"])),
            tax_rate=Decimal(str(item["tax_rate"])),
            amount=Decimal(str(item["amount"])),
        )
        for item in items_response.data or []
    ]

    # Get customer name
    customer_name = None
    if invoice.get("customer_id"):
        customer_response = supabase.table("customers").select("name").eq("id", invoice["customer_id"]).execute()
        if customer_response.data:
            customer_name = customer_response.data[0]["name"]

    return ReceiptData(
        invoice_number=invoice["invoice_number"],
        date=invoice["date"],
        customer_name=customer_name,
        items=receipt_items,
        subtotal=Decimal(str(invoice["subtotal"])),
        tax_total=Decimal(str(invoice["tax_total"])),
        discount=Decimal(str(invoice.get("discount", 0))),
        total=Decimal(str(invoice["total"])),
        payment_method=invoice.get("payment_method", "cash"),
        notes=invoice.get("notes"),
    )
