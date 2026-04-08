"""
Project Costing Router
Endpoints: Projects CRUD, cost allocation, profitability reports
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date
from uuid import UUID

from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user
from app.models.project_costing import Project, ProjectPhase, ProjectCost, ProjectRevenue
from app.schemas.project_costing import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectPhaseCreate, ProjectPhaseResponse,
    ProjectCostCreate, ProjectCostResponse,
    CostAllocationRequest,
    ProjectProfitabilityReport, BudgetVsActualReport
)
from app.services.project_service import ProjectService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_service(db: Session = Depends(get_db)) -> ProjectService:
    """Get project service instance"""
    return ProjectService(db)


# ============ Project Endpoints ============

@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(
    status_filter: Optional[str] = Query(None, alias="status"),
    service: ProjectService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List all projects with optional status filter"""
    try:
        projects = service.get_projects(
            company_id=current_user.company_id,
            status=status_filter
        )
        return projects
    except Exception as e:
        logger.error(f"Error listing projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    service: ProjectService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new project"""
    try:
        return service.create_project(
            company_id=current_user.company_id,
            project_data=project,
            created_by=current_user.id
        )
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    service: ProjectService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a single project by ID"""
    try:
        project = service.get_project(current_user.company_id, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    update_data: ProjectUpdate,
    service: ProjectService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update an existing project"""
    try:
        project = service.update_project(
            company_id=current_user.company_id,
            project_id=project_id,
            update_data=update_data
        )
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating project: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Cost Allocation Endpoints ============

@router.get("/projects/{project_id}/costs", response_model=List[ProjectCostResponse])
async def list_project_costs(
    project_id: UUID,
    service: ProjectService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List all costs for a project"""
    try:
        costs = service.get_project_costs(current_user.company_id, project_id)
        return costs
    except Exception as e:
        logger.error(f"Error listing project costs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/{project_id}/costs", response_model=ProjectCostResponse, status_code=status.HTTP_201_CREATED)
async def allocate_cost(
    project_id: UUID,
    cost_data: CostAllocationRequest,
    service: ProjectService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Allocate a cost to a project"""
    try:
        return service.allocate_cost(
            company_id=current_user.company_id,
            project_id=project_id,
            cost_data=cost_data,
            created_by=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error allocating cost: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Report Endpoints ============

@router.get("/projects/{project_id}/profitability")
async def get_profitability_report(
    project_id: UUID,
    service: ProjectService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Project Profitability Report"""
    try:
        report = service.calculate_profitability(current_user.company_id, project_id)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating profitability report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/budget-vs-actual")
async def get_budget_vs_actual(
    project_id: UUID,
    service: ProjectService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Budget vs Actual Report for Project"""
    try:
        report = service.get_budget_vs_actual(current_user.company_id, project_id)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating budget vs actual report: {e}")
        raise HTTPException(status_code=500, detail=str(e))
