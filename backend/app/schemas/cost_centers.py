"""
Cost Centers Pydantic Schemas
For API request/response validation
"""

from pydantic import BaseModel, Field, ConfigDict
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID

from app.schemas.base import AuditableSchema, CompanyBaseSchema


# ============ Cost Center Schemas ============

class CostCenterBase(CompanyBaseSchema):
    """Base schema for cost center"""
    code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: str = Field(default="active", pattern="^(active|inactive)$")
    overhead_allocation_rule: Optional[Dict[str, Any]] = None


class CostCenterCreate(CostCenterBase):
    """Schema for creating cost center"""
    pass


class CostCenterUpdate(BaseModel):
    """Schema for updating cost center"""
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = Field(None, pattern="^(active|inactive)$")
    overhead_allocation_rule: Optional[Dict[str, Any]] = None


class CostCenterResponse(AuditableSchema):
    """Schema for cost center response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    code: str
    name: str
    description: Optional[str]
    status: str
    overhead_allocation_rule: Optional[Dict[str, Any]]


# ============ Cost Center Allocation Schemas ============

class CostCenterAllocationBase(CompanyBaseSchema):
    """Base schema for cost center allocation"""
    cost_center_id: UUID
    transaction_type: str = Field(..., min_length=1, max_length=20)
    transaction_id: UUID
    amount: Decimal = Field(..., ge=0)
    allocation_percent: Decimal = Field(default=100.0, ge=0, le=100)


class CostCenterAllocationCreate(CostCenterAllocationBase):
    """Schema for creating allocation"""
    pass


class CostCenterAllocationResponse(BaseModel):
    """Schema for allocation response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    cost_center_id: UUID
    transaction_type: str
    transaction_id: UUID
    amount: Decimal
    allocation_percent: Decimal
    created_at: str


# ============ P&L Report Schemas ============

class DepartmentPLItem(BaseModel):
    """Item in department P&L report"""
    account_code: str
    account_name: str
    account_type: str
    debit: Decimal
    credit: Decimal
    net: Decimal


class DepartmentPLReport(BaseModel):
    """Department P&L report"""
    cost_center_id: UUID
    cost_center_code: str
    cost_center_name: str
    period: str
    revenue: Decimal
    direct_expenses: Decimal
    gross_profit: Decimal
    allocated_overhead: Decimal
    net_profit: Decimal
    line_items: List[DepartmentPLItem]


# ============ Allocation Request Schemas ============

class OverheadAllocationRequest(BaseModel):
    """Request to allocate overhead to cost centers"""
    source_account_code: str
    amount: Decimal = Field(..., gt=0)
    allocation_type: str = Field(..., pattern="^(percentage|equal_split|by_headcount|by_area)$")
    cost_center_ids: List[UUID]
    percentages: Optional[List[Decimal]] = None  # For percentage type


class OverheadAllocationResponse(BaseModel):
    """Response for overhead allocation"""
    allocations_created: int
    total_allocated: Decimal
    cost_centers: List[Dict[str, Any]]
