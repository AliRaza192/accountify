"""Budget Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.budget import Budget, BudgetLine
from app.routers.auth import get_current_user
from app.types import User

router = APIRouter()


@router.get("")
def get_budgets(
    fiscal_year: int = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get budgets"""
    company_id = current_user.company_id
    query = db.query(Budget).filter(Budget.company_id == company_id)
    if fiscal_year:
        query = query.filter(Budget.fiscal_year == fiscal_year)
    if status:
        query = query.filter(Budget.status == status)
    return query.all()


@router.post("")
def create_budget(
    budget_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create budget"""
    company_id = current_user.company_id
    lines_data = budget_data.pop("lines", [])

    budget = Budget(company_id=company_id, **budget_data)
    db.add(budget)
    db.commit()
    db.refresh(budget)

    for line_data in lines_data:
        line = BudgetLine(budget_id=budget.id, **line_data)
        db.add(line)

    db.commit()
    db.refresh(budget)
    return budget


@router.get("/{budget_id}/vs-actual")
def get_budget_vs_actual(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get budget vs actual comparison"""
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.company_id == current_user.company_id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    # Query actuals from journal entries
    fiscal_year = budget.fiscal_year
    actuals = db.query(
        BudgetLine.account_id,
        # Simplified: sum journal entry amounts for this account in this year
    ).filter(False).all()  # Placeholder - would need proper journal query

    return {
        "budget_id": budget_id,
        "budget_name": budget.name,
        "fiscal_year": fiscal_year,
        "lines": [],
        "summary": {
            "total_budget": float(budget.total_amount or 0),
            "total_actual": 0,
            "utilization_percent": 0
        }
    }
