"""Branches Router"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse
from app.services.branch_service import BranchService
from app.middleware.rbac import require_permission

router = APIRouter()


@router.get("", response_model=List[BranchResponse])
def get_branches(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("branches", "read"))
):
    """Get all branches"""
    company_id = 1  # TODO: Get from user context
    branches = BranchService.get_branches(db, company_id, is_active)
    return branches


@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("branches", "read"))
):
    """Get branch by ID"""
    branch = BranchService.get_branch(db, branch_id)
    
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    return branch


@router.post("", response_model=BranchResponse, status_code=201)
def create_branch(
    branch_data: BranchCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("branches", "create"))
):
    """Create new branch"""
    company_id = 1  # TODO: Get from user context
    
    try:
        branch = BranchService.create_branch(db, company_id, branch_data)
        return branch
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: int,
    branch_data: BranchUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("branches", "update"))
):
    """Update branch"""
    try:
        branch = BranchService.update_branch(db, branch_id, branch_data)
        
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        return branch
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{branch_id}", status_code=204)
def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("branches", "delete"))
):
    """Delete branch (soft delete)"""
    try:
        success = BranchService.delete_branch(db, branch_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Branch not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
