"""
Email Router - API endpoints for email operations

Endpoints:
- POST /api/email/send-invoice       Send invoice email to customer
- POST /api/email/send-reminder      Send payment reminder
- POST /api/email/send-salary-slip   Send salary slip with payslip attachment
- POST /api/email/send-statement     Send monthly account statement
- POST /api/email/send-bulk          Bulk email sending
- GET  /api/email/logs               View email delivery logs
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from supabase import create_client, Client
import logging

from app.config import settings
from app.types import User
from app.routers.auth import get_current_user
from app.services.email_service import (
    EmailService,
    AttachmentData,
    EmailResult,
    ReminderType,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ====================================================================
# Request / Response Schemas
# ====================================================================


class SendInvoiceRequest(BaseModel):
    invoice_id: str
    customer_email: EmailStr
    customer_name: str
    invoice_number: str
    invoice_date: str
    due_date: str
    subtotal: float = 0.0
    tax_total: float = 0.0
    discount: float = 0.0
    total: float = 0.0
    balance_due: float = 0.0
    items: Optional[List[Dict[str, Any]]] = None
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_ntn: Optional[str] = None
    notes: Optional[str] = None


class SendReminderRequest(BaseModel):
    customer_email: EmailStr
    customer_name: str
    invoice_number: str
    invoice_date: str
    due_date: str
    balance_due: float
    reminder_type: str = "3_days_before"  # 3_days_before | on_due_date | overdue
    company_name: Optional[str] = None
    company_phone: Optional[str] = None
    company_address: Optional[str] = None


class SendSalarySlipRequest(BaseModel):
    employee_email: EmailStr
    employee_name: str
    employee_code: str
    month: str
    year: int
    gross_salary: float
    deductions: float = 0.0
    net_salary: float
    company_name: Optional[str] = None
    hr_phone: Optional[str] = None


class SendStatementRequest(BaseModel):
    customer_email: EmailStr
    customer_name: str
    period_start: str
    period_end: str
    opening_balance: float = 0.0
    total_debits: float = 0.0
    total_credits: float = 0.0
    closing_balance: float = 0.0
    transactions: Optional[List[Dict[str, Any]]] = None
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_ntn: Optional[str] = None


class BulkEmailRecipient(BaseModel):
    email: str
    reference_id: Optional[str] = None
    customer_name: Optional[str] = None
    invoice_number: Optional[str] = None
    due_date: Optional[str] = None
    balance_due: Optional[float] = None


class BulkEmailRequest(BaseModel):
    recipients: List[BulkEmailRecipient]
    subject_template: str = "Invoice {invoice_number} - Payment Reminder"
    html_template_name: str = "invoice_email.html"
    context_base: Dict[str, Any] = {}
    email_type: str = "invoice"


class EmailResponse(BaseModel):
    success: bool
    email_id: Optional[str] = None
    message: str = ""
    recipient_count: int = 0
    errors: List[str] = []


class BulkEmailResult(BaseModel):
    email_id: Optional[str]
    success: bool
    message: str


class BulkEmailResponse(BaseModel):
    results: List[BulkEmailResult]
    total_sent: int
    total_failed: int


class EmailLogEntry(BaseModel):
    id: str
    email_type: str
    recipient: str
    subject: str
    status: str
    reference_id: Optional[str] = None
    attachments_count: int = 0
    attempts: int = 1
    sent_at: Optional[str] = None
    created_at: str
    error_message: Optional[str] = None


class EmailLogsResponse(BaseModel):
    success: bool
    logs: List[EmailLogEntry]
    total: int
    message: str = ""


# ====================================================================
# Helpers
# ====================================================================


def _get_supabase_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _resolve_company_id(current_user: User) -> Optional[str]:
    """Resolve company_id from the current user."""
    if hasattr(current_user, "company_id") and current_user.company_id:
        return str(current_user.company_id)
    return None


def _map_reminder_type(raw: str) -> str:
    """Map raw string to a valid ReminderType enum value."""
    mapping = {
        "3_days_before": ReminderType.THREE_DAYS_BEFORE,
        "on_due_date": ReminderType.ON_DUE_DATE,
        "overdue": ReminderType.OVERDUE,
    }
    return mapping.get(raw, ReminderType.THREE_DAYS_BEFORE)


# ====================================================================
# Endpoints
# ====================================================================


@router.post("/send-invoice", response_model=EmailResponse)
async def send_invoice_email(
    req: SendInvoiceRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Send an invoice email to a customer.

    Requires the invoice details and customer email.
    Optionally accepts line items and company branding info.
    """
    company_id = _resolve_company_id(current_user)
    company_name = req.company_name or "Accountify"

    result = EmailService.send_invoice_email(
        to_email=req.customer_email,
        customer_name=req.customer_name,
        invoice_number=req.invoice_number,
        invoice_date=req.invoice_date,
        due_date=req.due_date,
        subtotal=req.subtotal,
        tax_total=req.tax_total,
        discount=req.discount,
        total=req.total,
        balance_due=req.balance_due,
        items=req.items,
        company_name=company_name,
        company_address=req.company_address or "",
        company_phone=req.company_phone or "",
        company_ntn=req.company_ntn or "",
        notes=req.notes,
        company_id=company_id,
        invoice_id=req.invoice_id,
    )

    if not result.success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=result.message)

    return EmailResponse(
        success=result.success,
        email_id=result.email_id,
        message=result.message,
        recipient_count=result.recipient_count,
    )


