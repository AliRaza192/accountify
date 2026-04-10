import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application lifespan events"""
    # Startup
    logger.info("Starting AI Accounts API...")
    yield
    # Shutdown
    logger.info("Shutting down AI Accounts API...")


app = FastAPI(
    title="AI Accounts API",
    description="AI-Native Accounting System for Pakistani Businesses",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Import and include routers with exception handling
try:
    from app.routers import auth
    app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
except Exception as e:
    logger.warning(f"Auth router failed to load: {e}")

try:
    from app.routers import companies
    app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
except Exception as e:
    logger.warning(f"Companies router failed to load: {e}")

try:
    from app.routers import accounts
    app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
except Exception as e:
    logger.warning(f"Accounts router failed to load: {e}")

try:
    from app.routers import journals
    app.include_router(journals.router, prefix="/api/journals", tags=["Journals"])
except Exception as e:
    logger.warning(f"Journals router failed to load: {e}")

try:
    from app.routers import customers
    app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
except Exception as e:
    logger.warning(f"Customers router failed to load: {e}")

try:
    from app.routers import vendors
    app.include_router(vendors.router, prefix="/api/vendors", tags=["Vendors"])
except Exception as e:
    logger.warning(f"Vendors router failed to load: {e}")

try:
    from app.routers import products
    app.include_router(products.router, prefix="/api/products", tags=["Products"])
except Exception as e:
    logger.warning(f"Products router failed to load: {e}")

try:
    from app.routers import invoices
    app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
except Exception as e:
    logger.warning(f"Invoices router failed to load: {e}")

try:
    from app.routers import bills
    app.include_router(bills.router, prefix="/api/bills", tags=["Bills"])
except Exception as e:
    logger.warning(f"Bills router failed to load: {e}")

try:
    from app.routers import inventory
    app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
except Exception as e:
    logger.warning(f"Inventory router failed to load: {e}")

try:
    from app.routers import reports
    app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
except Exception as e:
    logger.warning(f"Reports router failed to load: {e}")

try:
    from app.routers import ai_chat
    app.include_router(ai_chat.router, prefix="/api/ai-chat", tags=["AI Chat"])
except Exception as e:
    logger.warning(f"AI Chat router failed to load: {e}")

try:
    from app.routers import banking
    app.include_router(banking.router, prefix="/api/banking", tags=["Banking"])
except Exception as e:
    logger.warning(f"Banking router failed to load: {e}")

try:
    from app.routers import payroll
    app.include_router(payroll.router, prefix="/api/payroll", tags=["Payroll"])
except Exception as e:
    logger.warning(f"Payroll router failed to load: {e}")

try:
    from app.routers import pos
    app.include_router(pos.router, prefix="/api/pos", tags=["POS"])
except Exception as e:
    logger.warning(f"POS router failed to load: {e}")

# Phase 1 Critical Modules
try:
    from app.routers import fixed_assets
    app.include_router(fixed_assets.router, prefix="/api/fixed-assets", tags=["Fixed Assets"])
except Exception as e:
    logger.warning(f"Fixed Assets router failed to load: {e}")

try:
    from app.routers import cost_centers
    app.include_router(cost_centers.router, prefix="/api/cost-centers", tags=["Cost Centers"])
except Exception as e:
    logger.warning(f"Cost Centers router failed to load: {e}")

try:
    from app.routers import tax_management
    app.include_router(tax_management.router, prefix="/api/tax", tags=["Tax Management"])
except Exception as e:
    logger.warning(f"Tax Management router failed to load: {e}")

try:
    from app.routers import bank_reconciliation
    app.include_router(bank_reconciliation.router, prefix="/api/bank-reconciliation", tags=["Bank Reconciliation"])
except Exception as e:
    logger.warning(f"Bank Reconciliation router failed to load: {e}")

try:
    from app.routers import crm
    app.include_router(crm.router, prefix="/api/crm", tags=["CRM"])
except Exception as e:
    logger.warning(f"CRM router failed to load: {e}")

# Email Service
try:
    from app.routers import email
    app.include_router(email.router, prefix="/api/email", tags=["Email Service"])
except Exception as e:
    logger.warning(f"Email router failed to load: {e}")

# Phase 2: RBAC & Audit
try:
    from app.routers import roles
    app.include_router(roles.router, prefix="/api/roles", tags=["Roles & Permissions"])
except Exception as e:
    logger.warning(f"Roles router failed to load: {e}")

try:
    from app.routers import audit
    app.include_router(audit.router, prefix="/api/audit", tags=["Audit Trail"])
except Exception as e:
    logger.warning(f"Audit router failed to load: {e}")

# Phase 2: Multi-Branch
try:
    from app.routers import branches
    app.include_router(branches.router, prefix="/api/branches", tags=["Branches"])
except Exception as e:
    logger.warning(f"Branches router failed to load: {e}")

# Phase 2: Approvals
try:
    from app.routers import approvals
    app.include_router(approvals.router, prefix="/api/approvals", tags=["Approvals"])
except Exception as e:
    logger.warning(f"Approvals router failed to load: {e}")

# Phase 2: Budget
try:
    from app.routers import budgets
    app.include_router(budgets.router, prefix="/api/budgets", tags=["Budgets"])
except Exception as e:
    logger.warning(f"Budgets router failed to load: {e}")

# Phase 2: Manufacturing
try:
    from app.routers import manufacturing
    app.include_router(manufacturing.router, prefix="/api/manufacturing", tags=["Manufacturing"])
except Exception as e:
    logger.warning(f"Manufacturing router failed to load: {e}")

# Email Service
try:
    from app.routers import email as email_router
    app.include_router(email_router.router, prefix="/api/email", tags=["Email"])
except Exception as e:
    logger.warning(f"Email router failed to load: {e}")


# Phase 3: BI & Analytics
try:
    from app.routers import bi_dashboard
    app.include_router(bi_dashboard.router, prefix="/api/bi", tags=["BI & Analytics"])
except Exception as e:
    logger.warning(f"BI Dashboard router failed to load: {e}")


@app.get("/")
async def root():
    return {"status": "AI Accounts API running", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    logger.info("Healthcheck called - returning healthy status")
    return {"status": "healthy"}
