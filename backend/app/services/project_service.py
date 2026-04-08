"""
Project Service
Handles project CRUD, cost allocation, profitability calculation, budget tracking
"""

import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.models.project_costing import Project, ProjectPhase, ProjectCost, ProjectRevenue
from app.schemas.project_costing import (
    ProjectCreate, ProjectUpdate, CostAllocationRequest
)

logger = logging.getLogger(__name__)


class ProjectService:
    """Service for project costing operations"""

    def __init__(self, db: Session):
        self.db = db

    # ============ Project CRUD Operations ============

    def get_projects(
        self,
        company_id: UUID,
        status: Optional[str] = None,
        client_id: Optional[UUID] = None
    ) -> List[Project]:
        """Get projects with optional filters"""
        query = select(Project).where(Project.company_id == company_id)

        if status:
            query = query.where(Project.status == status)
        if client_id:
            query = query.where(Project.client_id == client_id)

        result = self.db.execute(
            query
            .options(joinedload(Project.phases))
            .order_by(Project.start_date.desc())
        )
        return list(result.scalars().unique().all())

    def get_project(self, company_id: UUID, project_id: UUID) -> Optional[Project]:
        """Get a single project by ID with all relationships"""
        query = (
            select(Project)
            .where(
                and_(
                    Project.id == project_id,
                    Project.company_id == company_id
                )
            )
            .options(
                joinedload(Project.phases).joinedload(ProjectPhase.costs),
                joinedload(Project.costs),
                joinedload(Project.revenue)
            )
        )
        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def create_project(self, company_id: UUID, project_data: ProjectCreate, created_by: UUID) -> Project:
        """Create a new project"""
        project = Project(
            company_id=company_id,
            created_by=created_by,
            **project_data.model_dump()
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        logger.info(f"Created project: {project.project_code} - {project.project_name}")
        return project

    def update_project(
        self,
        company_id: UUID,
        project_id: UUID,
        update_data: ProjectUpdate
    ) -> Optional[Project]:
        """Update an existing project"""
        project = self.get_project(company_id, project_id)
        if not project:
            return None

        for field, value in update_data.model_dump(exclude_unset=True).items():
            setattr(project, field, value)

        self.db.commit()
        self.db.refresh(project)
        logger.info(f"Updated project: {project.project_code}")
        return project

    def delete_project(self, company_id: UUID, project_id: UUID) -> bool:
        """Delete a project (only if no costs allocated)"""
        project = self.get_project(company_id, project_id)
        if not project:
            return False

        # Check if project has costs
        cost_count = self.db.query(func.count(ProjectCost.id)).filter(
            ProjectCost.project_id == project_id
        ).scalar()

        if cost_count > 0:
            raise ValueError("Cannot delete project with allocated costs")

        self.db.delete(project)
        self.db.commit()
        logger.info(f"Deleted project: {project_id}")
        return True

    # ============ Cost Allocation ============

    def allocate_cost(
        self,
        company_id: UUID,
        project_id: UUID,
        cost_data: CostAllocationRequest,
        created_by: UUID
    ) -> ProjectCost:
        """Allocate a cost to a project"""
        # Verify project exists and belongs to company
        project = self.get_project(company_id, project_id)
        if not project:
            raise ValueError("Project not found")

        # Verify phase belongs to project if provided
        if cost_data.phase_id:
            phase = self.db.query(ProjectPhase).filter(
                and_(
                    ProjectPhase.id == cost_data.phase_id,
                    ProjectPhase.project_id == project_id
                )
            ).first()
            if not phase:
                raise ValueError("Phase not found or does not belong to project")

        cost = ProjectCost(
            company_id=company_id,
            project_id=project_id,
            created_by=created_by,
            **cost_data.model_dump()
        )
        self.db.add(cost)
        self.db.commit()
        self.db.refresh(cost)
        logger.info(
            f"Allocated cost: {cost.cost_category} - PKR {cost.amount} "
            f"to project {project.project_code}"
        )
        return cost

    def get_project_costs(
        self,
        company_id: UUID,
        project_id: UUID,
        category: Optional[str] = None
    ) -> List[ProjectCost]:
        """Get all costs for a project"""
        query = select(ProjectCost).where(
            and_(
                ProjectCost.project_id == project_id,
                ProjectCost.company_id == company_id
            )
        )

        if category:
            query = query.where(ProjectCost.cost_category == category)

        result = self.db.execute(query.order_by(ProjectCost.allocated_date.desc()))
        return list(result.scalars().all())

    # ============ Profitability Calculation ============

    def calculate_profitability(
        self,
        company_id: UUID,
        project_id: UUID
    ) -> Dict[str, Any]:
        """
        Calculate project profitability.
        Returns: revenue, costs, gross_profit, profit_margin_pct
        """
        project = self.get_project(company_id, project_id)
        if not project:
            raise ValueError("Project not found")

        # Calculate total revenue
        revenue_query = select(func.sum(ProjectRevenue.amount)).where(
            ProjectRevenue.project_id == project_id
        )
        total_revenue = self.db.execute(revenue_query).scalar() or Decimal("0")

        # Calculate total costs
        cost_query = select(func.sum(ProjectCost.amount)).where(
            ProjectCost.project_id == project_id
        )
        total_costs = self.db.execute(cost_query).scalar() or Decimal("0")

        # Calculate gross profit and margin
        gross_profit = total_revenue - total_costs
        profit_margin_pct = (gross_profit / total_revenue * 100) if total_revenue > 0 else Decimal("0")

        # Phase breakdown
        phases = project.phases or []
        phase_breakdown = []
        for phase in phases:
            phase_costs = self.db.execute(
                select(func.sum(ProjectCost.amount)).where(
                    ProjectCost.phase_id == phase.id
                )
            ).scalar() or Decimal("0")

            phase_breakdown.append({
                "phase_id": str(phase.id),
                "phase_name": phase.phase_name,
                "budget_allocated": phase.budget_allocated,
                "actual_costs": phase_costs,
                "variance": phase.budget_allocated - phase_costs,
                "completion_pct": phase.completion_pct
            })

        # Cost category breakdown
        category_query = (
            select(
                ProjectCost.cost_category,
                func.sum(ProjectCost.amount).label("total_amount"),
                func.count(ProjectCost.id).label("count")
            )
            .where(ProjectCost.project_id == project_id)
            .group_by(ProjectCost.cost_category)
        )
        category_result = self.db.execute(category_query)
        cost_category_breakdown = [
            {
                "category": row[0],
                "total_amount": row[1],
                "count": row[2]
            }
            for row in category_result.all()
        ]

        return {
            "project_id": str(project.id),
            "project_code": project.project_code,
            "project_name": project.project_name,
            "budget": project.budget,
            "total_revenue": total_revenue.quantize(Decimal("0.01")),
            "total_costs": total_costs.quantize(Decimal("0.01")),
            "gross_profit": gross_profit.quantize(Decimal("0.01")),
            "profit_margin_pct": profit_margin_pct.quantize(Decimal("0.01")),
            "phase_breakdown": phase_breakdown,
            "cost_category_breakdown": cost_category_breakdown
        }

    # ============ Budget vs Actual ============

    def get_budget_vs_actual(
        self,
        company_id: UUID,
        project_id: UUID
    ) -> Dict[str, Any]:
        """
        Get budget vs actual comparison for project.
        Returns budget, actual, variance at project and phase level
        """
        project = self.get_project(company_id, project_id)
        if not project:
            raise ValueError("Project not found")

        # Calculate total actual costs
        cost_query = select(func.sum(ProjectCost.amount)).where(
            ProjectCost.project_id == project_id
        )
        actual_total = self.db.execute(cost_query).scalar() or Decimal("0")

        budget_total = project.budget
        variance = budget_total - actual_total
        variance_pct = (variance / budget_total * 100) if budget_total > 0 else Decimal("0")

        # Phase breakdown
        phases = project.phases or []
        phase_breakdown = []
        for phase in phases:
            phase_costs = self.db.execute(
                select(func.sum(ProjectCost.amount)).where(
                    ProjectCost.phase_id == phase.id
                )
            ).scalar() or Decimal("0")

            phase_variance = phase.budget_allocated - phase_costs
            phase_variance_pct = (
                (phase_variance / phase.budget_allocated * 100)
                if phase.budget_allocated > 0 else Decimal("0")
            )

            phase_breakdown.append({
                "phase_id": str(phase.id),
                "phase_name": phase.phase_name,
                "budget_allocated": phase.budget_allocated,
                "actual_costs": phase_costs.quantize(Decimal("0.01")),
                "variance": phase_variance.quantize(Decimal("0.01")),
                "variance_pct": phase_variance_pct.quantize(Decimal("0.01"))
            })

        return {
            "project_id": str(project.id),
            "project_code": project.project_code,
            "project_name": project.project_name,
            "budget_total": budget_total.quantize(Decimal("0.01")),
            "actual_total": actual_total.quantize(Decimal("0.01")),
            "variance": variance.quantize(Decimal("0.01")),
            "variance_pct": variance_pct.quantize(Decimal("0.01")),
            "phase_breakdown": phase_breakdown
        }
