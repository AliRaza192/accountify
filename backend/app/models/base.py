"""
Base SQLAlchemy Model for Accountify
Provides common columns and methods for all models
"""

from sqlalchemy import Column, DateTime, func
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    
    # Common columns for all models
    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Generate table name from class name"""
        return cls.__name__.lower() + "s"
    
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now()
    )
    
    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class CompanyBase(Base):
    """Base model with company_id for multi-tenancy"""
    
    __abstract__ = True
    
    company_id: Mapped[UUID]


class AuditableModel(CompanyBase):
    """Base model with company_id and audit fields"""
    
    __abstract__ = True
    
    created_by: Mapped[Optional[UUID]]
    updated_by: Mapped[Optional[UUID]]
