"""
Tax Management Pydantic Schemas
For API request/response validation
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID

from app.schemas.base import AuditableSchema, CompanyBaseSchema


# ============ Tax Rate Schemas ============

class TaxRateBase(CompanyBaseSchema):
    """Base schema for tax rate"""
    tax_name: str = Field(..., min_length=1, max_length=100)
    rate_percent: Decimal = Field(..., ge=0, le=100)
    tax_type: str = Field(..., pattern="^(sales_tax|input_tax|wht|federal_excise)$")
    effective_date: date
    end_date: Optional[date] = None
    is_active: bool = True


class TaxRateCreate(TaxRateBase):
    """Schema for creating tax rate"""
    pass


class TaxRateUpdate(BaseModel):
    """Schema for updating tax rate"""
    tax_name: Optional[str] = Field(None, min_length=1, max_length=100)
    rate_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    tax_type: Optional[str] = Field(None, pattern="^(sales_tax|input_tax|wht|federal_excise)$")
    effective_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class TaxRateResponse(AuditableSchema):
    """Schema for tax rate response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    tax_name: str
    rate_percent: Decimal
    tax_type: str
    effective_date: date
    end_date: Optional[date]
    is_active: bool


# ============ Tax Return Schemas ============

class TaxReturnBase(CompanyBaseSchema):
    """Base schema for tax return"""
    return_period_month: int = Field(..., ge=1, le=12)
    return_period_year: int = Field(..., ge=2020)
    output_tax_total: Decimal = Field(default=0, ge=0)
    input_tax_total: Decimal = Field(default=0, ge=0)
    net_tax_payable: Decimal
    filed_date: Optional[date] = None
    challan_number: Optional[str] = Field(None, max_length=50)
    challan_date: Optional[date] = None
    status: str = Field(default="draft", pattern="^(draft|filed|paid)$")


class TaxReturnCreate(TaxReturnBase):
    """Schema for creating tax return"""
    pass


class TaxReturnGenerate(BaseModel):
    """Schema for auto-generating tax return"""
    return_period_month: int = Field(..., ge=1, le=12)
    return_period_year: int = Field(..., ge=2020)


class TaxReturnUpdate(BaseModel):
    """Schema for updating tax return"""
    output_tax_total: Optional[Decimal] = None
    input_tax_total: Optional[Decimal] = None
    net_tax_payable: Optional[Decimal] = None
    filed_date: Optional[date] = None
    challan_number: Optional[str] = Field(None, max_length=50)
    challan_date: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(draft|filed|paid)$")


class TaxReturnResponse(AuditableSchema):
    """Schema for tax return response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    return_period_month: int
    return_period_year: int
    output_tax_total: Decimal
    input_tax_total: Decimal
    net_tax_payable: Decimal
    filed_date: Optional[date]
    challan_number: Optional[str]
    challan_date: Optional[date]
    status: str


class TaxReturnDetail(TaxReturnResponse):
    """Tax return with breakdown"""
    output_tax_items: Optional[List[Dict[str, Any]]] = None
    input_tax_items: Optional[List[Dict[str, Any]]] = None


# ============ WHT Transaction Schemas ============

class WHTTransactionBase(CompanyBaseSchema):
    """Base schema for WHT transaction"""
    transaction_date: date
    party_id: UUID
    party_type: str = Field(..., pattern="^(customer|vendor)$")
    amount: Decimal = Field(..., ge=0)
    wht_category: str = Field(..., min_length=1, max_length=50)
    wht_rate: Decimal = Field(..., ge=0, le=100)
    wht_amount: Decimal = Field(..., ge=0)
    is_filer: bool = True
    challan_id: Optional[UUID] = None


class WHTTransactionCreate(WHTTransactionBase):
    """Schema for creating WHT transaction"""
    pass


class WHTTransactionResponse(BaseModel):
    """Schema for WHT transaction response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    transaction_date: date
    party_id: UUID
    party_type: str
    amount: Decimal
    wht_category: str
    wht_rate: Decimal
    wht_amount: Decimal
    is_filer: bool
    challan_id: Optional[UUID]
    created_at: date


class WHTSummary(BaseModel):
    """WHT summary by category"""
    category: str
    total_amount: Decimal
    total_wht: Decimal
    transaction_count: int


# ============ Tax Report Schemas ============

class TaxSummary(BaseModel):
    """Tax dashboard summary"""
    period: str
    output_tax: Decimal
    input_tax: Decimal
    net_payable: Decimal
    wht_deducted: Decimal
    returns_filed: int
    returns_pending: int


class OutputTaxItem(BaseModel):
    """Output tax line item"""
    invoice_number: str
    customer_name: str
    customer_ntn: Optional[str]
    taxable_amount: Decimal
    tax_amount: Decimal
    date: date


class InputTaxItem(BaseModel):
    """Input tax line item"""
    bill_number: str
    vendor_name: str
    vendor_ntn: Optional[str]
    taxable_amount: Decimal
    tax_amount: Decimal
    date: date


class TaxReconciliationReport(BaseModel):
    """Tax reconciliation report"""
    period: str
    opening_balance: Decimal
    output_tax: Decimal
    input_tax: Decimal
    wht_paid: Decimal
    closing_balance: Decimal
