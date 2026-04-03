"""Roles Router for RBAC management"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.role import (
    RoleCreate, RoleUpdate, RoleResponse, UserRoleAssign,
    UserRoleResponse, UserPermissionsResponse, PermissionSchema
)
from app.services.role_service import RoleService
from app.middleware.rbac import require_permission, require_auth, get_current_user_id

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=List[RoleResponse])
def get_roles(
    include_system: bool = True,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("roles", "read"))
):
    """Get all roles"""
    company_id = 1  # TODO: Get from user context
    roles = RoleService.get_roles(db, company_id, include_system)
    return roles


@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("roles", "read"))
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
    current_user_id: str = Depends(require_permission("roles", "create"))
):
    """Create new custom role"""
    company_id = 1  # TODO: Get from user context
    
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
    current_user_id: str = Depends(require_permission("roles", "update"))
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
    current_user_id: str = Depends(require_permission("roles", "delete"))
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
    current_user_id: str = Depends(require_auth)
):
    """Get current user's permissions"""
    permissions = RoleService.get_user_permissions(db, current_user_id)
    user_roles = db.query(UserRole).filter(
        UserRole.user_id == current_user_id
    ).all()
    
    return UserPermissionsResponse(
        user_id=current_user_id,
        roles=[
            UserRoleResponse(
                id=ur.id,
                user_id=ur.user_id,
                role_id=ur.role_id,
                role_name=ur.role.name if ur.role else "Unknown",
                branch_id=ur.branch_id,
                branch_name=None,  # TODO: Get branch name
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
    current_user_id: str = Depends(require_permission("roles", "update"))
):
    """Assign role to user"""
    try:
        user_role = RoleService.assign_role_to_user(
            db, user_id, assignment.role_id,
            assignment.branch_id, assignment.is_primary,
            current_user_id
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
