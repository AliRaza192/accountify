from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from supabase import create_client, Client
import logging

from app.config import settings
from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user, get_supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)


class BillItemCreate(BaseModel):
    product_id: UUID
    description: Optional[str] = None
    quantity: int = 1
    rate: Decimal
    tax_rate: Decimal = Decimal("0")


class BillItemUpdate(BaseModel):
    product_id: Optional[UUID] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    rate: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None


class BillCreate(BaseModel):
    vendor_id: UUID
    date: datetime
    due_date: datetime
    items: List[BillItemCreate]
    notes: Optional[str] = None
    discount: Decimal = Decimal("0")


class BillUpdate(BaseModel):
    vendor_id: Optional[UUID] = None
    date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    items: Optional[List[BillItemCreate]] = None
    notes: Optional[str] = None
    discount: Optional[Decimal] = None


class PaymentRequest(BaseModel):
    amount: Decimal
    date: datetime
    method: str = "cash"
    reference: Optional[str] = None


class BillItemResponse(BaseModel):
    id: UUID
    bill_id: UUID
    product_id: UUID
    product_name: str
    product_code: Optional[str]
    description: Optional[str]
    quantity: int
    rate: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    amount: Decimal


class BillResponse(BaseModel):
    id: UUID
    bill_number: str
    vendor_id: UUID
    vendor_name: str
    vendor_email: Optional[str]
    vendor_phone: Optional[str]
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
    items: Optional[List[BillItemResponse]] = None


class BillDetailResponse(BaseModel):
    success: bool
    data: BillResponse
    message: str


class BillsListResponse(BaseModel):
    success: bool
    data: List[BillResponse]
    total: int
    message: str


class PaymentResponse(BaseModel):
    success: bool
    message: str
    balance_due: Decimal
    payment_id: UUID


def get_next_bill_number(supabase: Client, company_id: str) -> str:
    """Generate next bill number in format BILL-YYYYMMDD-0001"""
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"BILL-{today}-"
    
    count_response = supabase.table("bills").select("bill_number", count="exact").eq("company_id", company_id).eq("is_deleted", False).execute()
    next_num = (count_response.count or 0) + 1
    
    return f"{prefix}{next_num:04d}"


def calculate_bill_totals(items: List[BillItemCreate], discount: Decimal = Decimal("0")):
    """Calculate bill totals from items"""
    subtotal = Decimal("0")
    tax_total = Decimal("0")
    
    for item in items:
        line_total = item.rate * item.quantity
        tax_amount = line_total * (item.tax_rate / Decimal("100"))
        subtotal += line_total
        tax_total += tax_amount
    
    total = subtotal + tax_total - discount
    return subtotal, tax_total, total


