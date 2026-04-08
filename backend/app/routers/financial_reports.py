"""
Financial Reports Router
Endpoints: Cash Flow, Equity Statement, Financial Ratios, Funds Flow
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user
from app.services.financial_report_service import FinancialReportService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_service(db: Session = Depends(get_db)) -> FinancialReportService:
    """Get financial report service instance"""
    return FinancialReportService(db)


# ============ Cash Flow Statement ============

@router.get("/reports/advanced/cash-flow")
async def get_cash_flow_statement(
    fiscal_year: int = Query(..., ge=2000),
    service: FinancialReportService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Cash Flow Statement (Indirect Method)"""
    try:
        report = service.generate_cash_flow_statement(current_user.company_id, fiscal_year)
        return report
    except Exception as e:
        logger.error(f"Error generating cash flow statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Statement of Changes in Equity ============

@router.get("/reports/advanced/equity")
async def get_equity_statement(
    fiscal_year: int = Query(..., ge=2000),
    service: FinancialReportService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Statement of Changes in Equity"""
    try:
        report = service.generate_equity_statement(current_user.company_id, fiscal_year)
        return report
    except Exception as e:
        logger.error(f"Error generating equity statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Financial Ratio Analysis ============

@router.get("/reports/advanced/ratios")
async def get_financial_ratios(
    fiscal_year: int = Query(..., ge=2000),
    service: FinancialReportService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Financial Ratio Analysis Report"""
    try:
        ratios = service.calculate_financial_ratios(current_user.company_id, fiscal_year)
        return ratios
    except Exception as e:
        logger.error(f"Error calculating financial ratios: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Funds Flow Statement ============

@router.get("/reports/advanced/funds-flow")
async def get_funds_flow_statement(
    fiscal_year: int = Query(..., ge=2000),
    service: FinancialReportService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Funds Flow Statement"""
    try:
        report = service.generate_funds_flow_statement(current_user.company_id, fiscal_year)
        return report
    except Exception as e:
        logger.error(f"Error generating funds flow statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))
