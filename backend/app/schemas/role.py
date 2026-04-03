"""RBAC schemas for request/response validation"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class PermissionSchema(BaseModel):
    """Permission structure"""
    modules: List[str] = []
    actions: Dict[str, List[str]] = {}


class RoleCreate(BaseModel):
    """Schema for creating a role"""
    name: str = Field(..., min_length=1, max_length=100)
    permissions: PermissionSchema = PermissionSchema()
    is_system: bool = False


class RoleUpdate(BaseModel):
    """Schema for updating a role"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    permissions: Optional[PermissionSchema] = None


class RoleResponse(BaseModel):
    """Schema for role response"""
    id: int
    company_id: Optional[int]
    name: str
    permissions_json: Dict[str, Any]
    is_system: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserRoleAssign(BaseModel):
    """Schema for assigning role to user"""
    role_id: int
    branch_id: Optional[int] = None
    is_primary: bool = False


class UserRoleResponse(BaseModel):
    """Schema for user role assignment response"""
    id: int
    user_id: str
    role_id: int
    role_name: str
    branch_id: Optional[int]
    branch_name: Optional[str]
    is_primary: bool
    assigned_at: datetime

    class Config:
        from_attributes = True


class UserPermissionsResponse(BaseModel):
    """Schema for user's effective permissions"""
    user_id: str
    roles: List[UserRoleResponse]
    effective_permissions: PermissionSchema


class LoginHistoryResponse(BaseModel):
    """Schema for login history"""
    id: int
    user_id: str
    ip_address: str
    user_agent: Optional[str]
    status: str
    failure_reason: Optional[str]
    login_at: datetime
    logout_at: Optional[datetime]

    class Config:
        from_attributes = True


class OTPSendRequest(BaseModel):
    """Schema for sending OTP"""
    user_id: str


class OTPVerifyRequest(BaseModel):
    """Schema for verifying OTP"""
    user_id: str
    otp: str = Field(..., min_length=6, max_length=6)


class OTPResponse(BaseModel):
    """Schema for OTP response"""
    success: bool
    message: str
    expires_in: Optional[int] = None
