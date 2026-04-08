"""
Project Costing Pydantic Schemas
For API request/response validation
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from app.schemas.base import AuditableSchema, CompanyBaseSchema


# ============ Project Schemas ============

class ProjectBase(CompanyBaseSchema):
    """Base schema for project"""
    project_code: str = Field(..., min_length=1, max_length=20)
    project_name: str = Field(..., min_length=1, max_length=200)
    client_id: Optional[UUID] = None
    start_date: date
    end_date: Optional[date] = None
    budget: Decimal = Field(default=0, ge=0)
    status: str = Field(default="active", pattern="^(active|on_hold|completed|cancelled)$")
    manager_id: Optional[UUID] = None
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    """Schema for creating project"""
    pass


class ProjectUpdate(BaseModel):
    """Schema for updating project"""
    project_name: Optional[str] = Field(None, min_length=1, max_length=200)
    client_id: Optional[UUID] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern="^(active|on_hold|completed|cancelled)$")
    manager_id: Optional[UUID] = None
    description: Optional[str] = None


class ProjectResponse(AuditableSchema):
    """Schema for project response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_code: str
    project_name: str
    client_id: Optional[UUID]
    start_date: date
    end_date: Optional[date]
    budget: Decimal
    status: str
    manager_id: Optional[UUID]
    description: Optional[str]


# ============ Project Phase Schemas ============

class ProjectPhaseBase(CompanyBaseSchema):
    """Base schema for project phase"""
    project_id: UUID
    phase_name: str = Field(..., min_length=1, max_length=100)
    start_date: date
    end_date: Optional[date] = None
    budget_allocated: Decimal = Field(default=0, ge=0)
    completion_pct: int = Field(default=0, ge=0, le=100)


class ProjectPhaseCreate(ProjectPhaseBase):
    """Schema for creating project phase"""
    pass


class ProjectPhaseUpdate(BaseModel):
    """Schema for updating project phase"""
    phase_name: Optional[str] = Field(None, min_length=1, max_length=100)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_allocated: Optional[Decimal] = Field(None, ge=0)
    completion_pct: Optional[int] = Field(None, ge=0, le=100)


class ProjectPhaseResponse(AuditableSchema):
    """Schema for project phase response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    phase_name: str
    start_date: date
    end_date: Optional[date]
    budget_allocated: Decimal
    completion_pct: int


# ============ Project Cost Schemas ============

class ProjectCostBase(CompanyBaseSchema):
    """Base schema for project cost"""
    project_id: UUID
    phase_id: Optional[UUID] = None
    cost_source_type: str = Field(..., pattern="^(invoice|expense|payroll|journal|inventory)$")
    cost_source_id: UUID
    amount: Decimal = Field(..., ge=0)
    cost_category: str = Field(..., min_length=1, max_length=50)
    allocated_date: date
    description: Optional[str] = None


class ProjectCostCreate(ProjectCostBase):
    """Schema for creating project cost"""
    pass


class ProjectCostResponse(AuditableSchema):
    """Schema for project cost response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    phase_id: Optional[UUID]
    cost_source_type: str
    cost_source_id: UUID
    amount: Decimal
    cost_category: str
    allocated_date: date
    description: Optional[str]


# ============ Project Revenue Schemas ============

class ProjectRevenueBase(CompanyBaseSchema):
    """Base schema for project revenue"""
    project_id: UUID
    invoice_id: Optional[UUID] = None
    amount: Decimal = Field(..., ge=0)
    recognized_date: date
    description: Optional[str] = None


class ProjectRevenueCreate(ProjectRevenueBase):
    """Schema for creating project revenue"""
    pass


class ProjectRevenueResponse(AuditableSchema):
    """Schema for project revenue response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    invoice_id: Optional[UUID]
    amount: Decimal
    recognized_date: date
    description: Optional[str]


# ============ Report Schemas ============

class ProjectProfitabilityReport(BaseModel):
    """Project Profitability Report"""
    project_id: UUID
    project_code: str
    project_name: str
    client_name: Optional[str]
    budget: Decimal
    total_revenue: Decimal
    total_costs: Decimal
    gross_profit: Decimal
    profit_margin_pct: Decimal
    phase_breakdown: List[dict]
    cost_category_breakdown: List[dict]


class BudgetVsActualReport(BaseModel):
    """Budget vs Actual Report for Project"""
    project_id: UUID
    project_code: str
    project_name: str
    budget_total: Decimal
    actual_total: Decimal
    variance: Decimal
    variance_pct: Decimal
    phase_breakdown: List[dict]


class CostAllocationRequest(BaseModel):
    """Request for allocating cost to project"""
    phase_id: Optional[UUID] = None
    cost_source_type: str = Field(..., pattern="^(invoice|expense|payroll|journal|inventory)$")
    cost_source_id: UUID
    amount: Decimal = Field(..., ge=0)
    cost_category: str = Field(..., min_length=1, max_length=50)
    allocated_date: Optional[date] = None
    description: Optional[str] = None
