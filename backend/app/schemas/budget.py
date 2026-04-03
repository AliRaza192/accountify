"""Budget schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class BudgetLineCreate(BaseModel):
    account_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    jan: float = 0
    feb: float = 0
    mar: float = 0
    apr: float = 0
    may: float = 0
    jun: float = 0
    jul: float = 0
    aug: float = 0
    sep: float = 0
    oct: float = 0
    nov: float = 0
    dec: float = 0
    notes: Optional[str] = None


class BudgetCreate(BaseModel):
    fiscal_year: int = Field(..., ge=2000, le=2100)
    name: str = Field(..., min_length=1, max_length=100)
    branch_id: Optional[int] = None
    lines: List[BudgetLineCreate] = Field(default_factory=list)


class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None


class BudgetLineResponse(BaseModel):
    id: int
    budget_id: int
    account_id: Optional[int]
    cost_center_id: Optional[int]
    jan: float
    feb: float
    mar: float
    apr: float
    may: float
    jun: float
    jul: float
    aug: float
    sep: float
    oct: float
    nov: float
    dec: float
    total: float
    notes: Optional[str]

    class Config:
        from_attributes = True


class BudgetResponse(BaseModel):
    id: int
    company_id: int
    branch_id: Optional[int]
    fiscal_year: int
    name: str
    status: str
    total_amount: Optional[float]
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    created_by: Optional[str]
    created_at: datetime
    lines: Optional[List[BudgetLineResponse]] = None

    class Config:
        from_attributes = True


class BudgetVsActualLine(BaseModel):
    account_id: Optional[int]
    account_code: Optional[str]
    budgeted: float
    actual: float
    variance: float
    variance_percent: float


class BudgetVsActualResponse(BaseModel):
    budget_id: int
    budget_name: str
    fiscal_year: int
    lines: List[BudgetVsActualLine]
    summary: dict
