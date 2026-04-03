"""Seed data for Phase 2 modules"""
from sqlalchemy.orm import Session
from app.models.role import Role
from app.models.branch import Branch
import logging

logger = logging.getLogger(__name__)


def seed_system_roles(db: Session):
    """Seed predefined system roles"""
    
    system_roles = [
        {
            "name": "Super Admin",
            "permissions": {
                "modules": ["*"],
                "actions": {"*": ["create", "read", "update", "delete", "approve", "export"]}
            }
        },
        {
            "name": "Admin",
            "permissions": {
                "modules": ["sales", "purchases", "inventory", "accounting", "reports", "crm", "hr", "manufacturing"],
                "actions": {"*": ["create", "read", "update", "delete", "approve", "export"]}
            }
        },
        {
            "name": "Accountant",
            "permissions": {
                "modules": ["accounting", "reports", "tax", "banking"],
                "actions": {
                    "accounting": ["create", "read", "update"],
                    "reports": ["read", "export"],
                    "tax": ["create", "read", "update"],
                    "banking": ["create", "read", "update"]
                }
            }
        },
        {
            "name": "Sales Manager",
            "permissions": {
                "modules": ["sales", "crm", "reports", "inventory"],
                "actions": {
                    "sales": ["create", "read", "update", "delete", "approve"],
                    "crm": ["create", "read", "update"],
                    "reports": ["read", "export"],
                    "inventory": ["read"]
                }
            }
        },
        {
            "name": "Salesperson",
            "permissions": {
                "modules": ["sales", "crm"],
                "actions": {
                    "sales": ["create", "read"],
                    "crm": ["create", "read", "update"]
                }
            }
        },
        {
            "name": "Store Manager",
            "permissions": {
                "modules": ["inventory", "purchases", "products"],
                "actions": {
                    "inventory": ["create", "read", "update", "approve"],
                    "purchases": ["create", "read", "update", "approve"],
                    "products": ["create", "read", "update"]
                }
            }
        },
        {
            "name": "HR Manager",
            "permissions": {
                "modules": ["hr", "payroll", "reports"],
                "actions": {
                    "hr": ["create", "read", "update", "delete", "approve"],
                    "payroll": ["create", "read", "update"],
                    "reports": ["read", "export"]
                }
            }
        },
        {
            "name": "Cashier",
            "permissions": {
                "modules": ["pos", "sales"],
                "actions": {
                    "pos": ["create", "read"],
                    "sales": ["create", "read"]
                }
            }
        },
        {
            "name": "Viewer",
            "permissions": {
                "modules": ["reports"],
                "actions": {
                    "reports": ["read"]
                }
            }
        }
    ]
    
    for role_data in system_roles:
        # Check if role already exists
        existing = db.query(Role).filter(
            Role.name == role_data["name"],
            Role.is_system == True
        ).first()
        
        if not existing:
            role = Role(
                company_id=None,  # System roles have no company
                name=role_data["name"],
                permissions_json=role_data["permissions"],
                is_system=True
            )
            db.add(role)
            logger.info(f"Created system role: {role.name}")
    
    db.commit()
    logger.info("System roles seeded successfully")


def seed_default_branch(db: Session):
    """Seed default branch if not exists"""
    # Check if branches table exists
    try:
        default_branch = db.query(Branch).filter(Branch.is_default == True).first()
        
        if not default_branch:
            branch = Branch(
                company_id=1,
                name="Head Office",
                code="HO-01",
                address="Default Branch Address",
                is_default=True,
                is_active=True
            )
            db.add(branch)
            db.commit()
            logger.info("Created default branch: Head Office")
    except Exception as e:
        logger.warning(f"Could not seed default branch: {e}")


def run_seed(db: Session):
    """Run all seed functions"""
    logger.info("Running Phase 2 seed data...")
    seed_system_roles(db)
    seed_default_branch(db)
    logger.info("Phase 2 seed data completed")
