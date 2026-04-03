"""Branch Service for multi-branch operations"""
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging

from app.models.branch import Branch, BranchSettings
from app.schemas.branch import BranchCreate, BranchUpdate

logger = logging.getLogger(__name__)


class BranchService:
    """Service for branch management"""
    
    @staticmethod
    def get_branches(db: Session, company_id: int, 
                     is_active: Optional[bool] = None) -> List[Branch]:
        """Get all branches for company"""
        query = db.query(Branch).filter(Branch.company_id == company_id)
        
        if is_active is not None:
            query = query.filter(Branch.is_active == is_active)
        
        return query.order_by(Branch.is_default.desc(), Branch.name).all()
    
    @staticmethod
    def get_branch(db: Session, branch_id: int) -> Optional[Branch]:
        """Get branch by ID"""
        return db.query(Branch).filter(Branch.id == branch_id).first()
    
    @staticmethod
    def create_branch(db: Session, company_id: int, 
                      branch_data: BranchCreate) -> Branch:
        """Create new branch"""
        # Check if code already exists
        existing = db.query(Branch).filter(
            Branch.code == branch_data.code
        ).first()
        
        if existing:
            raise ValueError(f"Branch code '{branch_data.code}' already exists")
        
        # If default, unset other defaults
        if branch_data.is_default:
            db.query(Branch).filter(
                Branch.company_id == company_id,
                Branch.is_default == True
            ).update({"is_default": False})
        
        branch = Branch(
            company_id=company_id,
            name=branch_data.name,
            code=branch_data.code,
            address=branch_data.address,
            phone=branch_data.phone,
            email=branch_data.email,
            is_default=branch_data.is_default
        )
        
        db.add(branch)
        db.commit()
        db.refresh(branch)
        
        # Create default settings
        settings = BranchSettings(branch_id=branch.id)
        db.add(settings)
        db.commit()
        
        logger.info(f"Created branch: {branch.name} ({branch.code})")
        return branch
    
    @staticmethod
    def update_branch(db: Session, branch_id: int, 
                      branch_data: BranchUpdate) -> Optional[Branch]:
        """Update branch"""
        branch = db.query(Branch).filter(Branch.id == branch_id).first()
        
        if not branch:
            return None
        
        # If setting as default, unset other defaults
        if branch_data.is_default and not branch.is_default:
            db.query(Branch).filter(
                Branch.company_id == branch.company_id,
                Branch.is_default == True
            ).update({"is_default": False})
        
        update_data = branch_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(branch, field, value)
        
        db.commit()
        db.refresh(branch)
        
        logger.info(f"Updated branch: {branch.name} ({branch.code})")
        return branch
    
    @staticmethod
    def delete_branch(db: Session, branch_id: int) -> bool:
        """Delete branch (soft delete by setting is_active=False)"""
        branch = db.query(Branch).filter(Branch.id == branch_id).first()
        
        if not branch:
            return False
        
        # Cannot delete default branch
        if branch.is_default:
            raise ValueError("Cannot delete default branch")
        
        branch.is_active = False
        db.commit()
        
        logger.info(f"Deactivated branch: {branch.name} ({branch.code})")
        return True
    
    @staticmethod
    def get_default_branch(db: Session, company_id: int) -> Optional[Branch]:
        """Get default branch for company"""
        return db.query(Branch).filter(
            Branch.company_id == company_id,
            Branch.is_default == True
        ).first()
    
    @staticmethod
    def get_branch_settings(db: Session, branch_id: int) -> Optional[BranchSettings]:
        """Get branch settings"""
        return db.query(BranchSettings).filter(
            BranchSettings.branch_id == branch_id
        ).first()
