"""
Fixed Assets Pydantic Schemas
For API request/response validation
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from app.schemas.base import AuditableSchema, CompanyBaseSchema


# ============ Asset Category Schemas ============

class AssetCategoryBase(CompanyBaseSchema):
    """Base schema for asset category"""
    name: str = Field(..., min_length=1, max_length=100)
    depreciation_rate_percent: Decimal = Field(..., ge=0, le=100)
    depreciation_method: str = Field(..., pattern="^(SLM|WDV)$")
    account_code: str = Field(..., min_length=1, max_length=20)
    is_active: bool = True


class AssetCategoryCreate(AssetCategoryBase):
    """Schema for creating asset category"""
    pass


class AssetCategoryUpdate(BaseModel):
    """Schema for updating asset category"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    depreciation_rate_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    depreciation_method: Optional[str] = Field(None, pattern="^(SLM|WDV)$")
    account_code: Optional[str] = Field(None, min_length=1, max_length=20)
    is_active: Optional[bool] = None


class AssetCategoryResponse(AuditableSchema):
    """Schema for asset category response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    name: str
    depreciation_rate_percent: Decimal
    depreciation_method: str
    account_code: str
    is_active: bool


# ============ Fixed Asset Schemas ============

class FixedAssetBase(CompanyBaseSchema):
    """Base schema for fixed asset"""
    asset_code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=200)
    category_id: UUID
    purchase_date: date
    purchase_cost: Decimal = Field(..., gt=0)
    useful_life_months: int = Field(..., gt=0)
    residual_value_percent: Decimal = Field(default=10.0, ge=0, le=100)
    depreciation_method: str = Field(..., pattern="^(SLM|WDV)$")
    location: Optional[str] = Field(None, max_length=100)
    status: str = Field(default="active", pattern="^(active|disposed|sold|fully_depreciated)$")
    photo_url: Optional[str] = Field(None, max_length=500)
    document_urls: List[str] = Field(default_factory=list)


class FixedAssetCreate(FixedAssetBase):
    """Schema for creating fixed asset"""
    pass


class FixedAssetUpdate(BaseModel):
    """Schema for updating fixed asset"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    category_id: Optional[UUID] = None
    purchase_date: Optional[date] = None
    purchase_cost: Optional[Decimal] = Field(None, gt=0)
    useful_life_months: Optional[int] = Field(None, gt=0)
    residual_value_percent: Optional[Decimal] = Field(None, ge=0, le=100)
    depreciation_method: Optional[str] = Field(None, pattern="^(SLM|WDV)$")
    location: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, pattern="^(active|disposed|sold|fully_depreciated)$")
    photo_url: Optional[str] = Field(None, max_length=500)
    document_urls: Optional[List[str]] = None


class FixedAssetResponse(AuditableSchema):
    """Schema for fixed asset response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    asset_code: str
    name: str
    category_id: UUID
    category: Optional[AssetCategoryResponse] = None
    purchase_date: date
    purchase_cost: Decimal
    useful_life_months: int
    residual_value_percent: Decimal
    depreciation_method: str
    location: Optional[str]
    status: str
    photo_url: Optional[str]
    document_urls: List[str]
    
    # Calculated fields
    residual_value: Optional[Decimal] = None
    depreciable_amount: Optional[Decimal] = None
    accumulated_depreciation: Optional[Decimal] = None
    book_value: Optional[Decimal] = None


class FixedAssetWithDepreciation(FixedAssetResponse):
    """Fixed asset with depreciation summary"""
    total_depreciation: Optional[Decimal] = None
    last_depreciation_date: Optional[date] = None
    next_depreciation_due: Optional[date] = None


# ============ Asset Depreciation Schemas ============

class AssetDepreciationBase(BaseModel):
    """Base schema for asset depreciation"""
    asset_id: UUID
    period_month: int = Field(..., ge=1, le=12)
    period_year: int = Field(..., ge=2020)
    depreciation_amount: Decimal = Field(..., ge=0)


class AssetDepreciationCreate(AssetDepreciationBase):
    """Schema for creating depreciation record"""
    pass


class AssetDepreciationRun(BaseModel):
    """Schema for running monthly depreciation"""
    period_month: int = Field(..., ge=1, le=12)
    period_year: int = Field(..., ge=2020)
    asset_id: Optional[UUID] = None  # If null, run for all assets


class AssetDepreciationResponse(BaseModel):
    """Schema for depreciation response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    asset_id: UUID
    period_month: int
    period_year: int
    depreciation_amount: Decimal
    accumulated_depreciation: Decimal
    book_value: Decimal
    journal_entry_id: UUID
    posted_at: date


# ============ Asset Maintenance Schemas ============

class AssetMaintenanceBase(CompanyBaseSchema):
    """Base schema for asset maintenance"""
    asset_id: UUID
    service_date: date
    service_type: str = Field(..., min_length=1, max_length=100)
    service_provider: Optional[str] = Field(None, max_length=200)
    cost: Decimal = Field(..., ge=0)
    next_service_due: Optional[date] = None
    notes: Optional[str] = None


class AssetMaintenanceCreate(AssetMaintenanceBase):
    """Schema for creating maintenance record"""
    pass


class AssetMaintenanceResponse(BaseModel):
    """Schema for maintenance response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    asset_id: UUID
    service_date: date
    service_type: str
    service_provider: Optional[str]
    cost: Decimal
    next_service_due: Optional[date]
    notes: Optional[str]
    created_at: date


# ============ Report Schemas ============

class FixedAssetRegisterItem(BaseModel):
    """Item in Fixed Asset Register report"""
    asset_code: str
    name: str
    category: str
    purchase_date: date
    purchase_cost: Decimal
    accumulated_depreciation: Decimal
    book_value: Decimal
    status: str
    location: Optional[str]


class DepreciationScheduleItem(BaseModel):
    """Item in depreciation schedule report"""
    period: str
    opening_book_value: Decimal
    depreciation_amount: Decimal
    accumulated_depreciation: Decimal
    closing_book_value: Decimal


class AssetDisposalRequest(BaseModel):
    """Request for asset disposal"""
    disposal_date: date
    sale_proceeds: Decimal = Field(default=0, ge=0)
    disposal_reason: str


class AssetDisposalResponse(BaseModel):
    """Response for asset disposal"""
    asset_id: UUID
    asset_code: str
    asset_name: str
    disposal_date: date
    sale_proceeds: Decimal
    book_value_at_disposal: Decimal
    gain_or_loss: Decimal  # Positive = gain, Negative = loss
    journal_entry_id: UUID
