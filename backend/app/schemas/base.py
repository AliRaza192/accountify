"""
Base Pydantic Schema for Accountify
Provides common fields for all schemas (company_id, timestamps)
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID


class BaseSchema(BaseModel):
    """Base schema with common fields"""
    model_config = ConfigDict(from_attributes=True)


class CompanyBaseSchema(BaseSchema):
    """Base schema with company_id for multi-tenancy"""
    company_id: UUID = Field(..., description="Company ID for data segregation")


class TimestampSchema(BaseSchema):
    """Schema with timestamp fields"""
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class AuditableSchema(CompanyBaseSchema, TimestampSchema):
    """Base schema with company_id and timestamps for audit trail"""
    created_by: Optional[UUID] = Field(None, description="User who created the record")
    updated_by: Optional[UUID] = Field(None, description="User who last updated the record")


# Response schemas inherit from AuditableSchema
# Create/Update schemas inherit from CompanyBaseSchema
