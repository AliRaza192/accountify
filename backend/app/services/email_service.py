"""Email Service for sending notifications"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional, Dict, Any
import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails"""

    @staticmethod
    def send_email(
        to_emails: List[str],
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """Send email via SMTP"""
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = ", ".join(to_emails)
            msg["Subject"] = subject

            # Add text version if provided
            if text_body:
                msg.attach(MIMEText(text_body, "plain"))

            # Add HTML version
            msg.attach(MIMEText(html_body, "html"))

            # Add attachments if any
            if attachments:
                for attachment in attachments:
                    part = MIMEApplication(attachment["data"])
                    part.add_header(
                        "Content-Disposition",
                        "attachment",
                        filename=attachment["filename"]
                    )
                    msg.attach(part)

            # Connect and send
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, to_emails, msg.as_string())

            logger.info(f"Email sent to {to_emails}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_emails}: {e}")
            return False

    @staticmethod
    def send_approval_request(
        to_email: str,
        approver_name: str,
        document_type: str,
        document_number: str,
        amount: float,
        requested_by: str,
        approval_url: str
    ) -> bool:
        """Send approval request email"""
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Approval Request</h2>
            <p>Dear {approver_name},</p>
            <p>A new document requires your approval:</p>
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Document Type</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{document_type}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Document #</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{document_number}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">PKR {amount:,.2f}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Requested By</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{requested_by}</td></tr>
            </table>
            <p style="margin: 20px 0;">
                <a href="{approval_url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
                    Review & Approve
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">This is an automated message from Accountify.</p>
        </body>
        </html>
        """
        return EmailService.send_email(
            to_emails=[to_email],
            subject=f"Approval Required: {document_type} #{document_number}",
            html_body=html
        )

    @staticmethod
    def send_otp(
        to_email: str,
        otp_code: str,
        expires_in_minutes: int = 10
    ) -> bool:
        """Send OTP code for 2FA"""
        html = f"""
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
            html_body=html
        )

    @staticmethod
    def send_budget_alert(
        to_email: str,
        budget_name: str,
        account_name: str,
        budgeted: float,
        actual: float,
        variance_pct: float
    ) -> bool:
        """Send budget alert notification"""
        html = f"""
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
            html_body=html
        )
