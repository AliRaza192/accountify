"""Branch models for multi-branch support"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.models.base import Base


class Branch(Base):
    """Company branch/location"""
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False, unique=True, index=True)
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    is_default = Column(Boolean, default=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    settings = relationship("BranchSettings", back_populates="branch", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Branch {self.name} ({self.code})>"


class BranchSettings(Base):
    """Branch-specific configuration"""
    __tablename__ = "branch_settings"

    id = Column(Integer, primary_key=True, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    price_list_id = Column(Integer, nullable=True)
    tax_rate = Column(Integer, default=0)
    currency = Column(String(3), default="PKR")
    fiscal_year_start = Column(String(5), default="01-01")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    branch = relationship("Branch", back_populates="settings")
