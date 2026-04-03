"""Approval schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ApprovalLevel(BaseModel):
    level: int
    approver_role: str
    approver_email: Optional[str] = None


class ApprovalWorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    module: str = Field(..., min_length=1, max_length=50)
    condition_amount: Optional[float] = None
    condition_operator: str = Field(default=">", pattern="^(>|>=|<|<=|==)$")
    levels: List[ApprovalLevel] = Field(default_factory=list)
    is_active: bool = True


class ApprovalWorkflowResponse(BaseModel):
    id: int
    company_id: int
    name: str
    module: str
    condition_amount: Optional[float]
    condition_operator: str
    levels_json: list
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApprovalRequestResponse(BaseModel):
    id: int
    company_id: int
    workflow_id: int
    document_type: str
    document_id: int
    status: str
    current_level: int
    requested_by: str
    requested_at: datetime
    completed_at: Optional[datetime]
    completed_by: Optional[str]

    class Config:
        from_attributes = True


class ApprovalActionResponse(BaseModel):
    id: int
    request_id: int
    level: int
    action: str
    actioned_by: str
    comments: Optional[str]
    actioned_at: datetime
    delegated_to: Optional[str]

    class Config:
        from_attributes = True


class ApprovalAction(BaseModel):
    comments: Optional[str] = None
    delegate_to: Optional[str] = None
