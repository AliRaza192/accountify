"""
Email Service for the Accounting System

Provides email sending capabilities with:
- SMTP configuration from environment
- HTML email templates for invoices, payment reminders, salary slips, account statements
- Attachment support
- Bulk email sending
- Email delivery tracking/logging via Supabase
- Retry logic with exponential backoff
- Pakistani business conventions (PKR currency, bilingual greetings)
"""

import smtplib
import ssl
import time
import logging
import uuid
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dataclasses import dataclass, field, asdict
from enum import Enum

from supabase import create_client, Client
from jinja2 import Environment, FileSystemLoader

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates" / "emails"

MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 2  # base for exponential backoff

# ---------------------------------------------------------------------------
# Enums / Data classes
# ---------------------------------------------------------------------------


class EmailType(str, Enum):
    INVOICE = "invoice"
    PAYMENT_REMINDER = "payment_reminder"
    SALARY_SLIP = "salary_slip"
    ACCOUNT_STATEMENT = "account_statement"
    APPROVAL_REQUEST = "approval_request"
    OTP = "otp"
    BUDGET_ALERT = "budget_alert"
    CUSTOM = "custom"


class DeliveryStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"


class ReminderType(str, Enum):
    THREE_DAYS_BEFORE = "3_days_before"
    ON_DUE_DATE = "on_due_date"
    OVERDUE = "overdue"


@dataclass
class AttachmentData:
    filename: str
    data: bytes
    content_type: str = "application/octet-stream"


@dataclass
class EmailResult:
    success: bool
    email_id: Optional[str] = None
    message: str = ""
    recipient_count: int = 0
    errors: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Jinja2 template environment
# ---------------------------------------------------------------------------


def _get_jinja_env() -> Environment:
    """Return a Jinja2 Environment pointed at the email templates directory."""
    if not TEMPLATES_DIR.exists():
        TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
    return Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)


def _render_template(template_name: str, context: Dict[str, Any]) -> str:
    """Render an HTML email template with the given context."""
    env = _get_jinja_env()
    tpl = env.get_template(template_name)
    return tpl.render(**context)


# ---------------------------------------------------------------------------
# PKR formatting helper
# ---------------------------------------------------------------------------


def format_pkr(amount: float) -> str:
    """Format amount as PKR with commas, e.g. PKR 1,234,567.89"""
    return f"PKR {amount:,.2f}"


def format_date_pakistan(dt) -> str:
    """Format date in Pakistani convention: 07-Apr-2026"""
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except ValueError:
            return dt
    return dt.strftime("%d-%b-%Y")


def format_date_pakistan_long(dt) -> str:
    """Long format: 07 April 2026"""
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except ValueError:
            return dt
    return dt.strftime("%d %B %Y")


# ---------------------------------------------------------------------------
# Email Logs table helpers
# ---------------------------------------------------------------------------


