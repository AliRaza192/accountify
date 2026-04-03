"""Branch schemas"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BranchCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_default: bool = False


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class BranchSettingsSchema(BaseModel):
    price_list_id: Optional[int] = None
    tax_rate: int = 0
    currency: str = "PKR"
    fiscal_year_start: str = "01-01"


class BranchResponse(BaseModel):
    id: int
    company_id: int
    name: str
    code: str
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    is_default: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BranchTransferRequest(BaseModel):
    source_branch_id: int
    destination_branch_id: int
    items: list[dict]
    notes: Optional[str] = None
