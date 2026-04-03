"""RBAC Middleware for permission-based access control"""
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from sqlalchemy.orm import Session
from typing import Optional, Callable
import logging

from app.database import get_db
from app.config import settings
from app.models.role import Role, UserRole
from app.models.auth import LoginHistory
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


class PermissionDenied(Exception):
    """Raised when user lacks required permission"""
    pass


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """Extract user ID from JWT token"""
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload.get("sub")  # Supabase user ID
    except Exception as e:
        logger.error(f"Failed to decode JWT: {e}")
        return None


def get_user_roles(db: Session, user_id: str) -> list[UserRole]:
    """Get all roles assigned to user"""
    return db.query(UserRole).filter(UserRole.user_id == user_id).all()


def check_permission(db: Session, user_id: str, module: str, action: str) -> bool:
    """Check if user has permission for module and action"""
    user_roles = get_user_roles(db, user_id)
    
    for user_role in user_roles:
        if user_role.role and user_role.role.has_permission(module, action):
            return True
    
    return False


def require_permission(module: str, action: str):
    """Decorator to require specific permission for endpoint"""
    def dependency(db: Session = Depends(get_db), 
                   user_id: Optional[str] = Depends(get_current_user_id)):
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Super Admin bypasses all checks
        user_roles = get_user_roles(db, user_id)
        for user_role in user_roles:
            if user_role.role and user_role.role.name == "Super Admin":
                return user_id
        
        # Check permission
        if not check_permission(db, user_id, module, action):
            logger.warning(f"User {user_id} denied permission for {module}:{action}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {action} {module}"
            )
        
        return user_id
    
    return dependency


def require_auth(user_id: Optional[str] = Depends(get_current_user_id)) -> str:
    """Require authentication (any logged in user)"""
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user_id


def log_user_action(db: Session, user_id: str, action: str, table: str, 
                    record_id: int, old_values: dict = None, new_values: dict = None,
                    ip_address: str = None):
    """Log user action to audit trail"""
    from app.models.audit import AuditLog
    
    audit = AuditLog(
        company_id=1,  # TODO: Get from user context
        user_id=user_id,
        action=action,
        table_name=table,
        record_id=record_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address
    )
    db.add(audit)
    db.commit()
