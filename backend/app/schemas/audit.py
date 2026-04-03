"""Audit log schemas"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class AuditLogResponse(BaseModel):
    """Schema for audit log entry response"""
    id: int
    company_id: int
    user_id: str
    user_name: Optional[str] = None
    action: str
    table_name: str
    record_id: int
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogQueryParams(BaseModel):
    """Query parameters for audit log search"""
    user_id: Optional[str] = None
    table_name: Optional[str] = None
    record_id: Optional[int] = None
    action: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)
