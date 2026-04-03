"""Approvals Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.approval import ApprovalWorkflow, ApprovalRequest, ApprovalAction
from app.routers.auth import get_current_user
from app.types import User

router = APIRouter()


@router.get("/workflows")
def get_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get approval workflows"""
    company_id = current_user.company_id
    workflows = db.query(ApprovalWorkflow).filter(
        ApprovalWorkflow.company_id == company_id
    ).all()
    return workflows


@router.post("/workflows")
def create_workflow(
    workflow_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create approval workflow"""
    company_id = current_user.company_id
    workflow = ApprovalWorkflow(company_id=company_id, **workflow_data)
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return workflow


@router.get("/requests")
def get_approval_requests(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get approval requests"""
    company_id = current_user.company_id
    query = db.query(ApprovalRequest).filter(ApprovalRequest.company_id == company_id)
    if status:
        query = query.filter(ApprovalRequest.status == status)
    return query.all()


@router.get("/requests/{request_id}")
def get_approval_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get approval request with actions"""
    company_id = current_user.company_id
    request = db.query(ApprovalRequest).filter(
        ApprovalRequest.id == request_id,
        ApprovalRequest.company_id == company_id
    ).first()
    if not request:
        raise HTTPException(status_code=404, detail="Approval request not found")

    actions = db.query(ApprovalAction).filter(
        ApprovalAction.request_id == request_id
    ).order_by(ApprovalAction.actioned_at).all()

    return {"request": request, "actions": actions}


@router.post("/requests/{request_id}/approve")
def approve_request(
    request_id: int,
    approve_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve request"""
    company_id = current_user.company_id
    request = db.query(ApprovalRequest).filter(
        ApprovalRequest.id == request_id,
        ApprovalRequest.company_id == company_id
    ).first()
    if not request:
        raise HTTPException(status_code=404, detail="Approval request not found")

    action = ApprovalAction(
        request_id=request_id,
        level=request.current_level,
        action="approved",
        actioned_by=str(current_user.id),
        comments=approve_data.get("comments"),
        delegated_to=approve_data.get("delegate_to"),
    )
    db.add(action)

    # Advance to next level or complete
    request.current_level += 1
    # In a real system, check if more levels remain

    db.commit()
    db.refresh(request)
    return request


@router.post("/requests/{request_id}/reject")
def reject_request(
    request_id: int,
    reject_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject request"""
    company_id = current_user.company_id
    request = db.query(ApprovalRequest).filter(
        ApprovalRequest.id == request_id,
        ApprovalRequest.company_id == company_id
    ).first()
    if not request:
        raise HTTPException(status_code=404, detail="Approval request not found")

    action = ApprovalAction(
        request_id=request_id,
        level=request.current_level,
        action="rejected",
        actioned_by=str(current_user.id),
        comments=reject_data.get("comments", ""),
    )
    db.add(action)
    request.status = "rejected"

    db.commit()
    db.refresh(request)
    return request
