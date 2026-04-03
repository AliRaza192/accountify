"""Roles Router for RBAC management"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import logging

from app.database import get_db
from app.schemas.role import (
    RoleCreate, RoleUpdate, RoleResponse, UserRoleAssign,
    UserRoleResponse, UserPermissionsResponse, PermissionSchema
)
from app.services.role_service import RoleService
from app.routers.auth import get_current_user
from app.types import User
from app.models.role import UserRole, Role
from app.models.auth import LoginHistory

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== USER MANAGEMENT ====================

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str = "User"
    branch_id: Optional[str] = None
    is_active: bool = True
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InviteUserRequest(BaseModel):
    email: str = Field(..., min_length=1)
    full_name: str = Field(..., min_length=1)
    role_id: str
    branch_id: Optional[str] = None


class UpdateUserRoleRequest(BaseModel):
    role_id: str


@router.get("/users", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users in the company"""
    # Get all user profiles in the company
    from supabase import Client
    from app.database import supabase

    profiles = supabase.table("user_profiles").select(
        "id, full_name, company_id, created_at"
    ).eq("company_id", str(current_user.company_id)).execute()

    users = []
    for profile in profiles.data or []:
        # Get user's role
        user_role = db.query(UserRole).filter(
            UserRole.user_id == profile["id"]
        ).first()
        role_name = "User"
        if user_role and user_role.role:
            role_name = user_role.role.name

        # Get last login
        last_login_entry = db.query(LoginHistory).filter(
            LoginHistory.user_id == profile["id"]
        ).order_by(LoginHistory.created_at.desc()).first()
        last_login = last_login_entry.created_at if last_login_entry else None

        users.append(UserResponse(
            id=profile["id"],
            email="",  # Would need admin API to get email
            full_name=profile.get("full_name", ""),
            role=role_name,
            branch_id=str(user_role.branch_id) if user_role and user_role.branch_id else None,
            is_active=True,
            last_login=last_login,
            created_at=profile.get("created_at") or datetime.now(),
        ))

    return users


@router.post("/users/invite")
def invite_user(
    invite_data: InviteUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a new user to the company"""
    from app.database import supabase

    # Create user via Supabase Admin
    try:
        # Generate a temporary password
        import secrets
        temp_password = secrets.token_urlsafe(12)

        auth_response = supabase.auth.admin.create_user({
            "email": invite_data.email,
            "password": temp_password,
            "email_confirm": True,
            "user_metadata": {"full_name": invite_data.full_name},
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Failed to create user")

        user_id = auth_response.user.id

        # Create user profile
        supabase.table("user_profiles").insert({
            "id": user_id,
            "full_name": invite_data.full_name,
            "company_id": str(current_user.company_id),
        }).execute()

        # Assign role
        if invite_data.role_id:
            role = db.query(Role).filter(Role.id == int(invite_data.role_id)).first()
            if role:
                user_role = UserRole(
                    user_id=user_id,
                    role_id=role.id,
                    branch_id=None,
                    assigned_by=str(current_user.id),
                )
                db.add(user_role)
                db.commit()

        return {"message": f"Invitation sent to {invite_data.email}", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to invite user: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    role_data: UpdateUserRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's role"""
    role = db.query(Role).filter(Role.id == int(role_data.role_id)).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    # Remove existing roles
    db.query(UserRole).filter(UserRole.user_id == user_id).delete()

    # Assign new role
    user_role = UserRole(
        user_id=user_id,
        role_id=role.id,
        assigned_by=str(current_user.id),
    )
    db.add(user_role)
    db.commit()

    return {"message": "Role updated successfully"}


@router.put("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate a user"""
    from app.database import supabase

    try:
        supabase.auth.admin.update_user(user_id, {"ban_duration": "87600h"})
        return {"message": "User deactivated successfully"}
    except Exception as e:
        logger.error(f"Failed to deactivate user: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ==================== ROLE MANAGEMENT ====================


@router.get("", response_model=List[RoleResponse])
def get_roles(
    include_system: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all roles"""
    company_id = current_user.company_id
    roles = RoleService.get_roles(db, company_id, include_system)
    return roles


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get role by ID"""
    role = RoleService.get_role(db, role_id)

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return role


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    role_data: RoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new custom role"""
    company_id = current_user.company_id

    try:
        role = RoleService.create_role(db, company_id, role_data)
        return role
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    role_data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update role permissions"""
    try:
        role = RoleService.update_role(db, role_id, role_data)

        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        return role
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete custom role (cannot delete system roles)"""
    try:
        success = RoleService.delete_role(db, role_id)

        if not success:
            raise HTTPException(status_code=404, detail="Role not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me/permissions", response_model=UserPermissionsResponse)
def get_my_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's permissions"""
    permissions = RoleService.get_user_permissions(db, str(current_user.id))
    user_roles = db.query(UserRole).filter(
        UserRole.user_id == str(current_user.id)
    ).all()

    return UserPermissionsResponse(
        user_id=str(current_user.id),
        roles=[
            UserRoleResponse(
                id=ur.id,
                user_id=ur.user_id,
                role_id=ur.role_id,
                role_name=ur.role.name if ur.role else "Unknown",
                branch_id=ur.branch_id,
                branch_name=None,
                is_primary=ur.is_primary,
                assigned_at=ur.assigned_at
            ) for ur in user_roles
        ],
        effective_permissions=PermissionSchema(**permissions)
    )


@router.post("/users/{user_id}/assign-role", response_model=UserRoleResponse)
def assign_role_to_user(
    user_id: str,
    assignment: UserRoleAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign role to user"""
    try:
        user_role = RoleService.assign_role_to_user(
            db, user_id, assignment.role_id,
            assignment.branch_id, assignment.is_primary,
            str(current_user.id)
        )

        return UserRoleResponse(
            id=user_role.id,
            user_id=user_role.user_id,
            role_id=user_role.role_id,
            role_name=user_role.role.name if user_role.role else "Unknown",
            branch_id=user_role.branch_id,
            branch_name=None,
            is_primary=user_role.is_primary,
            assigned_at=user_role.assigned_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