@router.post("/send-reminder", response_model=EmailResponse)
async def send_payment_reminder(
    req: SendReminderRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Send a payment reminder email.

    reminder_type: '3_days_before', 'on_due_date', or 'overdue'.
    """
    company_id = _resolve_company_id(current_user)
    company_name = req.company_name or "Accountify"
    reminder_type = _map_reminder_type(req.reminder_type)

    result = EmailService.send_payment_reminder(
        to_email=req.customer_email,
        customer_name=req.customer_name,
        invoice_number=req.invoice_number,
        invoice_date=req.invoice_date,
        due_date=req.due_date,
        balance_due=req.balance_due,
        reminder_type=reminder_type,
        company_name=company_name,
        company_phone=req.company_phone or "",
        company_address=req.company_address or "",
        company_id=company_id,
    )

    if not result.success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=result.message)

    return EmailResponse(
        success=result.success,
        email_id=result.email_id,
        message=result.message,
        recipient_count=result.recipient_count,
    )


@router.post("/send-salary-slip", response_model=EmailResponse)
async def send_salary_slip(
    req: SendSalarySlipRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Send a salary slip email to an employee.

    The payslip PDF should be attached separately (not supported in JSON body).
    For attachment support, use the service directly.
    """
    company_id = _resolve_company_id(current_user)
    company_name = req.company_name or "Accountify"

    result = EmailService.send_salary_slip(
        to_email=req.employee_email,
        employee_name=req.employee_name,
        employee_code=req.employee_code,
        month=req.month,
        year=req.year,
        gross_salary=req.gross_salary,
        deductions=req.deductions,
        net_salary=req.net_salary,
        company_name=company_name,
        hr_phone=req.hr_phone or "",
        company_id=company_id,
    )

    if not result.success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=result.message)

    return EmailResponse(
        success=result.success,
        email_id=result.email_id,
        message=result.message,
        recipient_count=result.recipient_count,
    )


@router.post("/send-statement", response_model=EmailResponse)
async def send_account_statement(
    req: SendStatementRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Send a monthly account statement to a customer.
    """
    company_id = _resolve_company_id(current_user)
    company_name = req.company_name or "Accountify"

    result = EmailService.send_account_statement(
        to_email=req.customer_email,
        customer_name=req.customer_name,
        company_name=company_name,
        period_start=req.period_start,
        period_end=req.period_end,
        opening_balance=req.opening_balance,
        total_debits=req.total_debits,
        total_credits=req.total_credits,
        closing_balance=req.closing_balance,
        transactions=req.transactions,
        company_address=req.company_address or "",
        company_phone=req.company_phone or "",
        company_ntn=req.company_ntn or "",
        company_id=company_id,
    )

    if not result.success:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=result.message)

    return EmailResponse(
        success=result.success,
        email_id=result.email_id,
        message=result.message,
        recipient_count=1,
    )


@router.post("/send-bulk", response_model=BulkEmailResponse)
async def send_bulk_emails(
    req: BulkEmailRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Send bulk emails to multiple recipients.
    Each recipient gets a personalized email rendered from the template.
    """
    company_id = _resolve_company_id(current_user)

    recipient_dicts = [r.model_dump() for r in req.recipients]

    results = EmailService.send_bulk(
        recipients=recipient_dicts,
        subject_template=req.subject_template,
        html_template_name=req.html_template_name,
        context_base=req.context_base,
        email_type=req.email_type,
        company_id=company_id,
    )

    bulk_results = []
    total_sent = 0
    total_failed = 0
    for r in results:
        bulk_results.append(BulkEmailResult(
            email_id=r.email_id,
            success=r.success,
            message=r.message,
        ))
        if r.success:
            total_sent += 1
        else:
            total_failed += 1

    return BulkEmailResponse(
        results=bulk_results,
        total_sent=total_sent,
        total_failed=total_failed,
    )


@router.get("/logs", response_model=EmailLogsResponse)
async def fetch_email_logs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    email_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch email delivery logs with optional filters.
    """
    supabase = _get_supabase_client()
    resolved_company = company_id or _resolve_company_id(current_user)

    query = supabase.table("email_logs").select("*", count="exact")

    if resolved_company:
        query = query.eq("company_id", resolved_company)
    if email_type:
        query = query.eq("email_type", email_type)
    if status_filter:
        query = query.eq("status", status_filter)

    response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()

    logs = []
    for row in response.data or []:
        logs.append(EmailLogEntry(
            id=row["id"],
            email_type=row.get("email_type", "custom"),
            recipient=row.get("recipient", ""),
            subject=row.get("subject", ""),
            status=row.get("status", "pending"),
            reference_id=row.get("reference_id"),
            attachments_count=row.get("attachments_count", 0),
            attempts=row.get("attempts", 1),
            sent_at=row.get("sent_at"),
            created_at=row.get("created_at", ""),
            error_message=row.get("error_message"),
        ))

    return EmailLogsResponse(
        success=True,
        logs=logs,
        total=response.count or 0,
        message="Email logs retrieved successfully",
    )


@router.get("/logs/{email_id}")
async def fetch_email_log(
    email_id: str,
    current_user: User = Depends(get_current_user),
):
    """Fetch a single email log entry by ID."""
    supabase = _get_supabase_client()
    resolved_company = _resolve_company_id(current_user)

    query = supabase.table("email_logs").select("*").eq("id", email_id)
    if resolved_company:
        query = query.eq("company_id", resolved_company)

    response = query.execute()

    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email log not found")

    row = response.data[0]
    return EmailLogEntry(
        id=row["id"],
        email_type=row.get("email_type", "custom"),
        recipient=row.get("recipient", ""),
        subject=row.get("subject", ""),
        status=row.get("status", "pending"),
        reference_id=row.get("reference_id"),
        attachments_count=row.get("attachments_count", 0),
        attempts=row.get("attempts", 1),
        sent_at=row.get("sent_at"),
        created_at=row.get("created_at", ""),
        error_message=row.get("error_message"),
    )
