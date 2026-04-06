"""Branches Router - Supabase REST API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.routers.auth import get_current_user, get_supabase_client
from app.types import User
from supabase import Client

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class BranchCreate(BaseModel):
    name: str
    code: str
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


@router.get("")
def get_branches(
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get all branches using Supabase REST API"""
    if not supabase:
        logger.warning("Supabase client not available")
        return []
    
    try:
        company_id = str(current_user.company_id)
        query = supabase.table("branches").select("*").eq("company_id", company_id)
        
        if is_active is not None:
            query = query.eq("is_active", is_active)
        
        # Order by is_default DESC, then name ASC
        response = query.order("is_default", desc=True).order("name").execute()
        
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching branches: {e}")
        return []


@router.get("/{branch_id}")
def get_branch(
    branch_id: int,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get branch by ID using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        response = supabase.table("branches").select("*").eq("id", branch_id).eq("company_id", company_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching branch: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch branch: {str(e)}")


@router.post("", status_code=201)
def create_branch(
    branch_data: BranchCreate,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Create new branch using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        
        # Check if code already exists
        existing = supabase.table("branches").select("id").eq("code", branch_data.code).execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail=f"Branch code '{branch_data.code}' already exists")
        
        # If setting as default, unset other defaults
        if branch_data.is_default:
            supabase.table("branches").update({"is_default": False}).eq("company_id", company_id).eq("is_default", True).execute()
        
        # Create branch
        branch_insert = {
            "company_id": company_id,
            "name": branch_data.name,
            "code": branch_data.code,
            "is_default": branch_data.is_default,
            "is_active": True,
        }
        
        if branch_data.address:
            branch_insert["address"] = branch_data.address
        if branch_data.phone:
            branch_insert["phone"] = branch_data.phone
        if branch_data.email:
            branch_insert["email"] = branch_data.email
        
        response = supabase.table("branches").insert(branch_insert).execute()
        
        if response.data:
            return response.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to create branch")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating branch: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create branch: {str(e)}")


@router.put("/{branch_id}")
def update_branch(
    branch_id: int,
    branch_data: BranchUpdate,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update branch using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        
        # Check if branch exists
        existing = supabase.table("branches").select("*").eq("id", branch_id).eq("company_id", company_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        branch = existing.data[0]
        
        # If setting as default, unset other defaults
        if branch_data.is_default and not branch.get("is_default"):
            supabase.table("branches").update({"is_default": False}).eq("company_id", company_id).eq("is_default", True).execute()
        
        # Update branch
        update_data = {}
        if branch_data.name is not None:
            update_data["name"] = branch_data.name
        if branch_data.code is not None:
            update_data["code"] = branch_data.code
        if branch_data.address is not None:
            update_data["address"] = branch_data.address
        if branch_data.phone is not None:
            update_data["phone"] = branch_data.phone
        if branch_data.email is not None:
            update_data["email"] = branch_data.email
        if branch_data.is_default is not None:
            update_data["is_default"] = branch_data.is_default
        if branch_data.is_active is not None:
            update_data["is_active"] = branch_data.is_active
        
        response = supabase.table("branches").update(update_data).eq("id", branch_id).execute()
        
        if response.data:
            return response.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to update branch")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating branch: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update branch: {str(e)}")


@router.delete("/{branch_id}", status_code=204)
def delete_branch(
    branch_id: int,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Delete branch (soft delete) using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        
        # Check if branch exists
        existing = supabase.table("branches").select("*").eq("id", branch_id).eq("company_id", company_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Branch not found")
        
        branch = existing.data[0]
        
        # Cannot delete default branch
        if branch.get("is_default"):
            raise HTTPException(status_code=400, detail="Cannot delete default branch")
        
        # Soft delete
        response = supabase.table("branches").update({"is_active": False}).eq("id", branch_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to delete branch")
        
        return None  # 204 No Content
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting branch: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete branch: {str(e)}")
