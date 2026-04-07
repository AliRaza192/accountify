"""
Tax Management SQLAlchemy Models
Tables: tax_rates, tax_returns, wht_transactions
"""

from sqlalchemy import Column, String, Integer, Numeric, Date, Boolean, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID as UUID_TYPE

from app.models.base import AuditableModel


class TaxRate(AuditableModel):
    """Tax rate definitions with effective dates"""

    __tablename__ = "tax_rates"

    tax_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rate_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    tax_type: Mapped[str] = mapped_column(String(20), nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)

    __table_args__ = (
        CheckConstraint(
            'tax_type IN (\'sales_tax\', \'input_tax\', \'wht\', \'federal_excise\')',
            name='chk_tax_type_valid'
        ),
        CheckConstraint('rate_percent >= 0', name='chk_tax_rate_non_negative'),
    )


class TaxReturn(AuditableModel):
    """Monthly/quarterly tax return filings"""

    __tablename__ = "tax_returns"

    return_period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    return_period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    output_tax_total: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    input_tax_total: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    net_tax_payable: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    filed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    challan_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    challan_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")

    __table_args__ = (
        UniqueConstraint(
            'company_id', 'return_period_month', 'return_period_year',
            name='uq_tax_returns_company_period'
        ),
        CheckConstraint(
            'return_period_month >= 1 AND return_period_month <= 12',
            name='chk_return_period_month_valid'
        ),
        CheckConstraint(
            'status IN (\'draft\', \'filed\', \'paid\')',
            name='chk_tax_return_status_valid'
        ),
    )


class WHTTransaction(AuditableModel):
    """Withholding tax deduction tracking"""

    __tablename__ = "wht_transactions"

    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    party_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), nullable=False)
    party_type: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    wht_category: Mapped[str] = mapped_column(String(50), nullable=False)
    wht_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    wht_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    challan_id: Mapped[Optional[UUID_TYPE]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tax_returns.id"), nullable=True
    )
    is_filer: Mapped[bool] = mapped_column(default=True)

    # Relationships
    challan: Mapped[Optional["TaxReturn"]] = relationship(back_populates="wht_transactions")

    __table_args__ = (
        CheckConstraint(
            'party_type IN (\'customer\', \'vendor\')',
            name='chk_wht_party_type_valid'
        ),
        CheckConstraint('amount >= 0', name='chk_wht_amount_non_negative'),
        CheckConstraint('wht_rate >= 0', name='chk_wht_rate_non_negative'),
        CheckConstraint('wht_amount >= 0', name='chk_wht_deducted_non_negative'),
    )


# Add reverse relationship to TaxReturn
TaxReturn.wht_transactions = relationship("WHTTransaction", back_populates="challan", cascade="all, delete-orphan")
