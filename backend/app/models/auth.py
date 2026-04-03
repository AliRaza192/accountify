"""Authentication models: LoginHistory and OTPToken"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, INET
from datetime import datetime, timezone, timedelta

from app.models.base import Base


class LoginHistory(Base):
    """User login session tracking"""
    __tablename__ = "login_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    ip_address = Column(INET, nullable=False)
    user_agent = Column(String, nullable=True)
    status = Column(String(20), default='success', index=True)  # success, failed, blocked
    failure_reason = Column(String(255), nullable=True)
    login_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    logout_at = Column(DateTime(timezone=True), nullable=True)
    session_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    @classmethod
    def log_login(cls, db_session, user_id: str, ip_address: str, user_agent: str = None, 
                  status: str = 'success', failure_reason: str = None, session_id: str = None):
        """Log a login attempt"""
        login = cls(
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            failure_reason=failure_reason,
            session_id=session_id
        )
        db_session.add(login)
        db_session.commit()
        return login

    def logout(self, db_session):
        """Mark session as logged out"""
        self.logout_at = datetime.now(timezone.utc)
        db_session.commit()


class OTPToken(Base):
    """2FA OTP tokens with expiry"""
    __tablename__ = "otp_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    @classmethod
    def create_token(cls, db_session, user_id: str, token_hash: str, expiry_minutes: int = 5):
        """Create a new OTP token"""
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
        otp = cls(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        db_session.add(otp)
        db_session.commit()
        return otp

    def is_valid(self) -> bool:
        """Check if OTP is still valid"""
        now = datetime.now(timezone.utc)
        return not self.is_used and self.expires_at > now

    def mark_used(self, db_session):
        """Mark OTP as used"""
        self.is_used = True
        db_session.commit()
