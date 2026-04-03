"""MRP Service - Material Requirement Planning"""
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, date
import logging

from app.models.manufacturing import ProductionOrder, ProductionMaterial, BOMHeader, BOMLine
from app.models.branch import Branch

logger = logging.getLogger(__name__)


class MRPService:
    """Service for Material Requirement Planning"""
    
    @staticmethod
    def run_mrp(db: Session, company_id: int, from_date: date, 
                to_date: date) -> Dict[str, Any]:
        """
        Run Material Requirement Planning
        
        Returns material requirements and shortages based on:
        - Active production orders
        - BOM requirements
        - Current inventory levels (simplified)
        """
        # Get production orders in date range
        orders = db.query(ProductionOrder).filter(
            ProductionOrder.company_id == company_id,
            ProductionOrder.status.in_(["planned", "started"]),
            ProductionOrder.start_date >= from_date,
            ProductionOrder.start_date <= to_date
        ).all()
        
        # Aggregate material requirements
        material_requirements: Dict[int, Dict[str, Any]] = {}
        
        for order in orders:
            bom = db.query(BOMHeader).filter(BOMHeader.id == order.bom_id).first()
            if not bom:
                continue
            
            for bom_line in bom.lines:
                component_id = bom_line.component_id
                required_qty = bom_line.quantity * order.quantity
                
                if component_id not in material_requirements:
                    material_requirements[component_id] = {
                        "component_id": component_id,
                        "required_qty": 0,
                        "available_qty": 0,  # Would come from inventory
                        "production_orders": []
                    }
                
                material_requirements[component_id]["required_qty"] += required_qty
                material_requirements[component_id]["production_orders"].append({
                    "order_id": order.id,
                    "quantity": order.quantity,
                    "start_date": str(order.start_date) if order.start_date else None
                })
        
        # Calculate shortages (simplified - would check actual inventory)
        shortages = []
        surplus = []
        
        for component_id, req in material_requirements.items():
            # Simplified: assume available_qty is 80% of required for demo
            req["available_qty"] = req["required_qty"] * 0.8
            req["shortage_qty"] = req["required_qty"] - req["available_qty"]
            
            if req["shortage_qty"] > 0:
                req["suggested_action"] = "purchase"
                req["suggested_qty"] = req["shortage_qty"] * 1.1  # 10% buffer
                req["urgency"] = "high" if req["shortage_qty"] > req["required_qty"] * 0.3 else "medium"
                shortages.append(req)
            else:
                surplus.append(req)
        
        result = {
            "planning_period": {
                "from": str(from_date),
                "to": str(to_date)
            },
            "production_orders": [
                {
                    "order_id": o.id,
                    "product_id": o.bom_id,
                    "quantity": float(o.quantity),
                    "start_date": str(o.start_date) if o.start_date else None
                }
                for o in orders
            ],
            "material_requirements": list(material_requirements.values()),
            "shortages": shortages,
            "surplus": surplus,
            "summary": {
                "total_materials": len(material_requirements),
                "shortages": len(shortages),
                "surplus": len(surplus)
            }
        }
        
        logger.info(f"MRP run completed: {len(shortages)} shortages found")
        return result
