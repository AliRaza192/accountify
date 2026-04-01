"""
Bank Reconciliation Pydantic Schemas
For API request/response validation
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID

from app.schemas.base import AuditableSchema, CompanyBaseSchema


# ============ Bank Account Schemas ============

class BankAccountBase(CompanyBaseSchema):
    """Base schema for bank account"""
    name: str = Field(..., min_length=1, max_length=100)
    account_number: str = Field(..., min_length=1, max_length=50)
    bank_name: str = Field(..., min_length=1, max_length=100)
    branch: Optional[str] = Field(None, max_length=100)
    iban: Optional[str] = Field(None, max_length=50)
    currency: str = Field(default="PKR", min_length=3, max_length=3)
    opening_balance: Decimal = Field(default=0, ge=0)
    current_balance: Decimal = Field(default=0)
    is_active: bool = True


class BankAccountCreate(BankAccountBase):
    """Schema for creating bank account"""
    pass


class BankAccountUpdate(BaseModel):
    """Schema for updating bank account"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    account_number: Optional[str] = Field(None, min_length=1, max_length=50)
    bank_name: Optional[str] = Field(None, min_length=1, max_length=100)
    branch: Optional[str] = Field(None, max_length=100)
    iban: Optional[str] = Field(None, max_length=50)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    opening_balance: Optional[Decimal] = Field(None, ge=0)
    current_balance: Optional[Decimal] = None
    is_active: Optional[bool] = None


class BankAccountResponse(AuditableSchema):
    """Schema for bank account response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    name: str
    account_number: str
    bank_name: str
    branch: Optional[str]
    iban: Optional[str]
    currency: str
    opening_balance: Decimal
    current_balance: Decimal
    is_active: bool


# ============ Bank Statement Schemas ============

class BankStatementImport(CompanyBaseSchema):
    """Schema for importing bank statement CSV"""
    bank_account_id: UUID
    statement_date: date
    opening_balance: Decimal
    closing_balance: Decimal
    transactions: List[Dict[str, Any]]


class BankStatementResponse(BaseModel):
    """Schema for bank statement response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    bank_account_id: UUID
    statement_date: date
    opening_balance: Decimal
    closing_balance: Decimal
    transactions_count: int
    imported_at: date
    imported_by: UUID


# ============ Reconciliation Session Schemas ============

class ReconciliationSessionStart(CompanyBaseSchema):
    """Schema for starting reconciliation session"""
    bank_account_id: UUID
    period_month: int = Field(..., ge=1, le=12)
    period_year: int = Field(..., ge=2020)
    opening_balance: Decimal
    closing_balance_per_bank: Decimal


class ReconciliationSessionMatch(BaseModel):
    """Schema for matching transactions"""
    bank_transaction_id: str
    system_transaction_id: UUID
    match_type: str = Field(default="manual", pattern="^(auto|manual)$")


class ReconciliationSessionComplete(BaseModel):
    """Schema for completing reconciliation"""
    notes: Optional[str] = None


class ReconciliationSessionResponse(AuditableSchema):
    """Schema for reconciliation session response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    bank_account_id: UUID
    period_month: int
    period_year: int
    opening_balance: Decimal
    closing_balance_per_bank: Decimal
    closing_balance_per_books: Decimal
    difference: Decimal
    status: str
    completed_at: Optional[date]
    completed_by: Optional[UUID]


class ReconciliationSessionDetail(ReconciliationSessionResponse):
    """Reconciliation session with transactions"""
    bank_transactions: Optional[List[Dict[str, Any]]] = None
    system_transactions: Optional[List[Dict[str, Any]]] = None
    matched_transactions: Optional[List[Dict[str, Any]]] = None


# ============ PDC Schemas ============

class PDCBase(CompanyBaseSchema):
    """Base schema for PDC"""
    cheque_number: str = Field(..., min_length=1, max_length=20)
    bank_name: str = Field(..., min_length=1, max_length=100)
    cheque_date: date
    amount: Decimal = Field(..., gt=0)
    party_type: str = Field(..., pattern="^(customer|vendor)$")
    party_id: UUID
    status: str = Field(default="pending", pattern="^(pending|deposited|cleared|bounced|returned)$")


class PDCCreate(PDCBase):
    """Schema for creating PDC"""
    pass


class PDCUpdateStatus(BaseModel):
    """Schema for updating PDC status"""
    status: str = Field(..., pattern="^(pending|deposited|cleared|bounced|returned)$")
    bounce_reason: Optional[str] = Field(None, max_length=200)


class PDCResponse(BaseModel):
    """Schema for PDC response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    cheque_number: str
    bank_name: str
    cheque_date: date
    amount: Decimal
    party_type: str
    party_id: UUID
    status: str
    deposited_at: Optional[date]
    cleared_at: Optional[date]
    bounced_at: Optional[date]
    bounce_reason: Optional[str]
    payment_id: Optional[UUID]
    created_at: date
    updated_at: date


class PDCMaturityItem(BaseModel):
    """PDC maturity report item"""
    id: UUID
    cheque_number: str
    party_name: str
    party_type: str
    amount: Decimal
    cheque_date: date
    days_until_maturity: int
    status: str


# ============ Cash Position Schema ============

class CashPositionSummary(BaseModel):
    """Cash position summary"""
    total_cash_in_hand: Decimal
    total_cash_at_bank: Decimal
    total_pdc_receivable: Decimal
    total_pdc_payable: Decimal
    net_cash_position: Decimal
    bank_accounts: List[Dict[str, Any]]
