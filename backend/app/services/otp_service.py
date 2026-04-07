"""OTP Service for 2FA"""
from sqlalchemy.orm import Session
from typing import Optional, Tuple
from datetime import datetime, timezone, timedelta
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

from app.models.auth import OTPToken
from app.config import settings

logger = logging.getLogger(__name__)


class OTPService:
    """Service for 2FA OTP generation and verification"""
    
    @staticmethod
    def generate_otp() -> Tuple[str, str]:
        """
        Generate a 6-digit OTP
        Returns: (plain_otp, hashed_otp)
        """
        otp = f"{secrets.randbelow(1000000):06d}"
        # In production, hash the OTP before storing
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"])
        hashed = pwd_context.hash(otp)
        return otp, hashed
    
    @staticmethod
    def create_otp(db: Session, user_id: str, 
                   expiry_minutes: int = 5) -> OTPToken:
        """Create new OTP for user"""
        otp_plain, otp_hashed = OTPService.generate_otp()
        
        # Invalidate any existing unused OTPs for this user
        db.query(OTPToken).filter(
            OTPToken.user_id == user_id,
            OTPToken.is_used == False
        ).update({"is_used": True})
        
        otp_token = OTPToken.create_token(
            db, user_id, otp_hashed, expiry_minutes
        )
        
        logger.info(f"Created OTP for user {user_id}")
        return otp_token
    
    @staticmethod
    def verify_otp(db: Session, user_id: str, 
                   otp: str) -> bool:
        """
        Verify OTP for user
        Returns: True if valid, False otherwise
        """
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"])
        
        # Get unused OTPs for user
        otps = db.query(OTPToken).filter(
            OTPToken.user_id == user_id,
            OTPToken.is_used == False
        ).all()
        
        for otp_token in otps:
            # Check if expired
            if not otp_token.is_valid():
                continue
            
            # Verify OTP
            try:
                if pwd_context.verify(otp, otp_token.token_hash):
                    # Mark as used
                    otp_token.mark_used(db)
                    logger.info(f"OTP verified for user {user_id}")
                    return True
            except Exception:
                continue
        
        logger.warning(f"Invalid OTP attempt for user {user_id}")
        return False
    
    @staticmethod
    def send_otp_email(user_email: str, otp: str) -> bool:
        """
        Send OTP via email
        Returns: True if sent successfully
        """
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = settings.EMAIL_FROM
            msg['To'] = user_email
            msg['Subject'] = 'Accountify - Your Verification Code'
            
            # Email body
            body = f"""
Hello,

Your verification code is: {otp}

This code expires in 5 minutes. Do not share this code with anyone.

If you did not request this code, please contact support immediately.

Best regards,
Accountify Team
"""
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(
                settings.SMTP_HOST,
                settings.SMTP_PORT
            )
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"OTP email sent to {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send OTP email: {e}")
            return False
    
    @staticmethod
    def cleanup_expired_otps(db: Session) -> int:
        """Delete expired OTPs"""
        now = datetime.now(timezone.utc)
        count = db.query(OTPToken).filter(
            OTPToken.expires_at < now
        ).delete()
        db.commit()
        logger.info(f"Cleaned up {count} expired OTPs")
        return count
    
    @staticmethod
    def check_rate_limit(db: Session, user_id: str, 
                        max_requests: int = 3, 
                        window_minutes: int = 15) -> bool:
        """
        Check if user has exceeded OTP request rate limit
        Returns: True if within limit, False if exceeded
        """
        window_start = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
        
        count = db.query(OTPToken).filter(
            OTPToken.user_id == user_id,
            OTPToken.created_at >= window_start
        ).count()
        
        if count >= max_requests:
            logger.warning(f"OTP rate limit exceeded for user {user_id}")
            return False
        
        return True
