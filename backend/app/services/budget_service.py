"""
Budget Service
Handles budget CRUD, variance calculations, and budget vs actual comparisons
"""

import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.models.budget import Budget, BudgetLine
from app.schemas.budget import BudgetCreate, BudgetUpdate

logger = logging.getLogger(__name__)


class BudgetService:
    """Service for budget management"""

    def __init__(self, db: Session):
        self.db = db

    # ============ Budget CRUD Operations ============

    def get_budgets(
        self,
        company_id: UUID,
        fiscal_year: Optional[int] = None,
        status: Optional[str] = None
    ) -> List[Budget]:
        """Get budgets with optional filters"""
        query = select(Budget).where(Budget.company_id == company_id)

        if fiscal_year:
            query = query.where(Budget.fiscal_year == fiscal_year)
        if status:
            query = query.where(Budget.status == status)

        result = self.db.execute(query.order_by(Budget.fiscal_year.desc()))
        return list(result.scalars().all())

    def get_budget(self, company_id: UUID, budget_id: UUID) -> Optional[Budget]:
        """Get a single budget by ID"""
        query = select(Budget).where(
            and_(
                Budget.id == budget_id,
                Budget.company_id == company_id
            )
        ).options(joinedload(Budget.lines))
        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def create_budget(self, company_id: UUID, budget_data: BudgetCreate, created_by: UUID) -> Budget:
        """Create a new budget"""
        budget = Budget(
            company_id=company_id,
            created_by=created_by,
            **budget_data.model_dump(exclude={'lines'})
        )
        self.db.add(budget)
        self.db.flush()

        # Add budget lines
        if budget_data.lines:
            for line_data in budget_data.lines:
                line = BudgetLine(budget_id=budget.id, **line_data.model_dump())
                self.db.add(line)

        self.db.commit()
        self.db.refresh(budget)
        logger.info(f"Created budget: {budget.budget_name} for FY {budget.fiscal_year}")
        return budget

    def update_budget(
        self,
        company_id: UUID,
        budget_id: UUID,
        update_data: BudgetUpdate
    ) -> Optional[Budget]:
        """Update an existing budget"""
        budget = self.get_budget(company_id, budget_id)
        if not budget:
            return None

        for field, value in update_data.model_dump(exclude_unset=True).items():
            if field != 'lines':
                setattr(budget, field, value)

        self.db.commit()
        self.db.refresh(budget)
        logger.info(f"Updated budget: {budget.id}")
        return budget

    def delete_budget(self, company_id: UUID, budget_id: UUID) -> bool:
        """Delete a budget (only if in draft status)"""
        budget = self.get_budget(company_id, budget_id)
        if not budget:
            return False

        if budget.status != 'draft':
            raise ValueError("Cannot delete approved budget")

        self.db.delete(budget)
        self.db.commit()
        logger.info(f"Deleted budget: {budget_id}")
        return True

    # ============ Budget vs Actual Comparison ============

    def get_budget_vs_actual(
        self,
        company_id: UUID,
        budget_id: UUID,
        period_month: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get budget vs actual comparison.
        Returns budgeted amounts, actual spending, and variances.
        """
        budget = self.get_budget(company_id, budget_id)
        if not budget:
            raise ValueError("Budget not found")

        # Try to get actual transactions from expenses/journals
        actual_data = self._fetch_actual_spending(company_id, budget.fiscal_year, period_month)

        # Calculate budget totals
        budget_lines = budget.lines or []
        total_budgeted = sum(
            line.jan + line.feb + line.mar + line.apr + line.may + line.jun +
            line.jul + line.aug + line.sep + line.oct + line.nov + line.dec
            for line in budget_lines
        )

        total_actual = sum(line.get('actual_amount', 0) for line in actual_data)
        total_variance = total_budgeted - total_actual
        variance_percent = (total_variance / total_budgeted * 100) if total_budgeted > 0 else 0

        return {
            "budget_id": str(budget.id),
            "budget_name": budget.budget_name,
            "fiscal_year": budget.fiscal_year,
            "period_month": period_month,
            "total_budgeted": total_budgeted,
            "total_actual": total_actual,
            "total_variance": total_variance,
            "variance_percent": variance_percent,
            "lines": [
                {
                    "account_id": line.account_id,
                    "cost_center_id": line.cost_center_id,
                    "budgeted_amount": (
                        line.jan + line.feb + line.mar + line.apr + line.may + line.jun +
                        line.jul + line.aug + line.sep + line.oct + line.nov + line.dec
                    ),
                    "actual_amount": next(
                        (a.get('actual_amount', 0) for a in actual_data
                         if a.get('account_id') == line.account_id),
                        0
                    ),
                    "variance": 0  # Will be calculated per line
                }
                for line in budget_lines
            ]
        }

    def get_budget_variance_report(
        self,
        company_id: UUID,
        fiscal_year: int,
        include_monthly: bool = False
    ) -> Dict[str, Any]:
        """
        Generate budget variance report showing utilization percentages
        and over/under budget categories.
        """
        budgets = self.get_budgets(company_id, fiscal_year=fiscal_year)
        report_data = []

        for budget in budgets:
            vs_actual = self.get_budget_vs_actual(company_id, budget.id)
            report_data.append(vs_actual)

        return {
            "fiscal_year": fiscal_year,
            "include_monthly": include_monthly,
            "budgets": report_data,
            "generated_at": date.today().isoformat()
        }

    # ============ Helper Methods ============

    def _fetch_actual_spending(
        self,
        company_id: UUID,
        fiscal_year: int,
        month: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch actual spending from expenses/journal entries.
        This is a placeholder - in production, query actual expense tables.
        """
        # TODO: Implement actual fetching from expense tables
        # For now, return empty - the frontend will show zeros until data exists
        logger.info(f"Fetching actual spending for FY {fiscal_year}, month {month}")
        return []

    def _check_budget_alerts(
        self,
        company_id: UUID,
        budget_id: UUID,
        account_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Check if spending has exceeded budget thresholds.
        Returns list of alerts for accounts nearing or exceeding budget.
        """
        # TODO: Implement threshold checking
        # Trigger when spending reaches 90% and 100% of budget
        return []
