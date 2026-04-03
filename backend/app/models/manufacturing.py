"""Manufacturing models - BOM and Production"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, DECIMAL, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.models.base import Base


class BOMHeader(Base):
    """Bill of Materials header"""
    __tablename__ = "bom_headers"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, nullable=False, index=True)
    version = Column(Integer, nullable=False)
    status = Column(String(20), default="draft")
    effective_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    lines = relationship("BOMLine", back_populates="bom", cascade="all, delete-orphan")


class BOMLine(Base):
    """BOM component line"""
    __tablename__ = "bom_lines"

    id = Column(Integer, primary_key=True, index=True)
    bom_id = Column(Integer, ForeignKey("bom_headers.id", ondelete="CASCADE"), nullable=False, index=True)
    component_id = Column(Integer, nullable=False)
    quantity = Column(DECIMAL(15, 3), nullable=False)
    unit = Column(String(20), nullable=False)
    waste_percent = Column(DECIMAL(5, 2), default=0)
    sequence = Column(Integer, default=0)

    bom = relationship("BOMHeader", back_populates="lines")


class ProductionOrder(Base):
    """Production job order"""
    __tablename__ = "production_orders"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    bom_id = Column(Integer, ForeignKey("bom_headers.id"), nullable=False, index=True)
    quantity = Column(DECIMAL(15, 3), nullable=False)
    status = Column(String(20), default="planned")
    cost_center_id = Column(Integer, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    actual_start_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)
    actual_hours = Column(DECIMAL(10, 2), nullable=True)
    labor_rate = Column(DECIMAL(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ProductionMaterial(Base):
    """Material issued to production"""
    __tablename__ = "production_materials"

    id = Column(Integer, primary_key=True, index=True)
    production_order_id = Column(Integer, ForeignKey("production_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, nullable=False)
    required_qty = Column(DECIMAL(15, 3), nullable=False)
    issued_qty = Column(DECIMAL(15, 3), default=0)
    issue_date = Column(DateTime(timezone=True), nullable=True)
    issued_by = Column(String(255), nullable=True)


class ProductionOutput(Base):
    """Finished goods output"""
    __tablename__ = "production_output"

    id = Column(Integer, primary_key=True, index=True)
    production_order_id = Column(Integer, ForeignKey("production_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, nullable=False)
    quantity = Column(DECIMAL(15, 3), nullable=False)
    cost = Column(DECIMAL(15, 2), nullable=True)
    unit_cost = Column(DECIMAL(15, 2), nullable=True)
    output_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    recorded_by = Column(String(255), nullable=True)


class ScrapRecord(Base):
    """Production scrap/waste"""
    __tablename__ = "scrap_records"

    id = Column(Integer, primary_key=True, index=True)
    production_order_id = Column(Integer, ForeignKey("production_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, nullable=False)
    quantity = Column(DECIMAL(15, 3), nullable=False)
    reason = Column(String(100), nullable=True)
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    recorded_by = Column(String(255), nullable=True)
