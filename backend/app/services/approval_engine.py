"""Approval Engine - Workflow evaluation and state machine"""
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime, timezone

from app.models.approval import ApprovalWorkflow, ApprovalRequest, ApprovalAction
from app.services.audit_service import AuditService

logger = logging.getLogger(__name__)


class ApprovalEngine:
    """Engine for evaluating and processing approval workflows"""
    
    @staticmethod
    def get_workflow_for_document(db: Session, company_id: int, 
                                   module: str, amount: float) -> Optional[ApprovalWorkflow]:
        """Get applicable workflow for document"""
        workflows = db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.company_id == company_id,
            ApprovalWorkflow.module == module,
            ApprovalWorkflow.is_active == True
        ).all()
        
        for workflow in workflows:
            if workflow.condition_amount and amount:
                op = workflow.condition_operator
                if op == '>' and amount > workflow.condition_amount:
                    return workflow
                elif op == '>=' and amount >= workflow.condition_amount:
                    return workflow
                elif op == '<' and amount < workflow.condition_amount:
                    return workflow
                elif op == '<=' and amount <= workflow.condition_amount:
                    return workflow
            elif not workflow.condition_amount:
                return workflow
        
        return None
    
    @staticmethod
    def create_approval_request(db: Session, company_id: int, workflow: ApprovalWorkflow,
                                document_type: str, document_id: int, 
                                requested_by: str) -> ApprovalRequest:
        """Create new approval request"""
        request = ApprovalRequest(
            company_id=company_id,
            workflow_id=workflow.id,
            document_type=document_type,
            document_id=document_id,
            status="pending",
            current_level=1,
            requested_by=requested_by
        )
        
        db.add(request)
        db.commit()
        db.refresh(request)
        
        logger.info(f"Created approval request {request.id} for {document_type}:{document_id}")
        return request
    
    @staticmethod
    def approve(db: Session, request_id: int, actioned_by: str,
                comments: str = None, delegate_to: str = None) -> ApprovalRequest:
        """Approve at current level"""
        request = db.query(ApprovalRequest).filter(
            ApprovalRequest.id == request_id
        ).first()
        
        if not request:
            raise ValueError("Approval request not found")
        
        if request.status != "pending":
            raise ValueError(f"Request already {request.status}")
        
        # Log approval action
        action = ApprovalAction(
            request_id=request_id,
            level=request.current_level,
            action="approved",
            actioned_by=actioned_by,
            comments=comments,
            delegated_to=delegate_to
        )
        db.add(action)
        
        # Get workflow levels
        workflow = db.query(ApprovalWorkflow).filter(
            ApprovalWorkflow.id == request.workflow_id
        ).first()
        
        levels = workflow.levels_json or []
        
        # Check if more levels
        if request.current_level < len(levels):
            request.current_level += 1
            logger.info(f"Approval request {request_id} moved to level {request.current_level}")
        else:
            # All levels approved
            request.status = "approved"
            request.completed_at = datetime.now(timezone.utc)
            request.completed_by = actioned_by
            logger.info(f"Approval request {request_id} fully approved")
        
        db.commit()
        db.refresh(request)
        
        # Audit log
        AuditService.log_action(
            db, request.company_id, actioned_by, "UPDATE",
            "approval_requests", request_id,
            new_values={"status": request.status, "current_level": request.current_level}
        )
        
        return request
    
    @staticmethod
    def reject(db: Session, request_id: int, actioned_by: str,
               comments: str) -> ApprovalRequest:
        """Reject approval request"""
        request = db.query(ApprovalRequest).filter(
            ApprovalRequest.id == request_id
        ).first()
        
        if not request:
            raise ValueError("Approval request not found")
        
        if request.status != "pending":
            raise ValueError(f"Request already {request.status}")
        
        # Log rejection action
        action = ApprovalAction(
            request_id=request_id,
            level=request.current_level,
            action="rejected",
            actioned_by=actioned_by,
            comments=comments
        )
        db.add(action)
        
        # Update request
        request.status = "rejected"
        request.completed_at = datetime.now(timezone.utc)
        request.completed_by = actioned_by
        
        db.commit()
        db.refresh(request)
        
        # Audit log
        AuditService.log_action(
            db, request.company_id, actioned_by, "UPDATE",
            "approval_requests", request_id,
            new_values={"status": "rejected"}
        )
        
        logger.info(f"Approval request {request_id} rejected by {actioned_by}")
        return request
    
    @staticmethod
    def get_pending_approvals(db: Session, company_id: int, 
                              user_role_ids: List[int]) -> List[ApprovalRequest]:
        """Get pending approvals for user's role"""
        # This would need role-based filtering logic
        return db.query(ApprovalRequest).filter(
            ApprovalRequest.company_id == company_id,
            ApprovalRequest.status == "pending"
        ).all()
