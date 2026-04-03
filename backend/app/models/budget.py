"""Budget models"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, DECIMAL, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.models.base import Base


class Budget(Base):
    """Annual budget"""
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True)
    fiscal_year = Column(Integer, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    status = Column(String(20), default="draft")
    total_amount = Column(DECIMAL(15, 2), nullable=True)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    lines = relationship("BudgetLine", back_populates="budget", cascade="all, delete-orphan")


class BudgetLine(Base):
    """Budget line item"""
    __tablename__ = "budget_lines"

    id = Column(Integer, primary_key=True, index=True)
    budget_id = Column(Integer, ForeignKey("budgets.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, nullable=True, index=True)
    cost_center_id = Column(Integer, nullable=True, index=True)
    jan = Column(DECIMAL(15, 2), default=0)
    feb = Column(DECIMAL(15, 2), default=0)
    mar = Column(DECIMAL(15, 2), default=0)
    apr = Column(DECIMAL(15, 2), default=0)
    may = Column(DECIMAL(15, 2), default=0)
    jun = Column(DECIMAL(15, 2), default=0)
    jul = Column(DECIMAL(15, 2), default=0)
    aug = Column(DECIMAL(15, 2), default=0)
    sep = Column(DECIMAL(15, 2), default=0)
    oct = Column(DECIMAL(15, 2), default=0)
    nov = Column(DECIMAL(15, 2), default=0)
    dec = Column(DECIMAL(15, 2), default=0)
    total = Column(DECIMAL(15, 2), nullable=False)
    notes = Column(Text, nullable=True)

    budget = relationship("Budget", back_populates="lines")
