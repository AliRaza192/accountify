"""
BI & Analytics Dashboard Router
Endpoints for KPI metrics, trends, financial ratios, top customers/products, and exports.
"""

import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user
from app.services.bi_service import BIDashboardService
from app.schemas.bi_dashboard import (
    KPIMetricsResponse,
    TrendDataPoint,
    ExpenseTrendResponse,
    FinancialRatiosResponse,
    CustomerMetric,
    ProductMetric,
    ExportResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_company_id(current_user: User) -> UUID:
    """Extract and validate company_id from authenticated user."""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not associated with any company",
        )
    return UUID(current_user.company_id)


# ==================== DASHBOARD KPI ====================


@router.get("/dashboard", response_model=KPIMetricsResponse)
async def get_dashboard_kpi(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get KPI metrics dashboard.
    Returns: Total Revenue, Total Expenses, Net Profit, Gross Margin %,
             Net Profit %, Current Ratio, Quick Ratio, DSO.
    """
    company_id = _get_company_id(current_user)
    logger.info(f"BI Dashboard KPI requested for company {company_id}, period {start_date} to {end_date}")

    try:
        service = BIDashboardService(db)
        metrics = service.get_kpi_metrics(company_id, start_date, end_date)

        return KPIMetricsResponse(**metrics)
    except Exception as e:
        logger.error(f"BI Dashboard KPI failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate KPI metrics: {str(e)}",
        )


# ==================== REVENUE TRENDS ====================


@router.get("/revenue-trends")
async def get_revenue_trends(
    months: int = Query(default=12, ge=1, le=60, description="Number of months (1-60)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get revenue trends with YoY comparison.
    Returns monthly revenue data for charting.
    """
    company_id = _get_company_id(current_user)
    logger.info(f"BI Revenue trends requested for company {company_id}, months={months}")

    try:
        service = BIDashboardService(db)
        trends = service.get_revenue_trends(company_id, months=months)

        return {
            "success": True,
            "data": trends,
            "message": "Revenue trends generated successfully",
        }
    except Exception as e:
        logger.error(f"BI Revenue trends failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate revenue trends: {str(e)}",
        )


# ==================== EXPENSE TRENDS ====================


@router.get("/expense-trends", response_model=ExpenseTrendResponse)
async def get_expense_trends(
    months: int = Query(default=12, ge=1, le=60, description="Number of months (1-60)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get expense trends by category.
    Returns monthly expense breakdown with category distribution.
    """
    company_id = _get_company_id(current_user)
    logger.info(f"BI Expense trends requested for company {company_id}, months={months}")

    try:
        service = BIDashboardService(db)
        data = service.get_expense_trends(company_id, months=months)

        return ExpenseTrendResponse(
            trends=[TrendDataPoint(**t) for t in data["trends"]],
            by_category=data["by_category"],
            total_expenses=data["total_expenses"],
        )
    except Exception as e:
        logger.error(f"BI Expense trends failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate expense trends: {str(e)}",
        )


# ==================== FINANCIAL RATIOS ====================


@router.get("/ratios", response_model=FinancialRatiosResponse)
async def get_financial_ratios(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get financial ratios analysis.
    Returns liquidity, profitability, efficiency, and leverage ratios.
    """
    company_id = _get_company_id(current_user)
    logger.info(f"BI Financial ratios requested for company {company_id}, period {start_date} to {end_date}")

    try:
        service = BIDashboardService(db)
        ratios = service.get_financial_ratios(company_id, start_date, end_date)

        return FinancialRatiosResponse(**ratios)
    except Exception as e:
        logger.error(f"BI Financial ratios failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate financial ratios: {str(e)}",
        )


# ==================== TOP CUSTOMERS ====================


@router.get("/top-customers")
async def get_top_customers(
    limit: int = Query(default=10, ge=1, le=100, description="Number of customers (1-100)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get top customers by revenue.
    """
    company_id = _get_company_id(current_user)
    logger.info(f"BI Top customers requested for company {company_id}, limit={limit}")

    try:
        service = BIDashboardService(db)
        customers = service.get_top_customers(company_id, limit=limit)

        return {
            "success": True,
            "data": [CustomerMetric(**c) for c in customers],
            "message": "Top customers retrieved successfully",
        }
    except Exception as e:
        logger.error(f"BI Top customers failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve top customers: {str(e)}",
        )


# ==================== TOP PRODUCTS ====================


@router.get("/top-products")
async def get_top_products(
    limit: int = Query(default=10, ge=1, le=100, description="Number of products (1-100)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get top products by sales.
    """
    company_id = _get_company_id(current_user)
    logger.info(f"BI Top products requested for company {company_id}, limit={limit}")

    try:
        service = BIDashboardService(db)
        products = service.get_top_products(company_id, limit=limit)

        return {
            "success": True,
            "data": [ProductMetric(**p) for p in products],
            "message": "Top products retrieved successfully",
        }
    except Exception as e:
        logger.error(f"BI Top products failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve top products: {str(e)}",
        )


# ==================== EXPORT TO EXCEL ====================


@router.get("/export", response_model=ExportResponse)
async def export_dashboard(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export all BI metrics to Excel file.
    Returns base64-encoded file download URL.
    """
    company_id = _get_company_id(current_user)
    logger.info(f"BI Export requested for company {company_id}, period {start_date} to {end_date}")

    try:
        service = BIDashboardService(db)
        result = service.export_to_excel(company_id, start_date, end_date)

        return ExportResponse(**result)
    except Exception as e:
        logger.error(f"BI Export failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export dashboard: {str(e)}",
        )
