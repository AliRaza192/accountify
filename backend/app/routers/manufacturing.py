"""Manufacturing Router - Supabase REST API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
import logging

from app.routers.auth import get_current_user, get_supabase_client
from app.types import User
from supabase import Client

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class BOMLineCreate(BaseModel):
    component_id: int
    quantity: float
    unit: str
    waste_percent: float = 0
    sequence: int = 0


class BOMCreate(BaseModel):
    product_id: int
    version: int = 1
    effective_date: Optional[str] = None
    notes: Optional[str] = None
    lines: List[BOMLineCreate] = []


class ProductionOrderCreate(BaseModel):
    bom_id: int
    quantity: float
    cost_center_id: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    labor_rate: Optional[float] = None
    notes: Optional[str] = None


@router.get("/bom")
def get_boms(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get BOMs using Supabase REST API"""
    if not supabase:
        logger.warning("Supabase client not available")
        return []
    
    try:
        company_id = str(current_user.company_id)
        query = supabase.table("bom_headers").select("*").eq("company_id", company_id)
        
        if status:
            query = query.eq("status", status)
        
        response = query.order("created_at", desc=True).execute()
        
        boms = response.data if response.data else []
        
        # Fetch BOM lines for each BOM
        for bom in boms:
            lines_response = supabase.table("bom_lines").select("*").eq("bom_id", bom["id"]).execute()
            bom["lines"] = lines_response.data if lines_response.data else []
        
        return boms
    except Exception as e:
        logger.error(f"Error fetching BOMs: {e}")
        return []


@router.post("/bom")
def create_bom(
    bom_data: BOMCreate,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Create BOM using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        created_by = str(current_user.id)
        
        # Parse dates
        effective_date = None
        expiry_date = None
        if bom_data.effective_date:
            try:
                effective_date = date.fromisoformat(bom_data.effective_date).isoformat()
            except:
                pass
        
        # Create BOM header
        bom_insert = {
            "company_id": company_id,
            "product_id": bom_data.product_id,
            "version": bom_data.version,
            "status": "draft",
            "notes": bom_data.notes,
            "created_by": created_by,
        }
        
        if effective_date:
            bom_insert["effective_date"] = effective_date
        if expiry_date:
            bom_insert["expiry_date"] = expiry_date
        
        bom_response = supabase.table("bom_headers").insert(bom_insert).execute()
        
        if not bom_response.data:
            raise HTTPException(status_code=500, detail="Failed to create BOM")
        
        bom = bom_response.data[0]
        
        # Create BOM lines
        for line_data in bom_data.lines:
            line_insert = {
                "bom_id": bom["id"],
                "component_id": line_data.component_id,
                "quantity": line_data.quantity,
                "unit": line_data.unit,
                "waste_percent": line_data.waste_percent,
                "sequence": line_data.sequence,
            }
            supabase.table("bom_lines").insert(line_insert).execute()
        
        # Fetch complete BOM with lines
        complete_response = supabase.table("bom_headers").select("*").eq("id", bom["id"]).execute()
        lines_response = supabase.table("bom_lines").select("*").eq("bom_id", bom["id"]).execute()
        
        if complete_response.data:
            complete_bom = complete_response.data[0]
            complete_bom["lines"] = lines_response.data if lines_response.data else []
            return complete_bom
        
        return bom
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating BOM: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create BOM: {str(e)}")


@router.post("/bom/{bom_id}/activate")
def activate_bom(
    bom_id: int,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Activate BOM using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        
        # Check if BOM exists and belongs to company
        response = supabase.table("bom_headers").select("*").eq("id", bom_id).eq("company_id", company_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="BOM not found")
        
        # Update status to active
        update_response = supabase.table("bom_headers").update({"status": "active"}).eq("id", bom_id).execute()
        
        if update_response.data:
            return update_response.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to activate BOM")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating BOM: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to activate BOM: {str(e)}")


@router.get("/orders")
def get_production_orders(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get production orders using Supabase REST API"""
    if not supabase:
        logger.warning("Supabase client not available")
        return []
    
    try:
        company_id = str(current_user.company_id)
        query = supabase.table("production_orders").select("*").eq("company_id", company_id)
        
        if status:
            query = query.eq("status", status)
        
        response = query.order("created_at", desc=True).execute()
        
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching production orders: {e}")
        return []


@router.post("/orders")
def create_production_order(
    order_data: ProductionOrderCreate,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Create production order using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        created_by = str(current_user.id)
        
        order_insert = {
            "company_id": company_id,
            "bom_id": order_data.bom_id,
            "quantity": order_data.quantity,
            "status": "planned",
            "created_by": created_by,
        }
        
        if order_data.cost_center_id:
            order_insert["cost_center_id"] = order_data.cost_center_id
        if order_data.start_date:
            order_insert["start_date"] = order_data.start_date
        if order_data.end_date:
            order_insert["end_date"] = order_data.end_date
        if order_data.labor_rate:
            order_insert["labor_rate"] = order_data.labor_rate
        if order_data.notes:
            order_insert["notes"] = order_data.notes
        
        response = supabase.table("production_orders").insert(order_insert).execute()
        
        if response.data:
            return response.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to create production order")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating production order: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create production order: {str(e)}")


@router.get("/mrp")
def run_mrp(
    from_date: str,
    to_date: str,
    current_user: User = Depends(get_current_user)
):
    """Run Material Requirement Planning"""
    return {
        "planning_period": {"from": from_date, "to": to_date},
        "material_requirements": [],
        "summary": {"total_materials": 0, "shortages": 0}
    }
