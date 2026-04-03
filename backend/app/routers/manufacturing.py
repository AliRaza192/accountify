"""Manufacturing Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.manufacturing import BOMHeader, BOMLine, ProductionOrder
from app.routers.auth import get_current_user
from app.types import User

router = APIRouter()


@router.get("/bom")
def get_boms(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get BOMs"""
    company_id = current_user.company_id
    query = db.query(BOMHeader).filter(BOMHeader.company_id == company_id)
    if status:
        query = query.filter(BOMHeader.status == status)
    return query.all()


@router.post("/bom")
def create_bom(
    bom_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create BOM"""
    company_id = current_user.company_id
    lines_data = bom_data.pop("lines", [])

    bom = BOMHeader(company_id=company_id, **bom_data)
    db.add(bom)
    db.commit()
    db.refresh(bom)

    for line_data in lines_data:
        line = BOMLine(bom_id=bom.id, **line_data)
        db.add(line)

    db.commit()
    return bom


@router.post("/bom/{bom_id}/activate")
def activate_bom(
    bom_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate BOM"""
    bom = db.query(BOMHeader).filter(BOMHeader.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")

    bom.status = "active"
    db.commit()
    return bom


@router.get("/orders")
def get_production_orders(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get production orders"""
    company_id = current_user.company_id
    query = db.query(ProductionOrder).filter(ProductionOrder.company_id == company_id)
    if status:
        query = query.filter(ProductionOrder.status == status)
    return query.all()


@router.post("/orders")
def create_production_order(
    order_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create production order"""
    company_id = current_user.company_id
    order = ProductionOrder(company_id=company_id, **order_data)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/mrp")
def run_mrp(
    from_date: str,
    to_date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run Material Requirement Planning"""
    # Simplified MRP logic
    return {
        "planning_period": {"from": from_date, "to": to_date},
        "material_requirements": [],
        "summary": {"total_materials": 0, "shortages": 0}
    }
