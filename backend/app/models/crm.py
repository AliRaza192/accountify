"""
CRM SQLAlchemy Models
Tables: leads, crm_tickets, loyalty_programs, loyalty_points
"""

from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID as UUID_TYPE

from app.models.base import AuditableModel


class Lead(AuditableModel):
    """Sales lead"""
    
    __tablename__ = "leads"
    
    lead_code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    requirement: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    estimated_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    probability_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    stage: Mapped[str] = mapped_column(String(50), nullable=False, default="new")
    assigned_to: Mapped[Optional[UUID_TYPE]] = mapped_column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True)
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    ai_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    converted_to_customer_id: Mapped[Optional[UUID_TYPE]] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)
    
    __table_args__ = (
        UniqueConstraint('company_id', 'lead_code', name='uq_leads_company_code'),
        CheckConstraint('probability_percent >= 0 AND probability_percent <= 100', name='chk_lead_probability_range'),
        CheckConstraint(
            'stage IN (\'new\', \'contacted\', \'proposal\', \'negotiation\', \'converted\', \'lost\')',
            name='chk_lead_stage_valid'
        ),
        CheckConstraint(
            'source IN (\'website\', \'whatsapp\', \'referral\', \'walk_in\', \'cold_call\')',
            name='chk_lead_source_valid'
        ),
    )


class CRMTicket(AuditableModel):
    """Support ticket"""
    
    __tablename__ = "crm_tickets"
    
    ticket_number: Mapped[str] = mapped_column(String(20), nullable=False)
    customer_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    issue_category: Mapped[str] = mapped_column(String(50), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    assigned_to: Mapped[Optional[UUID_TYPE]] = mapped_column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="open")
    description: Mapped[str] = mapped_column(String, nullable=False)
    resolution_notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    satisfaction_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    resolved_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    __table_args__ = (
        UniqueConstraint('company_id', 'ticket_number', name='uq_tickets_company_number'),
        CheckConstraint(
            'issue_category IN (\'billing\', \'technical\', \'general\', \'complaint\')',
            name='chk_ticket_category_valid'
        ),
        CheckConstraint(
            'priority IN (\'low\', \'medium\', \'high\', \'critical\')',
            name='chk_ticket_priority_valid'
        ),
        CheckConstraint(
            'status IN (\'open\', \'in_progress\', \'waiting_customer\', \'resolved\', \'closed\')',
            name='chk_ticket_status_valid'
        ),
        CheckConstraint('satisfaction_rating >= 1 AND satisfaction_rating <= 5', name='chk_satisfaction_rating_range'),
    )


class LoyaltyProgram(AuditableModel):
    """Loyalty program configuration"""
    
    __tablename__ = "loyalty_programs"
    
    program_name: Mapped[str] = mapped_column(String(100), nullable=False)
    points_per_rupee: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=1.0)
    redemption_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=1.0)
    tier_benefits_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    
    __table_args__ = (
        CheckConstraint('points_per_rupee > 0', name='chk_points_per_rupee_positive'),
        CheckConstraint('redemption_rate > 0', name='chk_redemption_rate_positive'),
    )


class LoyaltyPoints(AuditableModel):
    """Customer loyalty points"""
    
    __tablename__ = "loyalty_points"
    
    customer_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    points: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    reference_id: Mapped[Optional[UUID_TYPE]] = mapped_column(UUID(as_uuid=True), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    __table_args__ = (
        CheckConstraint(
            'transaction_type IN (\'earned\', \'redeemed\', \'expired\', \'adjusted\')',
            name='chk_loyalty_transaction_type_valid'
        ),
    )
