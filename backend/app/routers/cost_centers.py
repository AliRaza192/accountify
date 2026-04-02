"""
Cost Centers API Router
Endpoints: CRUD, allocation, P&L reports
"""

import logging
from typing import Any, Dict, List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user
from app.models.cost_centers import CostCenter, CostCenterAllocation
from app.schemas.cost_centers import (
    CostCenterCreate, CostCenterUpdate, CostCenterResponse,
    CostCenterAllocationCreate, CostCenterAllocationResponse,
    OverheadAllocationRequest, OverheadAllocationResponse,
    DepartmentPLReport
)

router = APIRouter()
logger = logging.getLogger(__name__)


def get_cost_center_or_404(db: Session, company_id: UUID, cost_center_id: UUID) -> CostCenter:
    """Get cost center or raise 404"""
    from sqlalchemy import select, and_
    query = select(CostCenter).where(
        and_(
            CostCenter.id == cost_center_id,
            CostCenter.company_id == company_id
        )
    )
    result = db.execute(query).scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Cost center not found")
    return result


# ============ Cost Center CRUD Endpoints ============

@router.get("", response_model=List[CostCenterResponse])
async def list_cost_centers(
    status_filter: Optional[str] = Query(None, alias="status"),
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all cost centers"""
    try:
        from sqlalchemy import select, and_
        query = select(CostCenter).where(CostCenter.company_id == current_user.company_id)
        
        if status_filter:
            query = query.where(CostCenter.status == status_filter)
        
        query = query.order_by(CostCenter.code)
        result = service.execute(query)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error listing cost centers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=CostCenterResponse, status_code=status.HTTP_201_CREATED)
async def create_cost_center(
    cost_center: CostCenterCreate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new cost center"""
    try:
        from sqlalchemy import select
        # Check if code already exists
        query = select(CostCenter).where(
            and_(
                CostCenter.company_id == current_user.company_id,
                CostCenter.code == cost_center.code
            )
        )
        if service.execute(query).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Cost center code already exists")
        
        db_cost_center = CostCenter(
            company_id=current_user.company_id,
            **cost_center.model_dump()
        )
        service.add(db_cost_center)
        service.commit()
        service.refresh(db_cost_center)
        return db_cost_center
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating cost center: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{cost_center_id}", response_model=CostCenterResponse)
async def get_cost_center(
    cost_center_id: UUID,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific cost center"""
    try:
        cost_center = get_cost_center_or_404(service, current_user.company_id, cost_center_id)
        return cost_center
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cost center: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{cost_center_id}", response_model=CostCenterResponse)
async def update_cost_center(
    cost_center_id: UUID,
    cost_center: CostCenterUpdate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing cost center"""
    try:
        db_cost_center = get_cost_center_or_404(service, current_user.company_id, cost_center_id)
        
        update_data = cost_center.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_cost_center, field, value)
        
        service.commit()
        service.refresh(db_cost_center)
        return db_cost_center
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating cost center: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{cost_center_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cost_center(
    cost_center_id: UUID,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a cost center"""
    try:
        db_cost_center = get_cost_center_or_404(service, current_user.company_id, cost_center_id)
        service.delete(db_cost_center)
        service.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting cost center: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Allocation Endpoints ============

@router.post("/{cost_center_id}/allocate", response_model=CostCenterAllocationResponse, status_code=status.HTTP_201_CREATED)
async def allocate_transaction(
    cost_center_id: UUID,
    allocation: CostCenterAllocationCreate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allocate a transaction to a cost center"""
    try:
        # Verify cost center exists
        get_cost_center_or_404(service, current_user.company_id, cost_center_id)
        
        db_allocation = CostCenterAllocation(
            company_id=current_user.company_id,
            cost_center_id=cost_center_id,
            **allocation.model_dump()
        )
        service.add(db_allocation)
        service.commit()
        service.refresh(db_allocation)
        return db_allocation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating allocation: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/allocate-overhead", response_model=OverheadAllocationResponse)
async def allocate_overhead(
    request: OverheadAllocationRequest,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allocate overhead to multiple cost centers"""
    try:
        from sqlalchemy import select
        from datetime import date
        
        # Verify all cost centers exist
        query = select(CostCenter).where(
            and_(
                CostCenter.company_id == current_user.company_id,
                CostCenter.id.in_(request.cost_center_ids)
            )
        )
        cost_centers = list(service.execute(query).scalars().all())
        
        if len(cost_centers) != len(request.cost_center_ids):
            raise HTTPException(status_code=400, detail="One or more cost centers not found")
        
        allocations = []
        
        if request.allocation_type == "equal_split":
            # Split equally among all cost centers
            amount_per_center = request.amount / len(cost_centers)
            for cc in cost_centers:
                allocation = CostCenterAllocation(
                    company_id=current_user.company_id,
                    cost_center_id=cc.id,
                    transaction_type="overhead",
                    transaction_id=service.execute(select(func.uuid_generate_v4())).scalar(),
                    amount=amount_per_center,
                    allocation_percent=Decimal(100) / len(cost_centers)
                )
                allocations.append(allocation)
                service.add(allocation)
        
        elif request.allocation_type == "percentage" and request.percentages:
            # Split by specified percentages
            if len(request.percentages) != len(cost_centers):
                raise HTTPException(status_code=400, detail="Percentages must match cost centers count")
            
            for cc, pct in zip(cost_centers, request.percentages):
                amount = request.amount * (pct / 100)
                allocation = CostCenterAllocation(
                    company_id=current_user.company_id,
                    cost_center_id=cc.id,
                    transaction_type="overhead",
                    transaction_id=service.execute(select(func.uuid_generate_v4())).scalar(),
                    amount=amount,
                    allocation_percent=pct
                )
                allocations.append(allocation)
                service.add(allocation)
        
        service.commit()
        
        return OverheadAllocationResponse(
            allocations_created=len(allocations),
            total_allocated=request.amount,
            cost_centers=[{"id": str(cc.id), "name": cc.name} for cc in cost_centers]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error allocating overhead: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Report Endpoints ============

@router.get("/{cost_center_id}/pl-report", response_model=DepartmentPLReport)
async def get_department_pl_report(
    cost_center_id: UUID,
    period_month: int = Query(None, ge=1, le=12),
    period_year: int = Query(None, ge=2020),
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate P&L report for a cost center"""
    try:
        from sqlalchemy import select, func
        from app.models.accounts import Account
        
        # Verify cost center exists
        cost_center = get_cost_center_or_404(service, current_user.company_id, cost_center_id)
        
        # Get allocations for this cost center
        query = select(CostCenterAllocation).where(
            CostCenterAllocation.cost_center_id == cost_center_id
        )
        allocations = list(service.execute(query).scalars().all())
        
        # Calculate totals (simplified - in production would join with actual transactions)
        total_revenue = Decimal('0')
        total_expenses = sum(a.amount for a in allocations if a.transaction_type == 'expense')
        
        # Build report
        report = DepartmentPLReport(
            cost_center_id=cost_center_id,
            cost_center_code=cost_center.code,
            cost_center_name=cost_center.name,
            period=f"{period_month or 'All'}/{period_year or 'All'}",
            revenue=total_revenue,
            direct_expenses=total_expenses,
            gross_profit=total_revenue - total_expenses,
            allocated_overhead=Decimal('0'),
            net_profit=total_revenue - total_expenses,
            line_items=[]
        )
        
        return report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating P&L report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/summary", response_model=List[Dict[str, Any]])
async def get_cost_center_summary(
    period_month: int = Query(None, ge=1, le=12),
    period_year: int = Query(None, ge=2020),
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get summary of all cost centers"""
    try:
        from sqlalchemy import select, func
        
        query = select(
            CostCenter.id,
            CostCenter.code,
            CostCenter.name,
            CostCenter.status,
            func.count(CostCenterAllocation.id).label('allocation_count'),
            func.sum(CostCenterAllocation.amount).label('total_amount')
        ).join(
            CostCenterAllocation,
            CostCenter.id == CostCenterAllocation.cost_center_id,
            isouter=True
        ).where(
            CostCenter.company_id == current_user.company_id
        ).group_by(
            CostCenter.id, CostCenter.code, CostCenter.name, CostCenter.status
        ).order_by(CostCenter.code)
        
        result = service.execute(query)
        return [
            {
                "id": str(row.id),
                "code": row.code,
                "name": row.name,
                "status": row.status,
                "allocation_count": row.allocation_count or 0,
                "total_amount": float(row.total_amount or 0)
            }
            for row in result
        ]
    except Exception as e:
        logger.error(f"Error getting cost center summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
