"""Approvals Router - Supabase REST API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.routers.auth import get_current_user, get_supabase_client
from app.types import User
from supabase import Client

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class WorkflowCreate(BaseModel):
    name: str
    document_type: str
    levels: int = 1
    is_active: bool = True


class ApprovalActionData(BaseModel):
    comments: Optional[str] = None
    delegate_to: Optional[str] = None


@router.get("/workflows")
def get_workflows(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get approval workflows using Supabase REST API"""
    if not supabase:
        logger.warning("Supabase client not available")
        return []
    
    try:
        company_id = str(current_user.company_id)
        response = supabase.table("approval_workflows").select("*").eq("company_id", company_id).execute()
        
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching workflows: {e}")
        return []


@router.post("/workflows")
def create_workflow(
    workflow_data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Create approval workflow using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        
        workflow_insert = {
            "company_id": company_id,
            "name": workflow_data.name,
            "document_type": workflow_data.document_type,
            "levels": workflow_data.levels,
            "is_active": workflow_data.is_active,
        }
        
        response = supabase.table("approval_workflows").insert(workflow_insert).execute()
        
        if response.data:
            return response.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to create workflow")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating workflow: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")


@router.get("/requests")
def get_approval_requests(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get approval requests using Supabase REST API"""
    if not supabase:
        logger.warning("Supabase client not available")
        return []
    
    try:
        company_id = str(current_user.company_id)
        query = supabase.table("approval_requests").select("*").eq("company_id", company_id)
        
        if status:
            query = query.eq("status", status)
        
        response = query.order("requested_at", desc=True).execute()
        
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching approval requests: {e}")
        return []


@router.get("/requests/{request_id}")
def get_approval_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get approval request with actions using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        
        # Get request
        response = supabase.table("approval_requests").select("*").eq("id", request_id).eq("company_id", company_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Approval request not found")
        
        request = response.data[0]
        
        # Get actions
        actions_response = supabase.table("approval_actions").select("*").eq("request_id", request_id).order("actioned_at").execute()
        
        actions = actions_response.data if actions_response.data else []
        
        return {"request": request, "actions": actions}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching approval request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch approval request: {str(e)}")


@router.post("/requests/{request_id}/approve")
def approve_request(
    request_id: int,
    approve_data: ApprovalActionData,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Approve request using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        user_id = str(current_user.id)
        
        # Get request
        response = supabase.table("approval_requests").select("*").eq("id", request_id).eq("company_id", company_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Approval request not found")
        
        request = response.data[0]
        
        # Create action
        action_insert = {
            "request_id": request_id,
            "level": request["current_level"],
            "action": "approved",
            "actioned_by": user_id,
        }
        
        if approve_data.comments:
            action_insert["comments"] = approve_data.comments
        if approve_data.delegate_to:
            action_insert["delegated_to"] = approve_data.delegate_to
        
        supabase.table("approval_actions").insert(action_insert).execute()
        
        # Update request - advance to next level
        new_level = request["current_level"] + 1
        
        # Check if more levels remain
        if new_level > request.get("current_level", 1):
            # All levels approved
            update_data = {
                "status": "approved",
                "current_level": new_level,
                "completed_at": "now()",
                "completed_by": user_id,
            }
        else:
            update_data = {
                "current_level": new_level,
            }
        
        update_response = supabase.table("approval_requests").update(update_data).eq("id", request_id).execute()
        
        if update_response.data:
            return update_response.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to approve request")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to approve request: {str(e)}")


@router.post("/requests/{request_id}/reject")
def reject_request(
    request_id: int,
    reject_data: ApprovalActionData,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Reject request using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        user_id = str(current_user.id)
        
        # Get request
        response = supabase.table("approval_requests").select("*").eq("id", request_id).eq("company_id", company_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Approval request not found")
        
        request = response.data[0]
        
        # Create action
        action_insert = {
            "request_id": request_id,
            "level": request["current_level"],
            "action": "rejected",
            "actioned_by": user_id,
        }
        
        if reject_data.comments:
            action_insert["comments"] = reject_data.comments
        
        supabase.table("approval_actions").insert(action_insert).execute()
        
        # Update request status
        update_response = supabase.table("approval_requests").update({
            "status": "rejected"
        }).eq("id", request_id).execute()
        
        if update_response.data:
            return update_response.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to reject request")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reject request: {str(e)}")
