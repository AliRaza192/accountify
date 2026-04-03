"""Audit Log model for complete audit trail"""
from sqlalchemy import Column, Integer, String, BigInteger, ForeignKey, DateTime, CheckConstraint, Text
from sqlalchemy.dialects.postgresql import JSONB, INET
from datetime import datetime, timezone

from app.models.base import Base


class AuditLog(Base):
    """Audit log entry (partitioned by created_at)"""
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    action = Column(String(20), nullable=False, index=True)  # INSERT, UPDATE, DELETE
    table_name = Column(String(100), nullable=False, index=True)
    record_id = Column(Integer, nullable=False, index=True)
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        CheckConstraint(
            "action IN ('INSERT', 'UPDATE', 'DELETE')",
            name='check_audit_action'
        ),
    )

    @classmethod
    def log(cls, db_session, company_id: int, user_id: str, action: str, 
            table_name: str, record_id: int, old_values: dict = None, 
            new_values: dict = None, ip_address: str = None, user_agent: str = None):
        """Create an audit log entry"""
        audit_log = cls(
            company_id=company_id,
            user_id=user_id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db_session.add(audit_log)
        db_session.commit()
        return audit_log
