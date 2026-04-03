"""Role Service for RBAC operations"""
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging

from app.models.role import Role, UserRole
from app.schemas.role import RoleCreate, RoleUpdate, PermissionSchema

logger = logging.getLogger(__name__)


class RoleService:
    """Service for role management"""
    
    @staticmethod
    def get_roles(db: Session, company_id: Optional[int] = None, 
                  include_system: bool = True) -> List[Role]:
        """Get all roles for company"""
        query = db.query(Role)
        
        if company_id:
            query = query.filter(Role.company_id == company_id)
        
        if not include_system:
            query = query.filter(Role.is_system == False)
        
        return query.order_by(Role.name).all()
    
    @staticmethod
    def get_role(db: Session, role_id: int) -> Optional[Role]:
        """Get role by ID"""
        return db.query(Role).filter(Role.id == role_id).first()
    
    @staticmethod
    def create_role(db: Session, company_id: Optional[int], 
                    role_data: RoleCreate) -> Role:
        """Create new role"""
        # Check if role name already exists
        existing = db.query(Role).filter(
            Role.company_id == company_id,
            Role.name == role_data.name
        ).first()
        
        if existing:
            raise ValueError(f"Role '{role_data.name}' already exists")
        
        role = Role(
            company_id=company_id,
            name=role_data.name,
            permissions_json=role_data.permissions.dict(),
            is_system=role_data.is_system
        )
        
        db.add(role)
        db.commit()
        db.refresh(role)
        
        logger.info(f"Created role: {role.name} (ID: {role.id})")
        return role
    
    @staticmethod
    def update_role(db: Session, role_id: int, 
                    role_data: RoleUpdate) -> Optional[Role]:
        """Update role"""
        role = db.query(Role).filter(Role.id == role_id).first()
        
        if not role:
            return None
        
        # Cannot modify system roles
        if role.is_system:
            raise ValueError("Cannot modify system roles")
        
        if role_data.name:
            role.name = role_data.name
        
        if role_data.permissions:
            role.permissions_json = role_data.permissions.dict()
        
        db.commit()
        db.refresh(role)
        
        logger.info(f"Updated role: {role.name} (ID: {role.id})")
        return role
    
    @staticmethod
    def delete_role(db: Session, role_id: int) -> bool:
        """Delete role (cannot delete system roles)"""
        role = db.query(Role).filter(Role.id == role_id).first()
        
        if not role:
            return False
        
        if role.is_system:
            raise ValueError("Cannot delete system roles")
        
        # Check if role is assigned to users
        user_count = db.query(UserRole).filter(
            UserRole.role_id == role_id
        ).count()
        
        if user_count > 0:
            raise ValueError(f"Cannot delete role: assigned to {user_count} users")
        
        db.delete(role)
        db.commit()
        
        logger.info(f"Deleted role: {role.name} (ID: {role.id})")
        return True
    
    @staticmethod
    def assign_role_to_user(db: Session, user_id: str, role_id: int,
                           branch_id: Optional[int] = None,
                           is_primary: bool = False,
                           assigned_by: Optional[str] = None) -> UserRole:
        """Assign role to user"""
        # Check if role exists
        role = db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise ValueError(f"Role {role_id} not found")
        
        # Check for duplicate assignment
        existing = db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
            UserRole.branch_id == branch_id
        ).first()
        
        if existing:
            raise ValueError("Role already assigned to user")
        
        # If primary, unset other primary roles
        if is_primary:
            db.query(UserRole).filter(
                UserRole.user_id == user_id
            ).update({"is_primary": False})
        
        user_role = UserRole(
            user_id=user_id,
            role_id=role_id,
            branch_id=branch_id,
            is_primary=is_primary,
            assigned_by=assigned_by
        )
        
        db.add(user_role)
        db.commit()
        db.refresh(user_role)
        
        logger.info(f"Assigned role {role.name} to user {user_id}")
        return user_role
    
    @staticmethod
    def get_user_permissions(db: Session, user_id: str) -> Dict[str, Any]:
        """Get effective permissions for user"""
        user_roles = db.query(UserRole).filter(
            UserRole.user_id == user_id
        ).all()
        
        # Merge permissions from all roles
        all_modules = set()
        all_actions = {}
        
        for user_role in user_roles:
            if user_role.role:
                perms = user_role.role.permissions_json or {}
                modules = perms.get("modules", [])
                actions = perms.get("actions", {})
                
                all_modules.update(modules)
                
                for module, module_actions in actions.items():
                    if module not in all_actions:
                        all_actions[module] = set()
                    all_actions[module].update(module_actions)
        
        return {
            "modules": list(all_modules),
            "actions": {k: list(v) for k, v in all_actions.items()}
        }
    
    @staticmethod
    def has_permission(db: Session, user_id: str, module: str, 
                      action: str) -> bool:
        """Check if user has specific permission"""
        perms = RoleService.get_user_permissions(db, user_id)
        
        # Check module access
        if "*" not in perms["modules"] and module not in perms["modules"]:
            return False
        
        # Check action
        module_actions = perms["actions"].get(module, [])
        all_actions = perms["actions"].get("*", [])
        
        return action in module_actions or action in all_actions or "*" in all_actions
