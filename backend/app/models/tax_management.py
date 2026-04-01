"""
Tax Management SQLAlchemy Models
Tables: tax_rates, tax_returns, wht_transactions
"""

from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID as UUID_TYPE

from app.models.base import AuditableModel


class TaxRate(AuditableModel):
    """Tax rate configuration (GST, WHT, etc.)"""
    
    __tablename__ = "tax_rates"
    
    tax_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rate_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    tax_type: Mapped[str] = mapped_column(String(20), nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    
    __table_args__ = (
        CheckConstraint('rate_percent >= 0 AND rate_percent <= 100', name='chk_tax_rate_range'),
        CheckConstraint(
            'tax_type IN (\'sales_tax\', \'input_tax\', \'wht\', \'federal_excise\')',
            name='chk_tax_type_valid'
        ),
    )


class TaxReturn(AuditableModel):
    """Monthly/quarterly tax return filing"""
    
    __tablename__ = "tax_returns"
    
    return_period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    return_period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    output_tax_total: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    input_tax_total: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    net_tax_payable: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    filed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    challan_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    challan_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    
    __table_args__ = (
        UniqueConstraint('company_id', 'return_period_month', 'return_period_year', name='uq_tax_return_period'),
        CheckConstraint('return_period_month >= 1 AND return_period_month <= 12', name='chk_period_month_valid'),
        CheckConstraint('return_period_year >= 2020', name='chk_period_year_valid'),
        CheckConstraint(
            'status IN (\'draft\', \'filed\', \'paid\')',
            name='chk_tax_return_status_valid'
        ),
    )


class WHTTransaction(AuditableModel):
    """Withholding Tax transaction record"""
    
    __tablename__ = "wht_transactions"
    
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    party_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), nullable=False)
    party_type: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    wht_category: Mapped[str] = mapped_column(String(50), nullable=False)
    wht_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    wht_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    challan_id: Mapped[Optional[UUID_TYPE]] = mapped_column(UUID(as_uuid=True), ForeignKey("tax_returns.id"), nullable=True)
    is_filer: Mapped[bool] = mapped_column(default=True)
    
    __table_args__ = (
        CheckConstraint('amount >= 0', name='chk_wht_amount_positive'),
        CheckConstraint('wht_rate >= 0 AND wht_rate <= 100', name='chk_wht_rate_range'),
        CheckConstraint('wht_amount >= 0', name='chk_wht_amount_deducted_positive'),
        CheckConstraint(
            'party_type IN (\'customer\', \'vendor\')',
            name='chk_wht_party_type_valid'
        ),
    )
