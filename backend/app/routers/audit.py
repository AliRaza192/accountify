"""Audit Router for audit trail queries"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.schemas.audit import AuditLogResponse, AuditLogQueryParams
from app.services.audit_service import AuditService
from app.middleware.rbac import require_permission

router = APIRouter()


@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    user_id: Optional[str] = Query(None),
    table_name: Optional[str] = Query(None),
    record_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("audit", "read"))
):
    """Query audit logs with filters"""
    company_id = 1  # TODO: Get from user context
    
    logs = AuditService.get_audit_logs(
        db, company_id,
        user_id=user_id,
        table_name=table_name,
        record_id=record_id,
        action=action,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset
    )
    
    return logs


@router.get("/logs/{table_name}/{record_id}")
def get_record_history(
    table_name: str,
    record_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("audit", "read"))
):
    """Get complete audit history for a specific record"""
    company_id = 1  # TODO: Get from user context
    
    history = AuditService.get_record_history(
        db, company_id, table_name, record_id
    )
    
    return {
        "table_name": table_name,
        "record_id": record_id,
        "history": history,
        "total_changes": len(history)
    }


@router.get("/user/{user_id}/activity")
def get_user_activity(
    user_id: str,
    from_date: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(require_permission("audit", "read"))
):
    """Get recent activity for a specific user"""
    company_id = 1  # TODO: Get from user context
    
    activity = AuditService.get_user_activity(
        db, company_id, user_id, from_date, limit
    )
    
    return {
        "user_id": user_id,
        "activity": activity,
        "total": len(activity)
    }
