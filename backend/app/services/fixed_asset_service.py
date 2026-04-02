"""
Fixed Asset Service
Handles CRUD operations, depreciation calculations (SLM/WDV), and disposal
"""

import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from supabase import Client

from app.models.fixed_assets import FixedAsset, AssetCategory, AssetDepreciation, AssetMaintenance
from app.schemas.fixed_assets import (
    FixedAssetCreate, FixedAssetUpdate, AssetDepreciationRun,
    AssetDisposalRequest, AssetMaintenanceCreate
)
from app.database import get_supabase_client

logger = logging.getLogger(__name__)


class FixedAssetService:
    """Service for fixed asset management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ============ Asset Category Operations ============
    
    def get_categories(self, company_id: UUID, include_inactive: bool = False) -> List[AssetCategory]:
        """Get all asset categories for a company"""
        query = select(AssetCategory).where(AssetCategory.company_id == company_id)
        if not include_inactive:
            query = query.where(AssetCategory.is_active == True)
        result = self.db.execute(query.order_by(AssetCategory.name))
        return list(result.scalars().all())
    
    def create_category(self, company_id: UUID, category_data: Dict[str, Any]) -> AssetCategory:
        """Create a new asset category"""
        category = AssetCategory(
            company_id=company_id,
            **category_data
        )
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        logger.info(f"Created asset category: {category.name}")
        return category
    
    # ============ Fixed Asset CRUD Operations ============
    
    def get_assets(
        self,
        company_id: UUID,
        status: Optional[str] = None,
        category_id: Optional[UUID] = None
    ) -> List[FixedAsset]:
        """Get fixed assets with optional filters"""
        query = select(FixedAsset).where(FixedAsset.company_id == company_id)
        
        if status:
            query = query.where(FixedAsset.status == status)
        if category_id:
            query = query.where(FixedAsset.category_id == category_id)
        
        query = query.options(joinedload(FixedAsset.category))
        result = self.db.execute(query.order_by(FixedAsset.asset_code))
        return list(result.scalars().all())
    
    def get_asset(self, company_id: UUID, asset_id: UUID) -> Optional[FixedAsset]:
        """Get a single asset by ID"""
        query = select(FixedAsset).where(
            and_(
                FixedAsset.id == asset_id,
                FixedAsset.company_id == company_id
            )
        ).options(joinedload(FixedAsset.category))
        result = self.db.execute(query)
        return result.scalar_one_or_none()
    
    def create_asset(self, company_id: UUID, asset_data: FixedAssetCreate, created_by: UUID) -> FixedAsset:
        """Create a new fixed asset"""
        asset = FixedAsset(
            company_id=company_id,
            created_by=created_by,
            **asset_data.model_dump()
        )
        self.db.add(asset)
        self.db.commit()
        self.db.refresh(asset)
        logger.info(f"Created fixed asset: {asset.asset_code} - {asset.name}")
        return asset
    
    def update_asset(
        self,
        company_id: UUID,
        asset_id: UUID,
        asset_data: FixedAssetUpdate
    ) -> Optional[FixedAsset]:
        """Update an existing asset"""
        asset = self.get_asset(company_id, asset_id)
        if not asset:
            return None
        
        update_data = asset_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(asset, field, value)
        
        self.db.commit()
        self.db.refresh(asset)
        logger.info(f"Updated fixed asset: {asset.asset_code}")
        return asset
    
    def delete_asset(self, company_id: UUID, asset_id: UUID) -> bool:
        """Delete an asset (soft delete by changing status)"""
        asset = self.get_asset(company_id, asset_id)
        if not asset:
            return False
        
        asset.status = "disposed"
        self.db.commit()
        logger.info(f"Deleted (soft) fixed asset: {asset.asset_code}")
        return True
    
    # ============ Depreciation Calculation Methods ============
    
    def calculate_depreciation_slm(
        self,
        asset: FixedAsset,
        months_held: int
    ) -> Decimal:
        """
        Calculate depreciation using Straight Line Method (SLM)
        Formula: (Cost - Residual Value) / Useful Life in Months * Months Held
        """
        depreciable_amount = asset.depreciable_amount
        monthly_depreciation = depreciable_amount / asset.useful_life_months
        depreciation = monthly_depreciation * months_held
        
        # Cap at depreciable amount
        return min(depreciation, depreciable_amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def calculate_depreciation_wdv(
        self,
        asset: FixedAsset,
        book_value: Decimal,
        months_held: int
    ) -> Decimal:
        """
        Calculate depreciation using Written Down Value method (WDV)
        Formula: Book Value * Depreciation Rate * (Months Held / 12)
        """
        annual_rate = Decimal(str(asset.depreciation_rate_percent)) / 100
        monthly_rate = annual_rate / 12
        depreciation = book_value * monthly_rate * months_held
        
        # Cap at depreciable amount remaining
        depreciable_remaining = asset.depreciable_amount - (asset.purchase_cost - book_value)
        return min(depreciation, depreciable_remaining).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def get_asset_book_value(self, asset_id: UUID) -> Tuple[Decimal, Decimal]:
        """Get current book value and accumulated depreciation for an asset"""
        query = select(
            func.coalesce(func.sum(AssetDepreciation.depreciation_amount), 0),
            func.coalesce(func.max(AssetDepreciation.book_value), 0)
        ).where(AssetDepreciation.asset_id == asset_id)
        
        result = self.db.execute(query).first()
        accumulated_depreciation = Decimal(str(result[0])) if result else Decimal('0')
        
        # Get latest book value or use purchase cost
        latest_book_value_query = select(AssetDepreciation.book_value).where(
            AssetDepreciation.asset_id == asset_id
        ).order_by(AssetDepreciation.period_year.desc(), AssetDepreciation.period_month.desc())
        
        latest_book_value = self.db.execute(latest_book_value_query).scalar_one_or_none()
        book_value = Decimal(str(latest_book_value)) if latest_book_value else None
        
        return book_value, accumulated_depreciation
    
    def run_monthly_depreciation(
        self,
        company_id: UUID,
        run_data: AssetDepreciationRun,
        posted_by: UUID
    ) -> Dict[str, Any]:
        """
        Run monthly depreciation for all active assets
        Creates journal entries: Dr Depreciation Expense, Cr Accumulated Depreciation
        """
        logger.info(f"Running depreciation for {run_data.period_month}/{run_data.period_year}")

        # Get all active assets
        assets = self.get_assets(company_id, status="active")
        if run_data.asset_id:
            assets = [a for a in assets if a.id == run_data.asset_id]

        assets_depreciated = 0
        total_depreciation = Decimal('0')
        journal_entries_created = 0
        
        # Get Supabase client for journal entry creation
        supabase: Client = get_supabase_client()

        for asset in assets:
            try:
                # Check if already depreciated for this period
                existing = self.db.execute(
                    select(AssetDepreciation).where(
                        and_(
                            AssetDepreciation.asset_id == asset.id,
                            AssetDepreciation.period_month == run_data.period_month,
                            AssetDepreciation.period_year == run_data.period_year
                        )
                    )
                ).scalar_one_or_none()

                if existing:
                    logger.info(f"Asset {asset.asset_code} already depreciated for this period")
                    continue

                # Get current book value
                book_value, accumulated_dep = self.get_asset_book_value(asset.id)
                if book_value is None:
                    book_value = asset.purchase_cost

                # Check if fully depreciated
                if book_value <= asset.residual_value:
                    logger.info(f"Asset {asset.asset_code} fully depreciated")
                    continue

                # Calculate depreciation
                months_held = 1  # Monthly depreciation
                if asset.depreciation_method == "SLM":
                    depreciation_amount = self.calculate_depreciation_slm(asset, months_held)
                else:  # WDV
                    depreciation_amount = self.calculate_depreciation_wdv(asset, book_value, months_held)

                if depreciation_amount <= 0:
                    continue

                # Calculate new book value
                new_book_value = book_value - depreciation_amount
                new_accumulated_dep = accumulated_dep + depreciation_amount

                # Ensure book value doesn't go below residual value
                if new_book_value < asset.residual_value:
                    depreciation_amount = book_value - asset.residual_value
                    new_book_value = asset.residual_value
                    new_accumulated_dep = accumulated_dep + depreciation_amount

                # Create journal entry using Supabase
                journal_entry_id = None
                if supabase:
                    entry_dict = {
                        "reference": f"DEPR-{asset.asset_code}-{run_data.period_month:02d}{run_data.period_year}",
                        "date": date.today().isoformat(),
                        "description": f"Depreciation for {asset.name} - {asset.asset_code} ({run_data.period_month}/{run_data.period_year})",
                        "is_posted": True,
                        "company_id": str(company_id),
                        "created_by": str(posted_by),
                    }
                    entry_response = supabase.table("journal_entries").insert(entry_dict).execute()
                    if entry_response.data:
                        journal_entry_id = entry_response.data[0]["id"]
                        
                        # Get depreciation expense account from category
                        expense_account_code = "6001"  # Depreciation Expense (default)
                        accumulated_account_code = "0199"  # Accumulated Depreciation (default)
                        
                        # Journal lines: Dr Depreciation Expense, Cr Accumulated Depreciation
                        journal_lines = [
                            {
                                "journal_entry_id": str(journal_entry_id),
                                "account_code": expense_account_code,
                                "debit": float(depreciation_amount),
                                "credit": 0,
                                "description": f"Depreciation expense - {asset.asset_code}"
                            },
                            {
                                "journal_entry_id": str(journal_entry_id),
                                "account_code": accumulated_account_code,
                                "debit": 0,
                                "credit": float(depreciation_amount),
                                "description": f"Accumulated depreciation - {asset.asset_code}"
                            }
                        ]
                        
                        for line in journal_lines:
                            supabase.table("journal_lines").insert(line).execute()

                # Create depreciation record
                dep_record = AssetDepreciation(
                    asset_id=asset.id,
                    period_month=run_data.period_month,
                    period_year=run_data.period_year,
                    depreciation_amount=depreciation_amount,
                    accumulated_depreciation=new_accumulated_dep,
                    book_value=new_book_value,
                    journal_entry_id=journal_entry_id,
                    posted_by=posted_by
                )
                self.db.add(dep_record)

                # Check if fully depreciated
                if new_book_value <= asset.residual_value:
                    asset.status = "fully_depreciated"

                assets_depreciated += 1
                total_depreciation += depreciation_amount
                if journal_entry_id:
                    journal_entries_created += 1

                logger.info(f"Depreciated asset {asset.asset_code}: {depreciation_amount}")

            except Exception as e:
                logger.error(f"Error depreciating asset {asset.asset_code}: {e}")
                continue

        self.db.commit()

        result = {
            "assets_depreciated": assets_depreciated,
            "total_depreciation": float(total_depreciation),
            "journal_entries_created": journal_entries_created,
            "period": f"{run_data.period_month}/{run_data.period_year}"
        }

        logger.info(f"Depreciation run complete: {result}")
        return result
    
    # ============ Asset Disposal ============

    def dispose_asset(
        self,
        company_id: UUID,
        asset_id: UUID,
        disposal_data: AssetDisposalRequest,
        posted_by: UUID
    ) -> Dict[str, Any]:
        """
        Dispose/sell an asset
        Creates journal entry to remove asset and record gain/loss
        """
        asset = self.get_asset(company_id, asset_id)
        if not asset:
            raise ValueError("Asset not found")

        # Get book value at disposal
        book_value, accumulated_dep = self.get_asset_book_value(asset_id)
        if book_value is None:
            book_value = asset.purchase_cost

        # Calculate gain/loss
        gain_or_loss = disposal_data.sale_proceeds - book_value

        # Create journal entry using Supabase
        supabase: Client = get_supabase_client()
        journal_entry_id = None
        
        if supabase:
            entry_dict = {
                "reference": f"DISP-{asset.asset_code}-{disposal_data.disposal_date.isoformat()}",
                "date": disposal_data.disposal_date.isoformat(),
                "description": f"Asset disposal: {asset.name} ({asset.asset_code}) - {disposal_data.disposal_reason}",
                "is_posted": True,
                "company_id": str(company_id),
                "created_by": str(posted_by),
            }
            entry_response = supabase.table("journal_entries").insert(entry_dict).execute()
            if entry_response.data:
                journal_entry_id = entry_response.data[0]["id"]
                
                # Journal lines:
                # Dr Cash/Bank (sale proceeds)
                # Dr Accumulated Depreciation (remove accumulated)
                # Dr/Cr Gain or Loss on Disposal
                # Cr Fixed Asset (remove cost)

                journal_lines = [
                    # Dr Cash/Bank
                    {
                        "journal_entry_id": str(journal_entry_id),
                        "account_code": "1001",  # Cash/Bank
                        "debit": float(disposal_data.sale_proceeds),
                        "credit": 0,
                        "description": "Sale proceeds from asset disposal"
                    },
                    # Dr Accumulated Depreciation
                    {
                        "journal_entry_id": str(journal_entry_id),
                        "account_code": "0199",  # Accumulated Depreciation
                        "debit": float(accumulated_dep),
                        "credit": 0,
                        "description": "Remove accumulated depreciation"
                    },
                    # Cr Fixed Asset (cost)
                    {
                        "journal_entry_id": str(journal_entry_id),
                        "account_code": "0101",  # Fixed Assets
                        "debit": 0,
                        "credit": float(asset.purchase_cost),
                        "description": "Remove asset cost"
                    },
                ]

                # Dr Loss or Cr Gain
                if gain_or_loss < 0:
                    # Loss on disposal
                    journal_lines.append(
                        {
                            "journal_entry_id": str(journal_entry_id),
                            "account_code": "6099",  # Loss on Disposal
                            "debit": abs(float(gain_or_loss)),
                            "credit": 0,
                            "description": "Loss on asset disposal"
                        }
                    )
                elif gain_or_loss > 0:
                    # Gain on disposal
                    journal_lines.append(
                        {
                            "journal_entry_id": str(journal_entry_id),
                            "account_code": "7099",  # Gain on Disposal
                            "debit": 0,
                            "credit": float(gain_or_loss),
                            "description": "Gain on asset disposal"
                        }
                    )

                for line in journal_lines:
                    supabase.table("journal_lines").insert(line).execute()

        # Update asset status
        asset.status = "disposed"
        self.db.commit()

        logger.info(f"Disposed asset {asset.asset_code}, gain/loss: {gain_or_loss}")

        return {
            "asset_id": str(asset_id),
            "asset_code": asset.asset_code,
            "asset_name": asset.name,
            "disposal_date": disposal_data.disposal_date.isoformat(),
            "sale_proceeds": float(disposal_data.sale_proceeds),
            "book_value_at_disposal": float(book_value),
            "gain_or_loss": float(gain_or_loss),
            "journal_entry_id": str(journal_entry_id) if journal_entry_id else None
        }
    
    # ============ Maintenance Operations ============
    
    def log_maintenance(
        self,
        company_id: UUID,
        asset_id: UUID,
        maintenance_data: AssetMaintenanceCreate
    ) -> AssetMaintenance:
        """Log maintenance for an asset"""
        maintenance = AssetMaintenance(
            company_id=company_id,
            asset_id=asset_id,
            **maintenance_data.model_dump()
        )
        self.db.add(maintenance)
        self.db.commit()
        self.db.refresh(maintenance)
        logger.info(f"Logged maintenance for asset {asset_id}")
        return maintenance
    
    def get_maintenance_history(self, asset_id: UUID) -> List[AssetMaintenance]:
        """Get maintenance history for an asset"""
        query = select(AssetMaintenance).where(
            AssetMaintenance.asset_id == asset_id
        ).order_by(AssetMaintenance.service_date.desc())
        result = self.db.execute(query)
        return list(result.scalars().all())
    
    # ============ Reports ============
    
    def get_fixed_asset_register(self, company_id: UUID, as_of_date: date) -> List[Dict[str, Any]]:
        """Generate Fixed Asset Register report"""
        assets = self.get_assets(company_id)
        register = []
        
        for asset in assets:
            book_value, accumulated_dep = self.get_asset_book_value(asset.id)
            if book_value is None:
                book_value = asset.purchase_cost
            
            register.append({
                "asset_code": asset.asset_code,
                "name": asset.name,
                "category": asset.category.name if asset.category else "N/A",
                "purchase_date": asset.purchase_date,
                "purchase_cost": float(asset.purchase_cost),
                "accumulated_depreciation": float(accumulated_dep),
                "book_value": float(book_value),
                "status": asset.status,
                "location": asset.location
            })
        
        return register
