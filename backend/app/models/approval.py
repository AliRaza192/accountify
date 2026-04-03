"""Approval Workflow models"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, DECIMAL
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timezone

from app.models.base import Base


class ApprovalWorkflow(Base):
    """Approval workflow definition"""
    __tablename__ = "approval_workflows"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    module = Column(String(50), nullable=False, index=True)
    condition_amount = Column(DECIMAL(15, 2), nullable=True)
    condition_operator = Column(String(5), default=">")
    levels_json = Column(JSONB, nullable=False, default=[])
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ApprovalRequest(Base):
    """Document pending approval"""
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    workflow_id = Column(Integer, ForeignKey("approval_workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(50), nullable=False, index=True)
    document_id = Column(Integer, nullable=False)
    status = Column(String(20), default="pending", index=True)
    current_level = Column(Integer, default=1)
    requested_by = Column(String(255), nullable=False)
    requested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(String(255), nullable=True)


class ApprovalAction(Base):
    """Individual approval action"""
    __tablename__ = "approval_actions"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("approval_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(Integer, nullable=False)
    action = Column(String(20), nullable=False)
    actioned_by = Column(String(255), nullable=False)
    comments = Column(Text, nullable=True)
    actioned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    delegated_to = Column(String(255), nullable=True)
