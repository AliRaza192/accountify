from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal
from supabase import create_client, Client
import logging

from app.config import settings
from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user, get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)


class InvoiceItemCreate(BaseModel):
    product_id: UUID
    description: Optional[str] = None
    quantity: int = 1
    rate: Decimal
    tax_rate: Decimal = Decimal("0")


class InvoiceItemUpdate(BaseModel):
    product_id: Optional[UUID] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    rate: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None


class InvoiceCreate(BaseModel):
    customer_id: UUID
    date: datetime
    due_date: datetime
    items: List[InvoiceItemCreate]
    notes: Optional[str] = None
    discount: Decimal = Decimal("0")


class InvoiceUpdate(BaseModel):
    customer_id: Optional[UUID] = None
    date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    items: Optional[List[InvoiceItemCreate]] = None
    notes: Optional[str] = None
    discount: Optional[Decimal] = None


class PaymentRequest(BaseModel):
    amount: Decimal
    date: datetime
    method: str = "cash"
    reference: Optional[str] = None


class InvoiceItemResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    product_id: UUID
    product_name: str
    product_code: Optional[str]
    description: Optional[str]
    quantity: int
    rate: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    amount: Decimal


class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    customer_id: UUID
    customer_name: str
    customer_email: Optional[str]
    customer_phone: Optional[str]
    date: datetime
    due_date: datetime
    subtotal: Decimal
    tax_total: Decimal
    discount: Decimal
    total: Decimal
    amount_paid: Decimal
    balance_due: Decimal
    status: str
    notes: Optional[str]
    company_id: UUID
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    items: Optional[List[InvoiceItemResponse]] = None


class InvoiceDetailResponse(BaseModel):
    success: bool
    data: InvoiceResponse
    message: str


class InvoicesListResponse(BaseModel):
    success: bool
    data: List[InvoiceResponse]
    total: int
    message: str


class PaymentResponse(BaseModel):
    success: bool
    message: str
    balance_due: Decimal
    payment_id: UUID


def get_next_invoice_number(supabase: Client, company_id: str) -> str:
    """Generate next invoice number in format INV-YYYYMMDD-0001"""
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"INV-{today}-"
    
    # Count invoices for today
    count_response = supabase.table("invoices").select("invoice_number", count="exact").eq("company_id", company_id).eq("is_deleted", False).execute()
    next_num = (count_response.count or 0) + 1
    
    return f"{prefix}{next_num:04d}"


def calculate_invoice_totals(items: List[InvoiceItemCreate], discount: Decimal = Decimal("0")):
    """Calculate invoice totals from items"""
    subtotal = Decimal("0")
    tax_total = Decimal("0")
    
    for item in items:
        line_total = item.rate * item.quantity
        tax_amount = line_total * (item.tax_rate / Decimal("100"))
        subtotal += line_total
        tax_total += tax_amount
    
    total = subtotal + tax_total - discount
    return subtotal, tax_total, total


