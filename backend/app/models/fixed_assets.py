"""
Fixed Assets SQLAlchemy Models
Tables: fixed_assets, asset_categories, asset_depreciation, asset_maintenance
"""

from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import date
from decimal import Decimal
from typing import Optional, List
from uuid import UUID as UUID_TYPE

from app.models.base import AuditableModel


class AssetCategory(AuditableModel):
    """Asset category with FBR depreciation rates"""
    
    __tablename__ = "asset_categories"
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    depreciation_rate_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    depreciation_method: Mapped[str] = mapped_column(String(10), nullable=False, default="SLM")
    account_code: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    
    # Relationships
    assets: Mapped[List["FixedAsset"]] = relationship(back_populates="category", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('company_id', 'name', name='uq_asset_categories_company_name'),
    )


class FixedAsset(AuditableModel):
    """Fixed asset with depreciation tracking"""
    
    __tablename__ = "fixed_assets"
    
    asset_code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("asset_categories.id"), nullable=False)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    purchase_cost: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    useful_life_months: Mapped[int] = mapped_column(Integer, nullable=False)
    residual_value_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=10.0)
    depreciation_method: Mapped[str] = mapped_column(String(10), nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    document_urls: Mapped[Optional[list]] = mapped_column(JSONB, default=list)
    
    # Relationships
    category: Mapped["AssetCategory"] = relationship(back_populates="assets")
    depreciation_records: Mapped[List["AssetDepreciation"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )
    maintenance_logs: Mapped[List["AssetMaintenance"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        UniqueConstraint('company_id', 'asset_code', name='uq_fixed_assets_company_code'),
        CheckConstraint('purchase_cost > 0', name='chk_purchase_cost_positive'),
        CheckConstraint('useful_life_months > 0', name='chk_useful_life_positive'),
        CheckConstraint(
            'residual_value_percent >= 0 AND residual_value_percent <= 100',
            name='chk_residual_value_range'
        ),
        CheckConstraint(
            'depreciation_method IN (\'SLM\', \'WDV\')',
            name='chk_depreciation_method_valid'
        ),
        CheckConstraint(
            'status IN (\'active\', \'disposed\', \'sold\', \'fully_depreciated\')',
            name='chk_status_valid'
        ),
    )
    
    @property
    def residual_value(self) -> Decimal:
        """Calculate residual value"""
        return self.purchase_cost * (self.residual_value_percent / 100)
    
    @property
    def depreciable_amount(self) -> Decimal:
        """Calculate depreciable amount (cost - residual)"""
        return self.purchase_cost - self.residual_value


class AssetDepreciation(AuditableModel):
    """Monthly depreciation record"""
    
    __tablename__ = "asset_depreciation"
    
    asset_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("fixed_assets.id"), nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    depreciation_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    accumulated_depreciation: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    book_value: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    journal_entry_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("journal_entries.id"), nullable=False)
    posted_by: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=False)
    posted_at: Mapped[date] = mapped_column(default=date.today)
    
    # Relationships
    asset: Mapped["FixedAsset"] = relationship(back_populates="depreciation_records")
    
    __table_args__ = (
        UniqueConstraint('asset_id', 'period_month', 'period_year', name='uq_depreciation_asset_period'),
        CheckConstraint('depreciation_amount >= 0', name='chk_depreciation_positive'),
        CheckConstraint('accumulated_depreciation >= 0', name='chk_accumulated_depreciation_positive'),
        CheckConstraint('book_value >= 0', name='chk_book_value_positive'),
    )


class AssetMaintenance(AuditableModel):
    """Asset maintenance log"""
    
    __tablename__ = "asset_maintenance"
    
    asset_id: Mapped[UUID_TYPE] = mapped_column(UUID(as_uuid=True), ForeignKey("fixed_assets.id"), nullable=False)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    service_type: Mapped[str] = mapped_column(String(100), nullable=False)
    service_provider: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    cost: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    next_service_due: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    # Relationships
    asset: Mapped["FixedAsset"] = relationship(back_populates="maintenance_logs")
    
    __table_args__ = (
        CheckConstraint('cost >= 0', name='chk_maintenance_cost_positive'),
    )
