"""
Cost Centers SQLAlchemy Models
Tables: cost_centers, cost_center_allocations
"""

from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from decimal import Decimal
from typing import Optional, List
from uuid import UUID as UUID_TYPE

from app.models.base import AuditableModel


class CostCenter(AuditableModel):
    """Cost center for department-wise P&L tracking"""
    
    __tablename__ = "cost_centers"
    
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    overhead_allocation_rule: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    allocations: Mapped[List["CostCenterAllocation"]] = relationship(
        back_populates="cost_center", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        UniqueConstraint('company_id', 'code', name='uq_cost_centers_company_code'),
        CheckConstraint(
            'status IN (\'active\', \'inactive\')',
            name='chk_cost_center_status_valid'
        ),
    )


class CostCenterAllocation(AuditableModel):
    """Allocation of transactions to cost centers"""
    
    __tablename__ = "cost_center_allocations"
    
    cost_center_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("cost_centers.id"), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    transaction_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    allocation_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=100.0)
    
    # Relationships
    cost_center: Mapped["CostCenter"] = relationship(back_populates="allocations")
    
    __table_args__ = (
        CheckConstraint('amount >= 0', name='chk_allocation_amount_positive'),
        CheckConstraint(
            'allocation_percent >= 0 AND allocation_percent <= 100',
            name='chk_allocation_percent_range'
        ),
    )
