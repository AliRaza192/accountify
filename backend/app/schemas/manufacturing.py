"""Manufacturing schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date


class BOMLineSchema(BaseModel):
    component_id: int
    quantity: float
    unit: str
    waste_percent: float = 0
    sequence: int = 0


class BOMCreate(BaseModel):
    product_id: int
    version: int
    effective_date: Optional[date] = None
    notes: Optional[str] = None
    lines: List[BOMLineSchema]


class ProductionOrderCreate(BaseModel):
    bom_id: int
    quantity: float
    cost_center_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    labor_rate: Optional[float] = None
    notes: Optional[str] = None


class MaterialIssueSchema(BaseModel):
    product_id: int
    quantity: float


class ProductionOutputSchema(BaseModel):
    product_id: int
    quantity: float
    actual_hours: Optional[float] = None


class ScrapRecordSchema(BaseModel):
    product_id: int
    quantity: float
    reason: Optional[str] = None


class BOMResponse(BaseModel):
    id: int
    product_id: int
    version: int
    status: str
    effective_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


class ProductionOrderResponse(BaseModel):
    id: int
    bom_id: int
    quantity: float
    status: str
    start_date: Optional[date]
    end_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True
