"""Audit Service for logging all data changes"""
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import logging

from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    """Service for audit trail logging"""
    
    @staticmethod
    def log_action(db: Session, company_id: int, user_id: str, action: str,
                   table_name: str, record_id: int, 
                   old_values: Optional[Dict[str, Any]] = None,
                   new_values: Optional[Dict[str, Any]] = None,
                   ip_address: Optional[str] = None,
                   user_agent: Optional[str] = None) -> AuditLog:
        """
        Log an action to the audit trail
        
        Args:
            db: Database session
            company_id: Company ID
            user_id: User ID who performed the action
            action: INSERT, UPDATE, or DELETE
            table_name: Name of the table affected
            record_id: ID of the affected record
            old_values: Previous values (for UPDATE/DELETE)
            new_values: New values (for INSERT/UPDATE)
            ip_address: User's IP address
            user_agent: User's browser/client info
        
        Returns:
            Created AuditLog entry
        """
        audit = AuditLog(
            company_id=company_id,
            user_id=user_id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(audit)
        db.commit()
        db.refresh(audit)
        
        logger.debug(f"Audit log: {action} on {table_name}:{record_id} by {user_id}")
        return audit
    
    @staticmethod
    def log_create(db: Session, company_id: int, user_id: str,
                   table_name: str, record_id: int, 
                   new_values: Dict[str, Any], **kwargs) -> AuditLog:
        """Log a CREATE operation"""
        return AuditService.log_action(
            db, company_id, user_id, "INSERT", table_name, 
            record_id, new_values=new_values, **kwargs
        )
    
    @staticmethod
    def log_update(db: Session, company_id: int, user_id: str,
                   table_name: str, record_id: int,
                   old_values: Dict[str, Any], new_values: Dict[str, Any], 
                   **kwargs) -> AuditLog:
        """Log an UPDATE operation"""
        return AuditService.log_action(
            db, company_id, user_id, "UPDATE", table_name,
            record_id, old_values=old_values, new_values=new_values, **kwargs
        )
    
    @staticmethod
    def log_delete(db: Session, company_id: int, user_id: str,
                   table_name: str, record_id: int,
                   old_values: Dict[str, Any], **kwargs) -> AuditLog:
        """Log a DELETE operation"""
        return AuditService.log_action(
            db, company_id, user_id, "DELETE", table_name,
            record_id, old_values=old_values, **kwargs
        )
    
    @staticmethod
    def get_audit_logs(db: Session, company_id: int,
                       user_id: Optional[str] = None,
                       table_name: Optional[str] = None,
                       record_id: Optional[int] = None,
                       action: Optional[str] = None,
                       from_date: Optional[datetime] = None,
                       to_date: Optional[datetime] = None,
                       limit: int = 100, offset: int = 0) -> List[AuditLog]:
        """Query audit logs with filters"""
        query = db.query(AuditLog).filter(AuditLog.company_id == company_id)
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        
        if table_name:
            query = query.filter(AuditLog.table_name == table_name)
        
        if record_id:
            query = query.filter(AuditLog.record_id == record_id)
        
        if action:
            query = query.filter(AuditLog.action == action)
        
        if from_date:
            query = query.filter(AuditLog.created_at >= from_date)
        
        if to_date:
            query = query.filter(AuditLog.created_at <= to_date)
        
        return query.order_by(
            AuditLog.created_at.desc()
        ).offset(offset).limit(limit).all()
    
    @staticmethod
    def get_record_history(db: Session, company_id: int,
                          table_name: str, record_id: int) -> List[AuditLog]:
        """Get complete audit history for a specific record"""
        return db.query(AuditLog).filter(
            AuditLog.company_id == company_id,
            AuditLog.table_name == table_name,
            AuditLog.record_id == record_id
        ).order_by(AuditLog.created_at.asc()).all()
    
    @staticmethod
    def get_user_activity(db: Session, company_id: int, user_id: str,
                         from_date: Optional[datetime] = None,
                         limit: int = 50) -> List[AuditLog]:
        """Get recent activity for a specific user"""
        query = db.query(AuditLog).filter(
            AuditLog.company_id == company_id,
            AuditLog.user_id == user_id
        )
        
        if from_date:
            query = query.filter(AuditLog.created_at >= from_date)
        
        return query.order_by(
            AuditLog.created_at.desc()
        ).limit(limit).all()
