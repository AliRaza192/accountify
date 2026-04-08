"""
Project Costing SQLAlchemy Models
Tables: projects, project_phases, project_costs, project_revenue
"""

from sqlalchemy import (
    Column, String, Integer, Numeric, Date, Text, ForeignKey, CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from datetime import date
from decimal import Decimal
from typing import Optional, List
from uuid import UUID as UUID_TYPE

from app.models.base import AuditableModel


class Project(AuditableModel):
    """Project/Job definitions with budget and timeline"""

    __tablename__ = "projects"

    project_code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    project_name: Mapped[str] = mapped_column(String(200), nullable=False)
    client_id: Mapped[Optional[UUID_TYPE]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    budget: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )
    manager_id: Mapped[Optional[UUID_TYPE]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    phases: Mapped[List["ProjectPhase"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    costs: Mapped[List["ProjectCost"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    revenue: Mapped[List["ProjectRevenue"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'on_hold', 'completed', 'cancelled')",
            name="chk_project_status_valid"
        ),
        CheckConstraint("budget >= 0", name="chk_project_budget_non_negative"),
    )


class ProjectPhase(AuditableModel):
    """Project phases/milestones with budget allocation"""

    __tablename__ = "project_phases"

    project_id: Mapped[UUID_TYPE] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    phase_name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    budget_allocated: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    completion_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="phases")
    costs: Mapped[List["ProjectCost"]] = relationship(back_populates="phase")

    __table_args__ = (
        UniqueConstraint("project_id", "phase_name", name="uq_project_phase_name"),
        CheckConstraint(
            "completion_pct >= 0 AND completion_pct <= 100",
            name="chk_phase_completion_valid"
        ),
        CheckConstraint(
            "budget_allocated >= 0",
            name="chk_phase_budget_non_negative"
        ),
    )


class ProjectCost(AuditableModel):
    """Costs allocated to projects from various sources"""

    __tablename__ = "project_costs"

    project_id: Mapped[UUID_TYPE] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    phase_id: Mapped[Optional[UUID_TYPE]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("project_phases.id", ondelete="SET NULL"), nullable=True
    )
    cost_source_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    cost_source_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    cost_category: Mapped[str] = mapped_column(String(50), nullable=False)
    allocated_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="costs")
    phase: Mapped[Optional["ProjectPhase"]] = relationship(back_populates="costs")

    __table_args__ = (
        CheckConstraint(
            "cost_source_type IN ('invoice', 'expense', 'payroll', 'journal', 'inventory')",
            name="chk_cost_source_type_valid"
        ),
        CheckConstraint("amount >= 0", name="chk_cost_amount_non_negative"),
    )


class ProjectRevenue(AuditableModel):
    """Revenue recognized from project invoices"""

    __tablename__ = "project_revenue"

    project_id: Mapped[UUID_TYPE] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    invoice_id: Mapped[Optional[UUID_TYPE]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    recognized_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship(back_populates="revenue")

    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_revenue_amount_non_negative"),
    )
