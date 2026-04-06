"""Budget Router - Supabase REST API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.routers.auth import get_current_user, get_supabase_client
from app.types import User
from supabase import Client

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic Models
class BudgetLineCreate(BaseModel):
    account_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    jan: float = 0
    feb: float = 0
    mar: float = 0
    apr: float = 0
    may: float = 0
    jun: float = 0
    jul: float = 0
    aug: float = 0
    sep: float = 0
    oct: float = 0
    nov: float = 0
    dec: float = 0
    notes: Optional[str] = None


class BudgetCreate(BaseModel):
    fiscal_year: int
    name: str
    branch_id: Optional[int] = None
    lines: List[BudgetLineCreate] = []


@router.get("")
def get_budgets(
    fiscal_year: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get budgets using Supabase REST API"""
    if not supabase:
        logger.warning("Supabase client not available")
        return []
    
    try:
        company_id = str(current_user.company_id)
        query = supabase.table("budgets").select("*").eq("company_id", company_id)
        
        if fiscal_year:
            query = query.eq("fiscal_year", fiscal_year)
        if status:
            query = query.eq("status", status)
        
        response = query.order("created_at", desc=True).execute()
        
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error fetching budgets: {e}")
        return []


@router.post("")
def create_budget(
    budget_data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Create budget using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        created_by = str(current_user.id)
        
        # Create budget
        budget_insert = {
            "company_id": company_id,
            "fiscal_year": budget_data.fiscal_year,
            "name": budget_data.name,
            "status": "draft",
            "created_by": created_by,
        }
        
        if budget_data.branch_id:
            budget_insert["branch_id"] = budget_data.branch_id
        
        budget_response = supabase.table("budgets").insert(budget_insert).execute()
        
        if not budget_response.data:
            raise HTTPException(status_code=500, detail="Failed to create budget")
        
        budget = budget_response.data[0]
        
        # Create budget lines
        for line_data in budget_data.lines:
            total = (line_data.jan + line_data.feb + line_data.mar + 
                    line_data.apr + line_data.may + line_data.jun + 
                    line_data.jul + line_data.aug + line_data.sep + 
                    line_data.oct + line_data.nov + line_data.dec)
            
            line_insert = {
                "budget_id": budget["id"],
                "jan": line_data.jan,
                "feb": line_data.feb,
                "mar": line_data.mar,
                "apr": line_data.apr,
                "may": line_data.may,
                "jun": line_data.jun,
                "jul": line_data.jul,
                "aug": line_data.aug,
                "sep": line_data.sep,
                "oct": line_data.oct,
                "nov": line_data.nov,
                "dec": line_data.dec,
                "total": total,
                "notes": line_data.notes,
            }
            
            if line_data.account_id:
                line_insert["account_id"] = line_data.account_id
            if line_data.cost_center_id:
                line_insert["cost_center_id"] = line_data.cost_center_id
            
            supabase.table("budget_lines").insert(line_insert).execute()
        
        return budget
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating budget: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create budget: {str(e)}")


@router.get("/{budget_id}/vs-actual")
def get_budget_vs_actual(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get budget vs actual comparison using Supabase REST API"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    try:
        company_id = str(current_user.company_id)
        
        # Get budget
        response = supabase.table("budgets").select("*").eq("id", budget_id).eq("company_id", company_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        budget = response.data[0]
        
        # Get budget lines
        lines_response = supabase.table("budget_lines").select("*").eq("budget_id", budget_id).execute()
        lines = lines_response.data if lines_response.data else []
        
        # Calculate total budget
        total_budget = sum(line.get("total", 0) for line in lines)
        
        return {
            "budget_id": budget_id,
            "budget_name": budget["name"],
            "fiscal_year": budget["fiscal_year"],
            "lines": lines,
            "summary": {
                "total_budget": total_budget,
                "total_actual": 0,  # Would need to query journal entries
                "utilization_percent": 0
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching budget vs actual: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch budget comparison: {str(e)}")