def _get_supabase_client() -> Client:
    """Create a Supabase client for email logging."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def _log_email_event(
    email_id: str,
    email_type: str,
    recipient: str,
    subject: str,
    status: str,
    company_id: Optional[str] = None,
    reference_id: Optional[str] = None,
    error_message: Optional[str] = None,
    attachments_count: int = 0,
    attempts: int = 1,
) -> Optional[str]:
    """Insert a record into the email_logs table."""
    try:
        supabase = _get_supabase_client()
        record = {
            "id": email_id,
            "email_type": email_type,
            "recipient": recipient,
            "subject": subject,
            "status": status,
            "company_id": company_id,
            "reference_id": reference_id,
            "error_message": error_message,
            "attachments_count": attachments_count,
            "attempts": attempts,
            "sent_at": datetime.now(timezone.utc).isoformat() if status == DeliveryStatus.SENT else None,
        }
        supabase.table("email_logs").insert(record).execute()
        return email_id
    except Exception as e:
        logger.error(f"Failed to log email event: {e}")
        return None


def _update_email_status(
    email_id: str,
    status: str,
    error_message: Optional[str] = None,
    attempts: int = 1,
) -> None:
    """Update the status of an existing email log."""
    try:
        supabase = _get_supabase_client()
        update_data: Dict[str, Any] = {
            "status": status,
            "attempts": attempts,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if status == DeliveryStatus.SENT:
            update_data["sent_at"] = datetime.now(timezone.utc).isoformat()
        if error_message:
            update_data["error_message"] = error_message
            update_data["last_error_at"] = datetime.now(timezone.utc).isoformat()

        supabase.table("email_logs").update(update_data).eq("id", email_id).execute()
    except Exception as e:
        logger.error(f"Failed to update email status for {email_id}: {e}")


# ---------------------------------------------------------------------------
# Core EmailService
# ---------------------------------------------------------------------------


class EmailService:
    """Service for sending emails with retry logic and delivery tracking."""

    # ------------------------------------------------------------------
    # SMTP helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_message(
        to_emails: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[AttachmentData]] = None,
    ) -> MIMEMultipart:
        """Build a MIMEMultipart message."""
        msg = MIMEMultipart("mixed")
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = ", ".join(to_emails)
        msg["Subject"] = subject

        # Alternative part (text + html)
        alt_part = MIMEMultipart("alternative")
        if text_body:
            alt_part.attach(MIMEText(text_body, "plain", "utf-8"))
        alt_part.attach(MIMEText(html_body, "html", "utf-8"))
        msg.attach(alt_part)

        # Attachments
        if attachments:
            for att in attachments:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(att.data)
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=("utf-8", "", att.filename),
                )
                msg.attach(part)

        return msg

    @staticmethod
    def _send_smtp(msg: MIMEMultipart, to_emails: List[str]) -> None:
        """Send via SMTP with retry + exponential backoff."""
        last_error: Optional[Exception] = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                context = ssl.create_default_context()
                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
                    server.ehlo()
                    if settings.SMTP_USE_TLS:
                        server.starttls(context=context)
                        server.ehlo()
                    if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                    server.sendmail(settings.EMAIL_FROM, to_emails, msg.as_string())
                return  # success
            except Exception as e:
                last_error = e
                logger.warning(f"SMTP send attempt {attempt}/{MAX_RETRIES} failed: {e}")
                if attempt < MAX_RETRIES:
                    backoff = RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1))
                    time.sleep(backoff)

        raise last_error  # type: ignore[misc]

    # ------------------------------------------------------------------
    # Public: send with logging
    # ------------------------------------------------------------------

    @staticmethod
    def send_email(
        to_emails: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[AttachmentData]] = None,
        email_type: str = EmailType.CUSTOM,
        company_id: Optional[str] = None,
        reference_id: Optional[str] = None,
    ) -> EmailResult:
        """Send email with delivery logging and retry logic."""
        email_id = str(uuid.uuid4())
        recipients_str = ", ".join(to_emails)

        # Log pending
        _log_email_event(
            email_id=email_id,
            email_type=email_type,
            recipient=recipients_str,
            subject=subject,
            status=DeliveryStatus.PENDING,
            company_id=company_id,
            reference_id=reference_id,
            attachments_count=len(attachments) if attachments else 0,
        )

        try:
            msg = EmailService._build_message(to_emails, subject, html_body, text_body, attachments)
            EmailService._send_smtp(msg, to_emails)

            # Log success
            _update_email_status(email_id, DeliveryStatus.SENT)
            logger.info(f"Email sent to {recipients_str}: {subject}")
            return EmailResult(
                success=True,
                email_id=email_id,
                message="Email sent successfully",
                recipient_count=len(to_emails),
            )
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to send email to {recipients_str}: {error_msg}")
            _update_email_status(email_id, DeliveryStatus.FAILED, error_message=error_msg)
            return EmailResult(
                success=False,
                email_id=email_id,
                message=f"Failed to send email: {error_msg}",
                errors=[error_msg],
            )

    # ------------------------------------------------------------------
    # Bulk send
    # ------------------------------------------------------------------

    @staticmethod
    def send_bulk(
        recipients: List[Dict[str, Any]],
        subject_template: str,
        html_template_name: str,
        context_base: Dict[str, Any],
        attachments: Optional[List[AttachmentData]] = None,
        email_type: str = EmailType.CUSTOM,
        company_id: Optional[str] = None,
    ) -> List[EmailResult]:
        """
        Send emails in bulk.

        *recipients* is a list of dicts, each with at least an ``email`` key.
        Each recipient gets its own rendered subject/body.  Extra keys in the
        recipient dict are merged into the Jinja context.
        """
        results: List[EmailResult] = []
        for recipient in recipients:
            email_addr = recipient.get("email")
            if not email_addr:
                results.append(EmailResult(success=False, message="Missing email address for recipient"))
                continue

            ctx = {**context_base, **{k: v for k, v in recipient.items() if k != "email"}}
            subject = subject_template.format(**ctx)
            try:
                html_body = _render_template(html_template_name, ctx)
            except Exception as e:
                results.append(EmailResult(success=False, message=f"Template render error: {e}"))
                continue

            result = EmailService.send_email(
                to_emails=[email_addr],
                subject=subject,
                html_body=html_body,
                attachments=attachments,
                email_type=email_type,
                company_id=company_id,
                reference_id=recipient.get("reference_id"),
            )
            results.append(result)
        return results

    # ------------------------------------------------------------------
    # Invoice email
    # ------------------------------------------------------------------

    @staticmethod
    def send_invoice_email(
        to_email: str,
        customer_name: str,
        invoice_number: str,
        invoice_date: str,
        due_date: str,
        subtotal: float,
        tax_total: float,
        discount: float,
        total: float,
        balance_due: float,
        items: Optional[List[Dict[str, Any]]] = None,
        company_name: str = "Accountify User",
        company_address: str = "",
        company_phone: str = "",
        company_ntn: str = "",
        notes: Optional[str] = None,
        pdf_attachment: Optional[AttachmentData] = None,
        company_id: Optional[str] = None,
        invoice_id: Optional[str] = None,
    ) -> EmailResult:
        """Send an invoice email with optional PDF attachment."""
        context = {
            "customer_name": customer_name,
            "invoice_number": invoice_number,
            "invoice_date": format_date_pakistan(invoice_date),
            "due_date": format_date_pakistan(due_date),
            "subtotal": format_pkr(subtotal),
            "tax_total": format_pkr(tax_total),
            "discount": format_pkr(discount),
            "total": format_pkr(total),
            "balance_due": format_pkr(balance_due),
            "company_name": company_name,
            "company_address": company_address,
            "company_phone": company_phone,
            "company_ntn": company_ntn,
            "notes": notes or "",
            "items": items or [],
            "year": datetime.now().year,
        }
        html_body = _render_template("invoice_email.html", context)
        subject = f"Invoice {invoice_number} from {company_name}"

        attachments: Optional[List[AttachmentData]] = None
        if pdf_attachment:
            attachments = [pdf_attachment]

        return EmailService.send_email(
            to_emails=[to_email],
            subject=subject,
            html_body=html_body,
            attachments=attachments,
            email_type=EmailType.INVOICE,
            company_id=company_id,
            reference_id=invoice_id,
        )

    # ------------------------------------------------------------------
    # Payment reminder
    # ------------------------------------------------------------------

    @staticmethod
    def send_payment_reminder(
        to_email: str,
        customer_name: str,
        invoice_number: str,
        invoice_date: str,
        due_date: str,
        balance_due: float,
        reminder_type: str = ReminderType.THREE_DAYS_BEFORE,
        company_name: str = "Accountify User",
        company_phone: str = "",
        company_address: str = "",
        company_id: Optional[str] = None,
        invoice_id: Optional[str] = None,
    ) -> EmailResult:
        """Send a payment reminder (3 days before / on due date / overdue)."""
        # Build Urdu greeting based on type
        urdu_greeting = ""
        if reminder_type == ReminderType.THREE_DAYS_BEFORE:
            subject_line = f"Payment Reminder: Invoice {invoice_number} due on {format_date_pakistan(due_date)}"
            urdu_greeting = "\u0622\u067e \u06a9\u06cc \u0627\u062f\u0627\u0626\u06cc\u06af\u06cc \u06a9\u06cc \u06cc\u0627\u062f \u062f\u06c1\u0627\u0646\u06cc"  # "آپ کی ادائیگی کی یاد دہانی"
        elif reminder_type == ReminderType.ON_DUE_DATE:
            subject_line = f"Payment Due Today: Invoice {invoice_number}"
            urdu_greeting = "\u0622\u062c \u0627\u062f\u0627\u0626\u06cc\u06af\u06cc \u06a9\u06cc \u0622\u062e\u0631\u06cc \u062a\u0627\u0631\u06cc\u062e \u06c1\u06d2"  # "آج ادائیگی کی آخری تاریخ ہے"
        else:
            days_overdue = 0
            try:
                due = datetime.fromisoformat(due_date)
                days_overdue = (datetime.now(timezone.utc).replace(tzinfo=None) - due).days
            except Exception:
                pass
            subject_line = f"OVERDUE: Invoice {invoice_number} - {days_overdue} days past due"
            urdu_greeting = "\u0627\u062f\u0627\u0626\u06cc\u06af\u06cc \u0645\u0639\u0627\u062f\u06d2 \u0633\u06d2 \u06af\u0632\u0631 \u06af\u0626\u06cc \u06c1\u06d2"  # "ادائیگی معیاد سے گزر گئی ہے"

        context = {
            "customer_name": customer_name,
            "invoice_number": invoice_number,
            "invoice_date": format_date_pakistan(invoice_date),
            "due_date": format_date_pakistan(due_date),
            "balance_due": format_pkr(balance_due),
            "reminder_type": reminder_type,
            "company_name": company_name,
            "company_phone": company_phone,
            "company_address": company_address,
            "urdu_greeting": urdu_greeting,
            "year": datetime.now().year,
        }
        html_body = _render_template("payment_reminder.html", context)

        return EmailService.send_email(
            to_emails=[to_email],
            subject=subject_line,
            html_body=html_body,
            email_type=EmailType.PAYMENT_REMINDER,
            company_id=company_id,
            reference_id=invoice_id,
        )

    # ------------------------------------------------------------------
    # Salary slip email
    # ------------------------------------------------------------------

    @staticmethod
    def send_salary_slip(
        to_email: str,
        employee_name: str,
        employee_code: str,
        month: str,
        year: int,
        gross_salary: float,
        deductions: float,
        net_salary: float,
        company_name: str = "Accountify User",
        hr_phone: str = "",
        payslip_pdf: Optional[AttachmentData] = None,
        company_id: Optional[str] = None,
        employee_id: Optional[str] = None,
    ) -> EmailResult:
        """Send a salary slip email with PDF payslip attachment."""
        month_names = [
            "", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ]
        month_name = month_names[int(month)] if isinstance(month, str) and month.isdigit() else month

        context = {
            "employee_name": employee_name,
            "employee_code": employee_code,
            "month_name": month_name,
            "year": year,
            "gross_salary": format_pkr(gross_salary),
            "deductions": format_pkr(deductions),
            "net_salary": format_pkr(net_salary),
            "company_name": company_name,
            "hr_phone": hr_phone,
            "urdu_greeting": "\u0622\u067e \u06a9\u06cc \u067e\u06cc\u0627\u0631 \u0633\u0644\u0679 \u062a\u06cc\u0627\u0631 \u06c1\u06d2",  # "آپ کی پے سلپ تیار ہے"
        }
        html_body = _render_template("salary_slip_email.html", context)
        subject = f"Salary Slip - {month_name} {year} - {employee_name}"

        attachments: Optional[List[AttachmentData]] = None
        if payslip_pdf:
            attachments = [payslip_pdf]

        return EmailService.send_email(
            to_emails=[to_email],
            subject=subject,
            html_body=html_body,
            attachments=attachments,
            email_type=EmailType.SALARY_SLIP,
            company_id=company_id,
            reference_id=employee_id,
        )

    # ------------------------------------------------------------------
    # Account statement email
    # ------------------------------------------------------------------

    @staticmethod
    def send_account_statement(
        to_email: str,
        customer_name: str,
        company_name: str = "Accountify User",
        period_start: str = "",
        period_end: str = "",
        opening_balance: float = 0.0,
        total_debits: float = 0.0,
        total_credits: float = 0.0,
        closing_balance: float = 0.0,
        transactions: Optional[List[Dict[str, Any]]] = None,
        company_address: str = "",
        company_phone: str = "",
        company_ntn: str = "",
        statement_pdf: Optional[AttachmentData] = None,
        company_id: Optional[str] = None,
    ) -> EmailResult:
        """Send a monthly account statement."""
        context = {
            "customer_name": customer_name,
            "company_name": company_name,
            "period_start": format_date_pakistan(period_start) if period_start else "N/A",
            "period_end": format_date_pakistan(period_end) if period_end else "N/A",
            "opening_balance": format_pkr(opening_balance),
            "total_debits": format_pkr(total_debits),
            "total_credits": format_pkr(total_credits),
            "closing_balance": format_pkr(closing_balance),
            "transactions": transactions or [],
            "company_address": company_address,
            "company_phone": company_phone,
            "company_ntn": company_ntn,
            "urdu_greeting": "\u0622\u067e \u06a9\u0627 \u0627\u06a9\u0627\u0624\u0646\u0679 \u0633\u0679\u06cc\u0679\u0645\u0646\u0679",  # "آپ کا اکاؤنٹ سٹیٹمنٹ"
            "year": datetime.now().year,
        }
        html_body = _render_template("account_statement.html", context)
        subject = f"Account Statement: {company_name} ({format_date_pakistan(period_start)} - {format_date_pakistan(period_end)})"

        attachments: Optional[List[AttachmentData]] = None
        if statement_pdf:
            attachments = [statement_pdf]

        return EmailService.send_email(
            to_emails=[to_email],
            subject=subject,
            html_body=html_body,
            attachments=attachments,
            email_type=EmailType.ACCOUNT_STATEMENT,
            company_id=company_id,
        )

    # ------------------------------------------------------------------
    # Existing methods (preserved)
    # ------------------------------------------------------------------

    @staticmethod
    def send_approval_request(
        to_email: str,
        approver_name: str,
        document_type: str,
        document_number: str,
        amount: float,
        requested_by: str,
        approval_url: str,
        company_id: Optional[str] = None,
    ) -> EmailResult:
        """Send approval request email."""
        context = {
            "approver_name": approver_name,
            "document_type": document_type,
            "document_number": document_number,
            "amount": format_pkr(amount),
            "requested_by": requested_by,
            "approval_url": approval_url,
            "rejection_url": approval_url,  # same URL; UI handles rejection
            "comments": "",
            "year": datetime.now().year,
            "request_date": format_date_pakistan(datetime.now()),
        }
        html_body = _render_template("approval_request.html", context)
        subject = f"Approval Required: {document_type} #{document_number}"

        return EmailService.send_email(
            to_emails=[to_email],
            subject=subject,
            html_body=html_body,
            email_type=EmailType.APPROVAL_REQUEST,
            company_id=company_id,
        )

    @staticmethod
    def send_otp(
        to_email: str,
        otp_code: str,
        expires_in_minutes: int = 10,
    ) -> EmailResult:
        """Send OTP code for 2FA."""
        context = {
            "otp_code": otp_code,
            "expires_in_minutes": expires_in_minutes,
        }
        # Inline OTP template (kept separate from Jinja for security)
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Your Verification Code</h2>
            <p>Use the following code to complete your login:</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">{otp_code}</span>
            </div>
            <p>This code expires in <strong>{expires_in_minutes} minutes</strong>.</p>
            <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </body>
        </html>
        """
        return EmailService.send_email(
            to_emails=[to_email],
            subject="Accountify - Verification Code",
            html_body=html_body,
            email_type=EmailType.OTP,
        )

    @staticmethod
    def send_budget_alert(
        to_email: str,
        budget_name: str,
        account_name: str,
        budgeted: float,
        actual: float,
        variance_pct: float,
        company_id: Optional[str] = None,
    ) -> EmailResult:
        """Send budget alert notification."""
        context = {
            "budget_name": budget_name,
            "account_name": account_name,
            "budgeted": format_pkr(budgeted),
            "actual": format_pkr(actual),
            "variance_pct": f"{variance_pct:.1f}%",
        }
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Budget Alert</h2>
            <p>Your budget threshold has been exceeded:</p>
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Budget</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{budget_name}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Account</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{account_name}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Budgeted</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">PKR {budgeted:,.2f}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Actual</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">PKR {actual:,.2f}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Variance</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #dc2626;">{variance_pct:.1f}%</td></tr>
            </table>
            <p style="color: #666; font-size: 12px;">This is an automated alert from Accountify Budget Management.</p>
        </body>
        </html>
        """
        return EmailService.send_email(
            to_emails=[to_email],
            subject=f"Budget Alert: {budget_name} - {account_name}",
            html_body=html_body,
            email_type=EmailType.BUDGET_ALERT,
            company_id=company_id,
        )