@router.get("/", response_model=BillsListResponse)
async def list_bills(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    vendor_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """List all bills with optional filters"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Build query with vendor join
    query = supabase.table("bills").select("""
        *,
        vendors!inner(name, email, phone)
    """, count="exact").eq("company_id", current_user.company_id).eq("is_deleted", False)

    if start_date:
        query = query.gte("date", start_date.isoformat())
    if end_date:
        query = query.lte("date", end_date.isoformat())
    if vendor_id:
        query = query.eq("vendor_id", str(vendor_id))
    if status_filter:
        query = query.eq("status", status_filter)

    response = query.order("date", desc=True).order("created_at", desc=True).execute()

    bills = []
    for bill in response.data:
        # Get bill items
        items_response = supabase.table("bill_items").select("*, products(name, code)").eq("bill_id", bill["id"]).execute()
        items = []
        for item in items_response.data or []:
            tax_amount = (item["rate"] * item["quantity"]) * (item["tax_rate"] / Decimal("100"))
            items.append(BillItemResponse(
                id=item["id"],
                bill_id=item["bill_id"],
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

        bills.append(BillResponse(
            id=bill["id"],
            bill_number=bill["bill_number"],
            vendor_id=bill["vendor_id"],
            vendor_name=bill["vendors"]["name"] if bill["vendors"] else "Unknown",
            vendor_email=bill["vendors"]["email"] if bill["vendors"] else None,
            vendor_phone=bill["vendors"]["phone"] if bill["vendors"] else None,
            date=bill["date"],
            due_date=bill["due_date"],
            subtotal=Decimal(str(bill["subtotal"])),
            tax_total=Decimal(str(bill["tax_total"])),
            discount=Decimal(str(bill.get("discount", 0))),
            total=Decimal(str(bill["total"])),
            amount_paid=Decimal(str(bill["amount_paid"])),
            balance_due=Decimal(str(bill["balance_due"])),
            status=bill["status"],
            notes=bill.get("notes"),
            company_id=bill["company_id"],
            created_at=bill["created_at"],
            updated_at=bill["updated_at"],
            is_deleted=bill["is_deleted"],
            items=items
        ))

    return BillsListResponse(
        success=True,
        data=bills,
        total=response.count or 0,
        message="Bills retrieved successfully"
    )


@router.post("/", response_model=BillDetailResponse)
async def create_bill(
    bill_data: BillCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new bill"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Validate vendor exists
    vendor_response = supabase.table("vendors").select("*").eq("id", str(bill_data.vendor_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not vendor_response.data or len(vendor_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    # Validate products exist
    for item in bill_data.items:
        product_check = supabase.table("products").select("id").eq("id", str(item.product_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
        if not product_check.data or len(product_check.data) == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {item.product_id} not found")

    # Generate bill number
    bill_number = get_next_bill_number(supabase, str(current_user.company_id))

    # Calculate totals
    subtotal, tax_total, total = calculate_bill_totals(bill_data.items, bill_data.discount)

    # Create bill
    bill_dict = {
        "bill_number": bill_number,
        "vendor_id": str(bill_data.vendor_id),
        "date": bill_data.date.isoformat(),
        "due_date": bill_data.due_date.isoformat(),
        "subtotal": float(subtotal),
        "tax_total": float(tax_total),
        "discount": float(bill_data.discount),
        "total": float(total),
        "amount_paid": 0,
        "balance_due": float(total),
        "status": "draft",
        "notes": bill_data.notes,
        "company_id": str(current_user.company_id),
    }

    response = supabase.table("bills").insert(bill_dict).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create bill")

    bill_id = response.data[0]["id"]

    # Create bill items
    for item in bill_data.items:
        line_total = item.rate * item.quantity
        item_dict = {
            "bill_id": str(bill_id),
            "product_id": str(item.product_id),
            "description": item.description,
            "quantity": item.quantity,
            "rate": float(item.rate),
            "tax_rate": float(item.tax_rate),
            "amount": float(line_total),
        }
        supabase.table("bill_items").insert(item_dict).execute()

    # Fetch complete bill with items
    return get_bill(bill_id, current_user)


@router.get("/{bill_id}", response_model=BillDetailResponse)
async def get_bill(
    bill_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get single bill details"""
    supabase = get_supabase_client()

    response = supabase.table("bills").select("*").eq("id", str(bill_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    bill = response.data[0]

    # Get vendor details
    vendor_response = supabase.table("vendors").select("name, email, phone").eq("id", bill["vendor_id"]).execute()
    vendor = vendor_response.data[0] if vendor_response.data else None

    # Get bill items
    items_response = supabase.table("bill_items").select("*, products(name, code)").eq("bill_id", str(bill_id)).execute()
    items = []
    for item in items_response.data or []:
        tax_amount = (item["rate"] * item["quantity"]) * (item["tax_rate"] / Decimal("100"))
        items.append(BillItemResponse(
            id=item["id"],
            bill_id=item["bill_id"],
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

    return BillDetailResponse(
        success=True,
        data=BillResponse(
            id=bill["id"],
            bill_number=bill["bill_number"],
            vendor_id=bill["vendor_id"],
            vendor_name=vendor["name"] if vendor else "Unknown",
            vendor_email=vendor["email"] if vendor else None,
            vendor_phone=vendor["phone"] if vendor else None,
            date=bill["date"],
            due_date=bill["due_date"],
            subtotal=Decimal(str(bill["subtotal"])),
            tax_total=Decimal(str(bill["tax_total"])),
            discount=Decimal(str(bill.get("discount", 0))),
            total=Decimal(str(bill["total"])),
            amount_paid=Decimal(str(bill["amount_paid"])),
            balance_due=Decimal(str(bill["balance_due"])),
            status=bill["status"],
            notes=bill.get("notes"),
            company_id=bill["company_id"],
            created_at=bill["created_at"],
            updated_at=bill["updated_at"],
            is_deleted=bill["is_deleted"],
            items=items
        ),
        message="Bill retrieved successfully"
    )


@router.put("/{bill_id}", response_model=BillDetailResponse)
async def update_bill(
    bill_id: UUID,
    bill_data: BillUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update bill (only if draft)"""
    supabase = get_supabase_client()

    # Check bill exists and is draft
    existing = supabase.table("bills").select("*").eq("id", str(bill_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    if existing.data[0]["status"] != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update bill that is not in draft status")

    update_data = bill_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()

    # If items are being updated, recalculate totals
    if bill_data.items is not None:
        # Delete existing items
        supabase.table("bill_items").delete().eq("bill_id", str(bill_id)).execute()

        # Calculate new totals
        subtotal, tax_total, total = calculate_bill_totals(
            bill_data.items, 
            bill_data.discount if bill_data.discount is not None else Decimal(str(existing.data[0].get("discount", 0)))
        )

        # Insert new items
        for item in bill_data.items:
            line_total = item.rate * item.quantity
            item_dict = {
                "bill_id": str(bill_id),
                "product_id": str(item.product_id),
                "description": item.description,
                "quantity": item.quantity,
                "rate": float(item.rate),
                "tax_rate": float(item.tax_rate),
                "amount": float(line_total),
            }
            supabase.table("bill_items").insert(item_dict).execute()

        update_data["subtotal"] = float(subtotal)
        update_data["tax_total"] = float(tax_total)
        update_data["total"] = float(total)
        update_data["balance_due"] = float(total)

    if bill_data.discount is not None and bill_data.items is None:
        # Just update discount, recalculate total
        current_bill = existing.data[0]
        subtotal = Decimal(str(current_bill["subtotal"]))
        tax_total = Decimal(str(current_bill["tax_total"]))
        total = subtotal + tax_total - bill_data.discount
        update_data["discount"] = float(bill_data.discount)
        update_data["total"] = float(total)
        update_data["balance_due"] = float(total)

    response = supabase.table("bills").update(update_data).eq("id", str(bill_id)).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update bill")

    return get_bill(bill_id, current_user)


@router.post("/{bill_id}/confirm", response_model=BillDetailResponse)
async def confirm_bill(
    bill_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Confirm bill - changes status from draft to confirmed"""
    supabase = get_supabase_client()

    existing = supabase.table("bills").select("*").eq("id", str(bill_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    if existing.data[0]["status"] != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot confirm bill with status '{existing.data[0]['status']}'")

    bill = existing.data[0]
    
    # Update bill status
    response = supabase.table("bills").update({
        "status": "confirmed",
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(bill_id)).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to confirm bill")

    # Create journal entry: Debit Purchases, Credit Accounts Payable
    try:
        # Find or create Purchases account (expense account)
        purchases_account = supabase.table("accounts").select("id").eq("code", "5000").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
        if not purchases_account.data or len(purchases_account.data) == 0:
            purchases_account_data = {
                "company_id": str(current_user.company_id),
                "code": "5000",
                "name": "Purchases",
                "account_type": "expense",
                "parent_account_id": None,
            }
            purchases_response = supabase.table("accounts").insert(purchases_account_data).execute()
            purchases_account_id = purchases_response.data[0]["id"] if purchases_response.data else None
        else:
            purchases_account_id = purchases_account.data[0]["id"]

        # Find or create Accounts Payable account (liability account)
        ap_account = supabase.table("accounts").select("id").eq("code", "2100").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
        if not ap_account.data or len(ap_account.data) == 0:
            ap_account_data = {
                "company_id": str(current_user.company_id),
                "code": "2100",
                "name": "Accounts Payable",
                "account_type": "liability",
                "parent_account_id": None,
            }
            ap_response = supabase.table("accounts").insert(ap_account_data).execute()
            ap_account_id = ap_response.data[0]["id"] if ap_response.data else None
        else:
            ap_account_id = ap_account.data[0]["id"]

        if purchases_account_id and ap_account_id:
            # Create journal entry header
            journal_data = {
                "company_id": str(current_user.company_id),
                "date": bill["date"],
                "reference_type": "bill",
                "reference_id": str(bill_id),
                "description": f"Bill {bill['bill_number']} confirmed",
                "is_system_generated": True,
            }
            journal_response = supabase.table("journals").insert(journal_data).execute()
            
            if journal_response.data:
                journal_id = journal_response.data[0]["id"]
                
                # Debit Purchases
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": purchases_account_id,
                    "debit": float(bill["total"]),
                    "credit": 0,
                    "description": f"Purchases - {bill['bill_number']}",
                }).execute()
                
                # Credit Accounts Payable
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": ap_account_id,
                    "debit": 0,
                    "credit": float(bill["total"]),
                    "description": f"Accounts Payable - {bill['bill_number']}",
                }).execute()
    except Exception as e:
        logger.error(f"Failed to create journal entry for bill {bill_id}: {e}")

    return get_bill(bill_id, current_user)


@router.post("/{bill_id}/payment", response_model=PaymentResponse)
async def record_payment(
    bill_id: UUID,
    payment_data: PaymentRequest,
    current_user: User = Depends(get_current_user)
):
    """Record a payment against a bill"""
    supabase = get_supabase_client()

    bill_response = supabase.table("bills").select("*").eq("id", str(bill_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not bill_response.data or len(bill_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    bill = bill_response.data[0]
    
    if bill["status"] == "paid":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bill is already fully paid")
    
    if bill["status"] == "cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot record payment for cancelled bill")

    current_balance = Decimal(str(bill["balance_due"]))
    current_paid = Decimal(str(bill["amount_paid"]))

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

    # Update bill
    supabase.table("bills").update({
        "amount_paid": float(new_paid),
        "balance_due": float(new_balance),
        "status": new_status,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(bill_id)).execute()

    # Create payment record
    payment_dict = {
        "bill_id": str(bill_id),
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

        # Get AP account
        ap_account = supabase.table("accounts").select("id").eq("code", "2100").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
        ap_account_id = ap_account.data[0]["id"] if ap_account.data else None

        if cash_account_id and ap_account_id:
            journal_data = {
                "company_id": str(current_user.company_id),
                "date": payment_data.date.isoformat(),
                "reference_type": "payment",
                "reference_id": str(payment_id),
                "description": f"Payment made for bill {bill['bill_number']}",
                "is_system_generated": True,
            }
            journal_response = supabase.table("journals").insert(journal_data).execute()
            
            if journal_response.data:
                journal_id = journal_response.data[0]["id"]
                
                # Debit Accounts Payable
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": ap_account_id,
                    "debit": float(payment_data.amount),
                    "credit": 0,
                    "description": f"Accounts Payable - Payment made",
                }).execute()
                
                # Credit Cash/Bank
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": cash_account_id,
                    "debit": 0,
                    "credit": float(payment_data.amount),
                    "description": f"{account_name} - Payment made",
                }).execute()
    except Exception as e:
        logger.error(f"Failed to create journal entry for payment {payment_id}: {e}")

    return PaymentResponse(
        success=True,
        message="Payment recorded successfully",
        balance_due=new_balance,
        payment_id=payment_id
    )


@router.delete("/{bill_id}")
async def delete_bill(
    bill_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Soft delete bill (only if draft)"""
    supabase = get_supabase_client()

    existing = supabase.table("bills").select("*").eq("id", str(bill_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")

    if existing.data[0]["status"] != "draft":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only delete draft bills")

    response = supabase.table("bills").update({
        "is_deleted": True,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(bill_id)).execute()

    return {"success": True, "message": "Bill deleted successfully"}
