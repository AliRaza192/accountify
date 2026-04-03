"""Approvals Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.services.approval_engine import ApprovalEngine
from app.middleware.rbac import require_permission

router = APIRouter()


@router.get("/workflows")
def get_workflows(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("approvals", "read"))
):
    """Get approval workflows"""
    company_id = 1
    workflows = db.query(ApprovalWorkflow).filter(
        ApprovalWorkflow.company_id == company_id
    ).all()
    return workflows


@router.post("/workflows")
def create_workflow(
    workflow_data: dict,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("approvals", "create"))
):
    """Create approval workflow"""
    company_id = 1
    workflow = ApprovalWorkflow(company_id=company_id, **workflow_data)
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return workflow


@router.get("/requests")
def get_approval_requests(
    status: str = None,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("approvals", "read"))
):
    """Get approval requests"""
    company_id = 1
    query = db.query(ApprovalRequest).filter(ApprovalRequest.company_id == company_id)
    if status:
        query = query.filter(ApprovalRequest.status == status)
    return query.all()


@router.post("/requests/{request_id}/approve")
def approve_request(
    request_id: int,
    approve_data: dict,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("approvals", "approve"))
):
    """Approve request"""
    try:
        request = ApprovalEngine.approve(
            db, request_id, current_user_id,
            approve_data.get("comments"),
            approve_data.get("delegate_to")
        )
        return request
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/requests/{request_id}/reject")
def reject_request(
    request_id: int,
    reject_data: dict,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("approvals", "approve"))
):
    """Reject request"""
    try:
        request = ApprovalEngine.reject(
            db, request_id, current_user_id,
            reject_data.get("comments", "")
        )
        return request
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
