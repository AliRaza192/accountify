"""
Fixed Assets API Router
Endpoints: CRUD, depreciation, disposal, maintenance, reports
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
from app.models.fixed_assets import FixedAsset, AssetCategory
from app.schemas.fixed_assets import (
    FixedAssetCreate, FixedAssetUpdate, FixedAssetResponse, FixedAssetWithDepreciation,
    AssetCategoryCreate, AssetCategoryUpdate, AssetCategoryResponse,
    AssetDepreciationRun, AssetDepreciationResponse,
    AssetMaintenanceCreate, AssetMaintenanceResponse,
    AssetDisposalRequest, AssetDisposalResponse,
    FixedAssetRegisterItem, DepreciationScheduleItem
)
from app.services.fixed_asset_service import FixedAssetService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_service(db: Session = Depends(get_db)) -> FixedAssetService:
    """Get fixed asset service instance"""
    return FixedAssetService(db)


# ============ Asset Category Endpoints ============

@router.get("/asset-categories", response_model=List[AssetCategoryResponse])
async def list_asset_categories(
    include_inactive: bool = False,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List all asset categories"""
    try:
        categories = service.get_categories(
            company_id=current_user.company_id,
            include_inactive=include_inactive
        )
        return categories
    except Exception as e:
        logger.error(f"Error listing asset categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/asset-categories", response_model=AssetCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_asset_category(
    category: AssetCategoryCreate,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new asset category"""
    try:
        return service.create_category(
            company_id=current_user.company_id,
            category_data=category.model_dump()
        )
    except Exception as e:
        logger.error(f"Error creating asset category: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Fixed Asset Endpoints ============

@router.get("", response_model=List[FixedAssetWithDepreciation])
async def list_fixed_assets(
    status_filter: Optional[str] = Query(None, alias="status"),
    category_id: Optional[UUID] = None,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """List all fixed assets with optional filters"""
    try:
        assets = service.get_assets(
            company_id=current_user.company_id,
            status=status_filter,
            category_id=category_id
        )
        return assets
    except Exception as e:
        logger.error(f"Error listing fixed assets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{asset_id}", response_model=FixedAssetWithDepreciation)
async def get_fixed_asset(
    asset_id: UUID,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get a specific fixed asset by ID"""
    try:
        asset = service.get_asset(current_user.company_id, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        return asset
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting fixed asset: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=FixedAssetResponse, status_code=status.HTTP_201_CREATED)
async def create_fixed_asset(
    asset: FixedAssetCreate,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Create a new fixed asset"""
    try:
        return service.create_asset(
            company_id=current_user.company_id,
            asset_data=asset,
            created_by=current_user.id
        )
    except Exception as e:
        logger.error(f"Error creating fixed asset: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{asset_id}", response_model=FixedAssetResponse)
async def update_fixed_asset(
    asset_id: UUID,
    asset: FixedAssetUpdate,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Update an existing fixed asset"""
    try:
        updated = service.update_asset(
            company_id=current_user.company_id,
            asset_id=asset_id,
            asset_data=asset
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Asset not found")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating fixed asset: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fixed_asset(
    asset_id: UUID,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Delete (soft) a fixed asset"""
    try:
        success = service.delete_asset(current_user.company_id, asset_id)
        if not success:
            raise HTTPException(status_code=404, detail="Asset not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting fixed asset: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Depreciation Endpoints ============

@router.post("/run-depreciation", response_model=dict)
async def run_depreciation(
    run_data: AssetDepreciationRun,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Run monthly depreciation for all assets"""
    try:
        result = service.run_monthly_depreciation(
            company_id=current_user.company_id,
            run_data=run_data,
            posted_by=current_user.id
        )
        return result
    except Exception as e:
        logger.error(f"Error running depreciation: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/depreciation/{asset_id}", response_model=List[AssetDepreciationResponse])
async def get_asset_depreciation(
    asset_id: UUID,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get depreciation history for an asset"""
    try:
        asset = service.get_asset(current_user.company_id, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        return asset.depreciation_records
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting depreciation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Asset Disposal Endpoints ============

@router.post("/{asset_id}/disposal", response_model=AssetDisposalResponse)
async def dispose_asset(
    asset_id: UUID,
    disposal_data: AssetDisposalRequest,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Dispose/sell a fixed asset"""
    try:
        result = service.dispose_asset(
            company_id=current_user.company_id,
            asset_id=asset_id,
            disposal_data=disposal_data,
            posted_by=current_user.id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error disposing asset: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Maintenance Endpoints ============

@router.post("/{asset_id}/maintenance", response_model=AssetMaintenanceResponse, status_code=status.HTTP_201_CREATED)
async def log_maintenance(
    asset_id: UUID,
    maintenance: AssetMaintenanceCreate,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Log maintenance for a fixed asset"""
    try:
        asset = service.get_asset(current_user.company_id, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        return service.log_maintenance(
            company_id=current_user.company_id,
            asset_id=asset_id,
            maintenance_data=maintenance
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging maintenance: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{asset_id}/maintenance", response_model=List[AssetMaintenanceResponse])
async def get_maintenance_history(
    asset_id: UUID,
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Get maintenance history for an asset"""
    try:
        asset = service.get_asset(current_user.company_id, asset_id)
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        return service.get_maintenance_history(asset_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting maintenance history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Report Endpoints ============

@router.get("/reports/register", response_model=List[FixedAssetRegisterItem])
async def get_fixed_asset_register(
    as_of_date: date = Query(default_factory=date.today),
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate Fixed Asset Register report"""
    try:
        return service.get_fixed_asset_register(
            company_id=current_user.company_id,
            as_of_date=as_of_date
        )
    except Exception as e:
        logger.error(f"Error generating Fixed Asset Register: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/depreciation-schedule")
async def get_depreciation_schedule(
    asset_id: Optional[UUID] = None,
    year: int = Query(default_factory=lambda: date.today().year),
    service: FixedAssetService = Depends(get_service),
    current_user: User = Depends(get_current_user)
):
    """Generate depreciation schedule report"""
    try:
        # This would be implemented in the service
        return {"message": "Depreciation schedule report - to be implemented", "year": year}
    except Exception as e:
        logger.error(f"Error generating depreciation schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))
