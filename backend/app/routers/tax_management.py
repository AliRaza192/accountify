"""
Tax Management API Router
Endpoints: Tax rates, sales tax returns, WHT transactions, challans, reports
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
from app.models.tax_management import TaxRate, TaxReturn, WHTTransaction
from app.schemas.tax_management import (
    TaxRateCreate, TaxRateUpdate, TaxRateResponse,
    TaxReturnCreate, TaxReturnUpdate, TaxReturnResponse,
    WHTTransactionCreate, WHTTransactionResponse,
    WHTChallanRequest, WHTChallanResponse,
    NTNVerificationRequest, NTNVerificationResponse,
    SalesTaxReturnReport, InputOutputTaxReport, WHTSummaryReport
)
from app.services.tax_management_service import TaxManagementService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_service(db: Session = Depends(get_db)) -> TaxManagementService:
    """Get tax management service instance"""
    return TaxManagementService(db)


# ============ Tax Rate Endpoints ============

@router.get("/tax/rates", response_model=List[TaxRateResponse])
async def list_tax_rates(
    tax_type: Optional[str] = Query(None),
    is_active: bool = Query(True),
    effective_date: Optional[date] = Query(None),
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List all tax rates with optional filters"""
    try:
        rates = service.get_tax_rates(
            company_id=current_user.company_id,
            tax_type=tax_type,
            is_active=is_active,
            effective_date=effective_date
        )
        return rates
    except Exception as e:
        logger.error(f"Error listing tax rates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tax/rates", response_model=TaxRateResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_rate(
    rate: TaxRateCreate,
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new tax rate"""
    try:
        return service.create_tax_rate(
            company_id=current_user.company_id,
            rate_data=rate,
            created_by=current_user.id
        )
    except Exception as e:
        logger.error(f"Error creating tax rate: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tax/rates/{rate_id}", response_model=TaxRateResponse)
async def get_tax_rate(
    rate_id: UUID,
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a single tax rate by ID"""
    try:
        rate = service.get_tax_rate(current_user.company_id, rate_id)
        if not rate:
            raise HTTPException(status_code=404, detail="Tax rate not found")
        return rate
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tax rate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/tax/rates/{rate_id}", response_model=TaxRateResponse)
async def update_tax_rate(
    rate_id: UUID,
    update_data: TaxRateUpdate,
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update an existing tax rate"""
    try:
        rate = service.update_tax_rate(
            company_id=current_user.company_id,
            rate_id=rate_id,
            update_data=update_data
        )
        if not rate:
            raise HTTPException(status_code=404, detail="Tax rate not found")
        return rate
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating tax rate: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Sales Tax Return Endpoints ============

@router.get("/tax/sales-tax/return")
async def generate_sales_tax_return(
    period_month: int = Query(..., ge=1, le=12),
    period_year: int = Query(..., ge=2020),
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Sales Tax Return (SRB/FBR format)"""
    try:
        report = service.generate_sales_tax_return(
            company_id=current_user.company_id,
            period_month=period_month,
            period_year=period_year
        )
        return report
    except Exception as e:
        logger.error(f"Error generating sales tax return: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tax/sales-tax/return", response_model=TaxReturnResponse, status_code=status.HTTP_201_CREATED)
async def file_sales_tax_return(
    return_data: TaxReturnCreate,
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create/file a sales tax return"""
    try:
        return service.create_tax_return(
            company_id=current_user.company_id,
            return_data=return_data,
            created_by=current_user.id
        )
    except Exception as e:
        logger.error(f"Error filing sales tax return: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tax/returns", response_model=List[TaxReturnResponse])
async def list_tax_returns(
    status_filter: Optional[str] = Query(None, alias="status"),
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List all tax returns"""
    try:
        returns = service.get_tax_returns(
            company_id=current_user.company_id,
            status=status_filter
        )
        return returns
    except Exception as e:
        logger.error(f"Error listing tax returns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tax/returns/{return_id}", response_model=TaxReturnResponse)
async def get_tax_return(
    return_id: UUID,
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a single tax return by ID"""
    try:
        tax_return = service.get_tax_return(current_user.company_id, return_id)
        if not tax_return:
            raise HTTPException(status_code=404, detail="Tax return not found")
        return tax_return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tax return: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/tax/returns/{return_id}", response_model=TaxReturnResponse)
async def update_tax_return(
    return_id: UUID,
    update_data: TaxReturnUpdate,
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update an existing tax return"""
    try:
        tax_return = service.update_tax_return(
            company_id=current_user.company_id,
            return_id=return_id,
            update_data=update_data
        )
        if not tax_return:
            raise HTTPException(status_code=404, detail="Tax return not found")
        return tax_return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating tax return: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ WHT Transaction Endpoints ============

@router.get("/tax/wht/transactions", response_model=List[WHTTransactionResponse])
async def list_wht_transactions(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    wht_category: Optional[str] = Query(None),
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List WHT transactions with optional filters"""
    try:
        transactions = service.get_wht_transactions(
            company_id=current_user.company_id,
            from_date=from_date,
            to_date=to_date,
            wht_category=wht_category
        )
        return transactions
    except Exception as e:
        logger.error(f"Error listing WHT transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tax/wht/transactions", response_model=WHTTransactionResponse, status_code=status.HTTP_201_CREATED)
async def record_wht_transaction(
    txn: WHTTransactionCreate,
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Record a WHT deduction transaction"""
    try:
        return service.record_wht_transaction(
            company_id=current_user.company_id,
            transaction_data=txn,
            created_by=current_user.id
        )
    except Exception as e:
        logger.error(f"Error recording WHT transaction: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ WHT Challan Endpoints ============

@router.post("/tax/wht/challan")
async def generate_wht_challan(
    request: WHTChallanRequest,
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate WHT Challan for a given period"""
    try:
        result = service.generate_wht_challan(
            company_id=current_user.company_id,
            request=request,
            created_by=current_user.id
        )
        return result
    except Exception as e:
        logger.error(f"Error generating WHT challan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Tax Report Endpoints ============

@router.get("/tax/reports/input-output")
async def generate_input_output_report(
    period_month: int = Query(..., ge=1, le=12),
    period_year: int = Query(..., ge=2020),
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Input/Output Tax Report"""
    try:
        report = service.get_input_output_tax_report(
            company_id=current_user.company_id,
            period_month=period_month,
            period_year=period_year
        )
        return report
    except Exception as e:
        logger.error(f"Error generating input/output tax report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tax/reports/reconciliation")
async def generate_tax_reconciliation(
    period_month: int = Query(..., ge=1, le=12),
    period_year: int = Query(..., ge=2020),
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Tax Reconciliation Report"""
    try:
        report = service.get_tax_reconciliation(
            company_id=current_user.company_id,
            period_month=period_month,
            period_year=period_year
        )
        return report
    except Exception as e:
        logger.error(f"Error generating tax reconciliation report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tax/reports/wht-summary")
async def get_wht_summary(
    from_date: date = Query(...),
    to_date: date = Query(...),
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate WHT Summary Report"""
    try:
        report = service.get_wht_summary(
            company_id=current_user.company_id,
            from_date=from_date,
            to_date=to_date
        )
        return report
    except Exception as e:
        logger.error(f"Error generating WHT summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tax/reports/sales-summary")
async def generate_sales_summary(
    from_date: date = Query(...),
    to_date: date = Query(...),
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Sales Summary for Tax"""
    try:
        # Reuse the sales tax return generation but for a date range
        # For now, return empty - this can be enhanced to aggregate monthly data
        return {
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "total_sales": Decimal("0"),
            "total_output_tax": Decimal("0"),
            "message": "Use /tax/sales-tax/return for monthly breakdown"
        }
    except Exception as e:
        logger.error(f"Error generating sales summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tax/reports/purchase-summary")
async def generate_purchase_summary(
    from_date: date = Query(...),
    to_date: date = Query(...),
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Purchase Summary for Tax"""
    try:
        return {
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "total_purchases": Decimal("0"),
            "total_input_tax": Decimal("0"),
            "message": "Use /tax/sales-tax/return for monthly breakdown"
        }
    except Exception as e:
        logger.error(f"Error generating purchase summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ NTN Verification ============

@router.post("/tax/verify-ntn")
async def verify_ntn(
    request: NTNVerificationRequest,
    service: TaxManagementService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Verify NTN/STRN (manual verification)"""
    try:
        result = service.verify_ntn(
            company_id=current_user.company_id,
            request=request,
            verified_by=current_user.id
        )
        return result
    except Exception as e:
        logger.error(f"Error verifying NTN: {e}")
        raise HTTPException(status_code=400, detail=str(e))
