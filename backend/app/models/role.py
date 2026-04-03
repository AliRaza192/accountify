"""Role and User Role models for RBAC"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.models.base import Base


class Role(Base):
    """Role with JSON-based permissions"""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    permissions_json = Column(JSONB, nullable=False, default={"modules": [], "actions": {}})
    is_system = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('company_id', 'name', name='uq_roles_company_name'),
    )

    # Relationships
    user_assignments = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")

    def has_permission(self, module: str, action: str) -> bool:
        """Check if role has permission for module and action"""
        permissions = self.permissions_json or {}
        modules = permissions.get("modules", [])
        actions = permissions.get("actions", {})

        # Check if module is allowed
        if "*" not in modules and module not in modules:
            return False

        # Check if action is allowed for module
        module_actions = actions.get(module, [])
        all_actions = actions.get("*", [])
        return action in module_actions or action in all_actions or "*" in all_actions


class UserRole(Base):
    """Assignment of roles to users"""
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)  # Supabase auth.users UUID
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(Integer, nullable=True, index=True)  # References branches (created later)
    is_primary = Column(Boolean, default=False)
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    assigned_by = Column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', 'branch_id', name='uq_user_role_branch'),
    )

    # Relationships
    role = relationship("Role", back_populates="user_assignments")

    def get_effective_permissions(self) -> dict:
        """Get merged permissions from all roles"""
        return self.role.permissions_json if self.role else {"modules": [], "actions": {}}
