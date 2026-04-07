"""
Tax Management Pydantic Schemas
For API request/response validation
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from app.schemas.base import AuditableSchema, CompanyBaseSchema


# ============ Tax Rate Schemas ============

class TaxRateBase(CompanyBaseSchema):
    """Base schema for tax rate"""
    tax_name: str = Field(..., min_length=1, max_length=100)
    rate_percent: Decimal = Field(..., ge=0)
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
    rate_percent: Optional[Decimal] = Field(None, ge=0)
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
    net_tax_payable: Decimal = Field(default=0)
    filed_date: Optional[date] = None
    challan_number: Optional[str] = Field(None, max_length=50)
    challan_date: Optional[date] = None
    status: str = Field(default="draft", pattern="^(draft|filed|paid)$")


class TaxReturnCreate(TaxReturnBase):
    """Schema for creating tax return"""
    pass


class TaxReturnUpdate(BaseModel):
    """Schema for updating tax return"""
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


# ============ WHT Transaction Schemas ============

class WHTTransactionBase(CompanyBaseSchema):
    """Base schema for WHT transaction"""
    transaction_date: date
    party_id: UUID
    party_type: str = Field(..., pattern="^(customer|vendor)$")
    amount: Decimal = Field(..., ge=0)
    wht_category: str = Field(..., min_length=1, max_length=50)
    wht_rate: Decimal = Field(..., ge=0)
    wht_amount: Decimal = Field(..., ge=0)
    challan_id: Optional[UUID] = None
    is_filer: bool = True


class WHTTransactionCreate(WHTTransactionBase):
    """Schema for creating WHT transaction"""
    pass


class WHTTransactionResponse(AuditableSchema):
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
    challan_id: Optional[UUID]
    is_filer: bool


class WHTChallanRequest(BaseModel):
    """Request for generating WHT challan"""
    period_month: int = Field(..., ge=1, le=12)
    period_year: int = Field(..., ge=2020)
    wht_categories: Optional[List[str]] = None


class WHTChallanResponse(BaseModel):
    """Response for WHT challan generation"""
    challan_number: str
    period_month: int
    period_year: int
    total_wht: Decimal
    categories: List[str]
    transaction_ids: List[UUID]
    generated_at: datetime


# ============ NTN Verification Schemas ============

class NTNVerificationRequest(BaseModel):
    """Request for NTN/STRN verification"""
    ntn: str = Field(..., pattern=r"^\d{7}-\d{1}$")
    strn: Optional[str] = Field(None, pattern=r"^\d{13}$")
    verified_by_user: bool = True


class NTNVerificationResponse(BaseModel):
    """Response for NTN/STRN verification"""
    verified: bool
    ntn: str
    strn: Optional[str]
    verification_timestamp: datetime


# ============ Report Schemas ============

class TaxableInvoiceItem(BaseModel):
    """Item in taxable sales/purchases list"""
    invoice_number: str
    party_name: str
    party_ntn: Optional[str]
    taxable_amount: Decimal
    tax_amount: Decimal
    transaction_date: date


class SalesTaxReturnReport(BaseModel):
    """Sales Tax Return report in SRB/FBR format"""
    return_period: str
    output_tax_total: Decimal
    input_tax_total: Decimal
    net_tax_payable: Decimal
    taxable_sales: List[TaxableInvoiceItem]
    taxable_purchases: List[TaxableInvoiceItem]


class InputOutputTaxReport(BaseModel):
    """Input/Output Tax Reconciliation Report"""
    period: str
    total_output_tax: Decimal
    total_input_tax: Decimal
    net_tax_payable: Decimal
    output_tax_details: List[TaxableInvoiceItem]
    input_tax_details: List[TaxableInvoiceItem]


class WHTSummaryReport(BaseModel):
    """WHT Summary Report by category"""
    period: str
    categories: List[dict]  # {category: str, total_amount: Decimal, total_wht: Decimal, count: int}
    grand_total_wht: Decimal
