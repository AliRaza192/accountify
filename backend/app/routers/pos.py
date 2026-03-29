from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
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
    today = datetime.utcnow().strftime("%Y%m%d")
    count_response = supabase.table("invoices").select("invoice_number", count="exact").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
    next_num = (count_response.count or 0) + 1
    invoice_number = f"INV-{today}-{next_num:04d}"

    # Create invoice (confirmed immediately)
    invoice_dict = {
        "invoice_number": invoice_number,
        "customer_id": str(sale_data.customer_id) if sale_data.customer_id else None,
        "date": datetime.utcnow().isoformat(),
        "due_date": datetime.utcnow().isoformat(),
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
                "updated_at": datetime.utcnow().isoformat()
            }).eq("product_id", str(item["product"]["id"])).eq("company_id", str(current_user.company_id)).execute()

    # Create journal entry
    try:
        # Find accounts
        cash_account = supabase.table("accounts").select("id").eq("code", "1110").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
        sales_account = supabase.table("accounts").select("id").eq("code", "4000").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()

        if cash_account.data and sales_account.data:
            journal_data = {
                "company_id": str(current_user.company_id),
                "date": datetime.utcnow().isoformat(),
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
        date=datetime.utcnow(),
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
