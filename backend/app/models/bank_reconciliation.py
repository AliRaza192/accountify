"""
Bank Reconciliation SQLAlchemy Models
Tables: bank_accounts, bank_statements, reconciliation_sessions, pdcs
"""

from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import date
from decimal import Decimal
from typing import Optional, List
from uuid import UUID as UUID_TYPE

from app.models.base import AuditableModel


class BankAccount(AuditableModel):
    """Bank account configuration"""
    
    __tablename__ = "bank_accounts"
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number: Mapped[str] = mapped_column(String(50), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    branch: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    iban: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="PKR")
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
    
    # Relationships
    statements: Mapped[List["BankStatement"]] = relationship(back_populates="account", cascade="all, delete-orphan")
    reconciliation_sessions: Mapped[List["ReconciliationSession"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        UniqueConstraint('company_id', 'account_number', name='uq_bank_accounts_company_account'),
    )


class BankStatement(AuditableModel):
    """Imported bank statement"""
    
    __tablename__ = "bank_statements"
    
    bank_account_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=False)
    statement_date: Mapped[date] = mapped_column(Date, nullable=False)
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    closing_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    transactions_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    imported_at: Mapped[date] = mapped_column(default=date.today)
    imported_by: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=False)
    
    # Relationships
    account: Mapped["BankAccount"] = relationship(back_populates="statements")
    
    __table_args__ = (
        CheckConstraint('opening_balance >= 0', name='chk_statement_opening_balance_positive'),
        CheckConstraint('closing_balance >= 0', name='chk_statement_closing_balance_positive'),
    )


class ReconciliationSession(AuditableModel):
    """Bank reconciliation session"""
    
    __tablename__ = "reconciliation_sessions"
    
    bank_account_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    closing_balance_per_bank: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    closing_balance_per_books: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    reconciled_transactions: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    difference: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="in_progress")
    completed_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    completed_by: Mapped[Optional[UUID_TYPE]] = mapped_column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=True)
    
    # Relationships
    account: Mapped["BankAccount"] = relationship(back_populates="reconciliation_sessions")
    
    __table_args__ = (
        UniqueConstraint('company_id', 'bank_account_id', 'period_month', 'period_year', name='uq_reconciliation_period'),
        CheckConstraint('period_month >= 1 AND period_month <= 12', name='chk_reconciliation_month_valid'),
        CheckConstraint('period_year >= 2020', name='chk_reconciliation_year_valid'),
        CheckConstraint(
            'status IN (\'in_progress\', \'completed\', \'cancelled\')',
            name='chk_reconciliation_status_valid'
        ),
    )


class PDC(AuditableModel):
    """Post-Dated Cheque"""
    
    __tablename__ = "pdcs"
    
    cheque_number: Mapped[str] = mapped_column(String(20), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    cheque_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    party_type: Mapped[str] = mapped_column(String(10), nullable=False)
    party_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    deposited_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    cleared_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    bounced_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    bounce_reason: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    payment_id: Mapped[Optional[UUID_TYPE]] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)
    
    __table_args__ = (
        CheckConstraint('amount > 0', name='chk_pdc_amount_positive'),
        CheckConstraint(
            'party_type IN (\'customer\', \'vendor\')',
            name='chk_pdc_party_type_valid'
        ),
        CheckConstraint(
            'status IN (\'pending\', \'deposited\', \'cleared\', \'bounced\', \'returned\')',
            name='chk_pdc_status_valid'
        ),
    )