@router.get("/", response_model=InvoicesListResponse)
async def list_invoices(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    customer_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List all invoices with optional filters"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Build query with customer join
    query = supabase.table("invoices").select("""
        *,
        customers!inner(name, email, phone)
    """, count="exact").eq("company_id", current_user.company_id).eq("is_deleted", False)

    if start_date:
        query = query.gte("date", start_date.isoformat())
    if end_date:
        query = query.lte("date", end_date.isoformat())
    if customer_id:
        query = query.eq("customer_id", str(customer_id))
    if status_filter:
        query = query.eq("status", status_filter)

    response = query.order("date", desc=True).order("created_at", desc=True).execute()

    invoices = []
    for inv in response.data:
        # Get invoice items
        items_response = supabase.table("invoice_items").select("*, products(name, code)").eq("invoice_id", inv["id"]).execute()
        items = []
        for item in items_response.data or []:
            tax_amount = (item["rate"] * item["quantity"]) * (item["tax_rate"] / Decimal("100"))
            items.append(InvoiceItemResponse(
                id=item["id"],
                invoice_id=item["invoice_id"],
                product_id=item["product_id"],
                product_name=item["products"]["name"] if item["products"] else "Unknown",
                product_code=item["products"]["code"] if item["products"] else None,
                description=item.get("description"),
                quantity=item["quantity"],
                rate=Decimal(str(item["rate"])),
                tax_rate=Decimal(str(item["tax_rate"])),
                tax_amount=tax_amount,
                amount=Decimal(str(item["amount"]))
            ))

        invoices.append(InvoiceResponse(
            id=inv["id"],
            invoice_number=inv["invoice_number"],
            customer_id=inv["customer_id"],
            customer_name=inv["customers"]["name"] if inv["customers"] else "Unknown",
            customer_email=inv["customers"]["email"] if inv["customers"] else None,
            customer_phone=inv["customers"]["phone"] if inv["customers"] else None,
            date=inv["date"],
            due_date=inv["due_date"],
            subtotal=Decimal(str(inv["subtotal"])),
            tax_total=Decimal(str(inv["tax_total"])),
            discount=Decimal(str(inv.get("discount", 0))),
            total=Decimal(str(inv["total"])),
            amount_paid=Decimal(str(inv["amount_paid"])),
            balance_due=Decimal(str(inv["balance_due"])),
            status=inv["status"],
            notes=inv.get("notes"),
            company_id=inv["company_id"],
            created_at=inv["created_at"],
            updated_at=inv["updated_at"],
            is_deleted=inv["is_deleted"],
            items=items
        ))

    return InvoicesListResponse(
        success=True,
        data=invoices,
        total=response.count or 0,
        message="Invoices retrieved successfully"
    )


@router.post("/", response_model=InvoiceDetailResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new invoice"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Validate customer exists
    customer_response = supabase.table("customers").select("*").eq("id", str(invoice_data.customer_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not customer_response.data or len(customer_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    # Validate products exist
    for item in invoice_data.items:
        product_check = supabase.table("products").select("id").eq("id", str(item.product_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
        if not product_check.data or len(product_check.data) == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found")

    # Generate invoice number
    invoice_number = get_next_invoice_number(supabase, str(current_user.company_id))

    # Calculate totals
    subtotal, tax_total, total = calculate_invoice_totals(invoice_data.items, invoice_data.discount)

    # Create invoice
    invoice_dict = {
        "invoice_number": invoice_number,
        "customer_id": str(invoice_data.customer_id),
        "date": invoice_data.date.isoformat(),
        "due_date": invoice_data.due_date.isoformat(),
        "subtotal": float(subtotal),
        "tax_total": float(tax_total),
        "discount": float(invoice_data.discount),
        "total": float(total),
        "amount_paid": 0,
        "balance_due": float(total),
        "status": "draft",
        "notes": invoice_data.notes,
        "company_id": str(current_user.company_id),
    }

    response = supabase.table("invoices").insert(invoice_dict).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create invoice")

    invoice_id = response.data[0]["id"]

    # Create invoice items
    for item in invoice_data.items:
        line_total = item.rate * item.quantity
        item_dict = {
            "invoice_id": str(invoice_id),
            "product_id": str(item.product_id),
            "description": item.description,
            "quantity": item.quantity,
            "rate": float(item.rate),
            "tax_rate": float(item.tax_rate),
            "amount": float(line_total),
        }
        supabase.table("invoice_items").insert(item_dict).execute()

    # Fetch complete invoice with items
    return get_invoice(invoice_id, current_user)


@router.get("/{invoice_id}", response_model=InvoiceDetailResponse)
async def get_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get single invoice details"""
    supabase = get_supabase_client()

    response = supabase.table("invoices").select("*").eq("id", str(invoice_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    invoice = response.data[0]

    # Get customer details
    customer_response = supabase.table("customers").select("name, email, phone").eq("id", invoice["customer_id"]).execute()
    customer = customer_response.data[0] if customer_response.data else None

    # Get invoice items
    items_response = supabase.table("invoice_items").select("*, products(name, code)").eq("invoice_id", str(invoice_id)).execute()
    items = []
    for item in items_response.data or []:
        tax_amount = (item["rate"] * item["quantity"]) * (item["tax_rate"] / Decimal("100"))
        items.append(InvoiceItemResponse(
            id=item["id"],
            invoice_id=item["invoice_id"],
            product_id=item["product_id"],
            product_name=item["products"]["name"] if item["products"] else "Unknown",
            product_code=item["products"]["code"] if item["products"] else None,
            description=item.get("description"),
            quantity=item["quantity"],
            rate=Decimal(str(item["rate"])),
            tax_rate=Decimal(str(item["tax_rate"])),
            tax_amount=tax_amount,
            amount=Decimal(str(item["amount"]))
        ))

    return InvoiceDetailResponse(
        success=True,
        data=InvoiceResponse(
            id=invoice["id"],
            invoice_number=invoice["invoice_number"],
            customer_id=invoice["customer_id"],
            customer_name=customer["name"] if customer else "Unknown",
            customer_email=customer["email"] if customer else None,
            customer_phone=customer["phone"] if customer else None,
            date=invoice["date"],
            due_date=invoice["due_date"],
            subtotal=Decimal(str(invoice["subtotal"])),
            tax_total=Decimal(str(invoice["tax_total"])),
            discount=Decimal(str(invoice.get("discount", 0))),
            total=Decimal(str(invoice["total"])),
            amount_paid=Decimal(str(invoice["amount_paid"])),
            balance_due=Decimal(str(invoice["balance_due"])),
            status=invoice["status"],
            notes=invoice.get("notes"),
            company_id=invoice["company_id"],
            created_at=invoice["created_at"],
            updated_at=invoice["updated_at"],
            is_deleted=invoice["is_deleted"],
            items=items
        ),
        message="Invoice retrieved successfully"
    )


@router.put("/{invoice_id}", response_model=InvoiceDetailResponse)
async def update_invoice(
    invoice_id: UUID,
    invoice_data: InvoiceUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update invoice (only if draft)"""
    supabase = get_supabase_client()

    # Check invoice exists and is draft
    existing = supabase.table("invoices").select("*").eq("id", str(invoice_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if existing.data[0]["status"] != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update invoice that is not in draft status")

    update_data = invoice_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # If items are being updated, recalculate totals
    if invoice_data.items is not None:
        # Delete existing items
        supabase.table("invoice_items").delete().eq("invoice_id", str(invoice_id)).execute()

        # Calculate new totals
        subtotal, tax_total, total = calculate_invoice_totals(
            invoice_data.items, 
            invoice_data.discount if invoice_data.discount is not None else Decimal(str(existing.data[0].get("discount", 0)))
        )

        # Insert new items
        for item in invoice_data.items:
            line_total = item.rate * item.quantity
            item_dict = {
                "invoice_id": str(invoice_id),
                "product_id": str(item.product_id),
                "description": item.description,
                "quantity": item.quantity,
                "rate": float(item.rate),
                "tax_rate": float(item.tax_rate),
                "amount": float(line_total),
            }
            supabase.table("invoice_items").insert(item_dict).execute()

        update_data["subtotal"] = float(subtotal)
        update_data["tax_total"] = float(tax_total)
        update_data["total"] = float(total)
        update_data["balance_due"] = float(total)  # Reset balance on item update

    if invoice_data.discount is not None and invoice_data.items is None:
        # Just update discount, recalculate total
        current_invoice = existing.data[0]
        subtotal = Decimal(str(current_invoice["subtotal"]))
        tax_total = Decimal(str(current_invoice["tax_total"]))
        total = subtotal + tax_total - invoice_data.discount
        update_data["discount"] = float(invoice_data.discount)
        update_data["total"] = float(total)
        update_data["balance_due"] = float(total)

    response = supabase.table("invoices").update(update_data).eq("id", str(invoice_id)).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update invoice")

    return get_invoice(invoice_id, current_user)


@router.post("/{invoice_id}/confirm", response_model=InvoiceDetailResponse)
async def confirm_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Confirm invoice - changes status from draft to confirmed"""
    supabase = get_supabase_client()

    existing = supabase.table("invoices").select("*").eq("id", str(invoice_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if existing.data[0]["status"] != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot confirm invoice with status '{existing.data[0]['status']}'")

    invoice = existing.data[0]
    
    # Update invoice status
    response = supabase.table("invoices").update({
        "status": "confirmed",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", str(invoice_id)).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to confirm invoice")

    # Create journal entry: Debit Accounts Receivable, Credit Sales Revenue
    try:
        # Find or create Accounts Receivable account (asset account)
        ar_account = supabase.table("accounts").select("id").eq("code", "1200").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
        if not ar_account.data or len(ar_account.data) == 0:
            # Create Accounts Receivable account
            ar_account_data = {
                "company_id": str(current_user.company_id),
                "code": "1200",
                "name": "Accounts Receivable",
                "account_type": "asset",
                "parent_account_id": None,
            }
            ar_response = supabase.table("accounts").insert(ar_account_data).execute()
            ar_account_id = ar_response.data[0]["id"] if ar_response.data else None
        else:
            ar_account_id = ar_account.data[0]["id"]

        # Find or create Sales Revenue account (revenue account)
        sales_account = supabase.table("accounts").select("id").eq("code", "4000").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
        if not sales_account.data or len(sales_account.data) == 0:
            # Create Sales Revenue account
            sales_account_data = {
                "company_id": str(current_user.company_id),
                "code": "4000",
                "name": "Sales Revenue",
                "account_type": "revenue",
                "parent_account_id": None,
            }
            sales_response = supabase.table("accounts").insert(sales_account_data).execute()
            sales_account_id = sales_response.data[0]["id"] if sales_response.data else None
        else:
            sales_account_id = sales_account.data[0]["id"]

        if ar_account_id and sales_account_id:
            # Create journal entry header
            journal_data = {
                "company_id": str(current_user.company_id),
                "date": invoice["date"],
                "reference_type": "invoice",
                "reference_id": str(invoice_id),
                "description": f"Invoice {invoice['invoice_number']} confirmed",
                "is_system_generated": True,
            }
            journal_response = supabase.table("journals").insert(journal_data).execute()
            
            if journal_response.data:
                journal_id = journal_response.data[0]["id"]
                
                # Debit Accounts Receivable
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": ar_account_id,
                    "debit": float(invoice["total"]),
                    "credit": 0,
                    "description": f"Accounts Receivable - {invoice['invoice_number']}",
                }).execute()
                
                # Credit Sales Revenue
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": sales_account_id,
                    "debit": 0,
                    "credit": float(invoice["total"]),
                    "description": f"Sales Revenue - {invoice['invoice_number']}",
                }).execute()
    except Exception as e:
        logger.error(f"Failed to create journal entry for invoice {invoice_id}: {e}")
        # Don't fail the confirm operation if journal entry fails

    return get_invoice(invoice_id, current_user)


@router.post("/{invoice_id}/payment", response_model=PaymentResponse)
async def record_payment(
    invoice_id: UUID,
    payment_data: PaymentRequest,
    current_user: User = Depends(get_current_user)
):
    """Record a payment against an invoice"""
    supabase = get_supabase_client()

    invoice_response = supabase.table("invoices").select("*").eq("id", str(invoice_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not invoice_response.data or len(invoice_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    invoice = invoice_response.data[0]
    
    if invoice["status"] == "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice is already fully paid")
    
    if invoice["status"] == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot record payment for cancelled invoice")

    current_balance = Decimal(str(invoice["balance_due"]))
    current_paid = Decimal(str(invoice["amount_paid"]))

    if payment_data.amount > current_balance:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Payment amount exceeds balance due ({current_balance})")

    if payment_data.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount must be positive")

    new_balance = current_balance - payment_data.amount
    new_paid = current_paid + payment_data.amount

    # Determine new status
    if new_balance == 0:
        new_status = "paid"
    else:
        new_status = "partial"

    # Update invoice
    supabase.table("invoices").update({
        "amount_paid": float(new_paid),
        "balance_due": float(new_balance),
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", str(invoice_id)).execute()

    # Create payment record
    payment_dict = {
        "invoice_id": str(invoice_id),
        "amount": float(payment_data.amount),
        "date": payment_data.date.isoformat(),
        "method": payment_data.method,
        "reference": payment_data.reference,
        "company_id": str(current_user.company_id),
        "created_by": str(current_user.id),
    }
    payment_response = supabase.table("payments").insert(payment_dict).execute()
    
    if not payment_response.data or len(payment_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to record payment")

    payment_id = payment_response.data[0]["id"]

    # Create journal entry for payment
    try:
        # Find Cash/Bank account based on payment method
        if payment_data.method == "cash":
            account_code = "1110"  # Cash
            account_name = "Cash"
        else:
            account_code = "1120"  # Bank
            account_name = "Bank"
        
        cash_account = supabase.table("accounts").select("id").eq("code", account_code).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
        if not cash_account.data or len(cash_account.data) == 0:
            # Create account
            account_data = {
                "company_id": str(current_user.company_id),
                "code": account_code,
                "name": account_name,
                "account_type": "asset",
            }
            account_response = supabase.table("accounts").insert(account_data).execute()
            cash_account_id = account_response.data[0]["id"] if account_response.data else None
        else:
            cash_account_id = cash_account.data[0]["id"]

        # Get AR account
        ar_account = supabase.table("accounts").select("id").eq("code", "1200").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
        ar_account_id = ar_account.data[0]["id"] if ar_account.data else None

        if cash_account_id and ar_account_id:
            # Create journal entry
            journal_data = {
                "company_id": str(current_user.company_id),
                "date": payment_data.date.isoformat(),
                "reference_type": "payment",
                "reference_id": str(payment_id),
                "description": f"Payment received for invoice {invoice['invoice_number']}",
                "is_system_generated": True,
            }
            journal_response = supabase.table("journals").insert(journal_data).execute()
            
            if journal_response.data:
                journal_id = journal_response.data[0]["id"]
                
                # Debit Cash/Bank
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": cash_account_id,
                    "debit": float(payment_data.amount),
                    "credit": 0,
                    "description": f"{account_name} - Payment received",
                }).execute()
                
                # Credit Accounts Receivable
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": ar_account_id,
                    "debit": 0,
                    "credit": float(payment_data.amount),
                    "description": f"Accounts Receivable - Payment applied",
                }).execute()
    except Exception as e:
        logger.error(f"Failed to create journal entry for payment {payment_id}: {e}")

    return PaymentResponse(
        success=True,
        message="Payment recorded successfully",
        balance_due=new_balance,
        payment_id=payment_id
    )


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Soft delete invoice (only if draft)"""
    supabase = get_supabase_client()

    existing = supabase.table("invoices").select("*").eq("id", str(invoice_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if existing.data[0]["status"] != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only delete draft invoices")

    response = supabase.table("invoices").update({
        "is_deleted": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", str(invoice_id)).execute()

    return {"success": True, "message": "Invoice deleted successfully"}


@router.get("/{invoice_id}/pdf")
async def generate_invoice_pdf(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Generate PDF for invoice (placeholder)"""
    supabase = get_supabase_client()
    
    invoice_response = supabase.table("invoices").select("*").eq("id", str(invoice_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not invoice_response.data or len(invoice_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    
    # TODO: Implement actual PDF generation
    return {
        "success": True,
        "message": "PDF generation endpoint - implementation pending",
        "invoice_id": str(invoice_id),
        "invoice_number": invoice_response.data[0]["invoice_number"]
    }
