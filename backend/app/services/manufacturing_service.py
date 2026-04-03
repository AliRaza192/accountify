"""Manufacturing Service"""
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timezone

from app.models.manufacturing import BOMHeader, BOMLine, ProductionOrder, ProductionMaterial, ProductionOutput, ScrapRecord
from app.models.branch import Branch

logger = logging.getLogger(__name__)


class ManufacturingService:
    """Service for manufacturing operations"""
    
    @staticmethod
    def create_bom(db: Session, company_id: int, product_id: int, 
                   version: int, lines: List[dict]) -> BOMHeader:
        """Create BOM with lines"""
        bom = BOMHeader(
            company_id=company_id,
            product_id=product_id,
            version=version,
            status="draft"
        )
        db.add(bom)
        db.commit()
        db.refresh(bom)
        
        for line_data in lines:
            line = BOMLine(bom_id=bom.id, **line_data)
            db.add(line)
        
        db.commit()
        logger.info(f"Created BOM {bom.id} with {len(lines)} lines")
        return bom
    
    @staticmethod
    def activate_bom(db: Session, bom_id: int) -> BOMHeader:
        """Activate BOM"""
        bom = db.query(BOMHeader).filter(BOMHeader.id == bom_id).first()
        if not bom:
            raise ValueError("BOM not found")
        
        bom.status = "active"
        bom.effective_date = datetime.now(timezone.utc).date()
        db.commit()
        logger.info(f"Activated BOM {bom_id}")
        return bom
    
    @staticmethod
    def create_production_order(db: Session, company_id: int, bom_id: int,
                                quantity: float, cost_center_id: int = None) -> ProductionOrder:
        """Create production order from BOM"""
        bom = db.query(BOMHeader).filter(BOMHeader.id == bom_id).first()
        if not bom:
            raise ValueError("BOM not found")
        
        order = ProductionOrder(
            company_id=company_id,
            bom_id=bom_id,
            quantity=quantity,
            cost_center_id=cost_center_id,
            status="planned"
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        
        # Create material requirements from BOM
        for bom_line in bom.lines:
            material = ProductionMaterial(
                production_order_id=order.id,
                product_id=bom_line.component_id,
                required_qty=bom_line.quantity * quantity
            )
            db.add(material)
        
        db.commit()
        logger.info(f"Created production order {order.id}")
        return order
    
    @staticmethod
    def issue_materials(db: Session, production_order_id: int,
                       materials: List[dict]) -> Dict[str, Any]:
        """Issue materials to production"""
        order = db.query(ProductionOrder).filter(
            ProductionOrder.id == production_order_id
        ).first()
        
        if not order:
            raise ValueError("Production order not found")
        
        for material_data in materials:
            material = db.query(ProductionMaterial).filter(
                ProductionMaterial.production_order_id == production_order_id,
                ProductionMaterial.product_id == material_data["product_id"]
            ).first()
            
            if material:
                material.issued_qty = material_data["quantity"]
                material.issue_date = datetime.now(timezone.utc)
        
        db.commit()
        logger.info(f"Issued materials to production order {production_order_id}")
        return {"success": True}
    
    @staticmethod
    def record_output(db: Session, production_order_id: int,
                     product_id: int, quantity: float,
                     actual_hours: float = None) -> ProductionOutput:
        """Record finished goods output"""
        order = db.query(ProductionOrder).filter(
            ProductionOrder.id == production_order_id
        ).first()
        
        if not order:
            raise ValueError("Production order not found")
        
        # Calculate cost
        bom = db.query(BOMHeader).filter(BOMHeader.id == order.bom_id).first()
        material_cost = sum(line.quantity * 100 for line in bom.lines)  # Simplified
        labor_cost = actual_hours * order.labor_rate if actual_hours and order.labor_rate else 0
        total_cost = material_cost * order.quantity + labor_cost
        unit_cost = total_cost / order.quantity if quantity > 0 else 0
        
        output = ProductionOutput(
            production_order_id=production_order_id,
            product_id=product_id,
            quantity=quantity,
            cost=total_cost,
            unit_cost=unit_cost
        )
        db.add(output)
        
        order.status = "completed"
        order.actual_end_date = datetime.now(timezone.utc).date()
        if actual_hours:
            order.actual_hours = actual_hours
        
        db.commit()
        db.refresh(output)
        logger.info(f"Recorded output for production order {production_order_id}")
        return output
    
    @staticmethod
    def record_scrap(db: Session, production_order_id: int,
                    product_id: int, quantity: float,
                    reason: str = None) -> ScrapRecord:
        """Record scrap/waste"""
        scrap = ScrapRecord(
            production_order_id=production_order_id,
            product_id=product_id,
            quantity=quantity,
            reason=reason
        )
        db.add(scrap)
        db.commit()
        logger.info(f"Recorded scrap for production order {production_order_id}")
        return scrap
