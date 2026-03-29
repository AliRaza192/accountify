from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(
    title="AI Accounts API",
    description="AI-Native Accounting System for Pakistani Businesses",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth, companies, accounts, journals, customers, vendors, products, invoices, bills, inventory, reports, ai_chat, banking, payroll, pos

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(journals.router, prefix="/api/journals", tags=["Journals"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(vendors.router, prefix="/api/vendors", tags=["Vendors"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(bills.router, prefix="/api/bills", tags=["Bills"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(ai_chat.router, prefix="/api/ai-chat", tags=["AI Chat"])
app.include_router(banking.router, prefix="/api/banking", tags=["Banking"])
app.include_router(payroll.router, prefix="/api/payroll", tags=["Payroll"])
app.include_router(pos.router, prefix="/api/pos", tags=["POS"])


@app.get("/")
async def root():
    return {"status": "AI Accounts API running", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
