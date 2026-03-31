import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Accounts API",
    description="AI-Native Accounting System for Pakistani Businesses",
    version="1.0.0",
)


@app.on_event("startup")
async def startup_event():
    """Handle application startup"""
    logger.info("Starting AI Accounts API...")


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


@app.get("/")
async def root():
    return {"status": "AI Accounts API running", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
