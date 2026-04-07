from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal
from supabase import create_client, Client

from app.config import settings
from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user, get_supabase_client

router = APIRouter()


class ProfitLossResponse(BaseModel):
    success: bool
    data: dict
    message: str


class BalanceSheetResponse(BaseModel):
    success: bool
    data: dict
    message: str


class CashFlowResponse(BaseModel):
    success: bool
    data: dict
    message: str


class TrialBalanceResponse(BaseModel):
    success: bool
    data: List[dict]
    message: str


class SalesSummaryResponse(BaseModel):
    success: bool
    data: dict
    message: str


class CustomerLedgerResponse(BaseModel):
    success: bool
    data: List[dict]
    opening_balance: Decimal
    closing_balance: Decimal
    message: str


@router.get("/profit-loss", response_model=ProfitLossResponse)
async def get_profit_loss(
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    revenue_accounts = supabase.table("accounts").select("id").eq("account_type", "revenue").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    expense_accounts = supabase.table("accounts").select("id").eq("account_type", "expense").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    revenue_ids = [acc["id"] for acc in revenue_accounts.data] if revenue_accounts.data else []
    expense_ids = [acc["id"] for acc in expense_accounts.data] if expense_accounts.data else []
    
    total_revenue = Decimal("0")
    total_expenses = Decimal("0")
    
    if revenue_ids:
        revenue_response = supabase.table("journal_lines").select("debit, credit").in_("account_id", revenue_ids).gte("created_at", start_date.isoformat()).lte("created_at", end_date.isoformat()).execute()
        for line in revenue_response.data:
            total_revenue += Decimal(str(line["credit"]))
    
    if expense_ids:
        expense_response = supabase.table("journal_lines").select("debit, credit").in_("account_id", expense_ids).gte("created_at", start_date.isoformat()).lte("created_at", end_date.isoformat()).execute()
        for line in expense_response.data:
            total_expenses += Decimal(str(line["debit"]))
    
    net_income = total_revenue - total_expenses
    
    return ProfitLossResponse(
        success=True,
        data={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "revenue": float(total_revenue),
            "expenses": float(total_expenses),
            "net_income": float(net_income),
        },
        message="Profit & Loss report generated successfully"
    )


@router.get("/balance-sheet", response_model=BalanceSheetResponse)
async def get_balance_sheet(
    date: datetime,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    asset_accounts = supabase.table("accounts").select("id, name, code").eq("account_type", "asset").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    liability_accounts = supabase.table("accounts").select("id, name, code").eq("account_type", "liability").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    equity_accounts = supabase.table("accounts").select("id, name, code").eq("account_type", "equity").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    def calculate_balance(account_ids):
        balance = Decimal("0")
        if not account_ids:
            return balance
        
        response = supabase.table("journal_lines").select("debit, credit").in_("account_id", account_ids).lte("created_at", date.isoformat()).execute()
        for line in response.data:
            balance += Decimal(str(line["debit"])) - Decimal(str(line["credit"]))
        return balance
    
    asset_ids = [acc["id"] for acc in asset_accounts.data] if asset_accounts.data else []
    liability_ids = [acc["id"] for acc in liability_accounts.data] if liability_accounts.data else []
    equity_ids = [acc["id"] for acc in equity_accounts.data] if equity_accounts.data else []
    
    total_assets = calculate_balance(asset_ids)
    total_liabilities = calculate_balance(liability_ids)
    total_equity = calculate_balance(equity_ids)
    
    assets_list = []
    for acc in asset_accounts.data or []:
        acc_balance = calculate_balance([acc["id"]])
        if acc_balance != 0:
            assets_list.append({"name": acc["name"], "code": acc["code"], "balance": float(acc_balance)})
    
    liabilities_list = []
    for acc in liability_accounts.data or []:
        acc_balance = calculate_balance([acc["id"]])
        if acc_balance != 0:
            liabilities_list.append({"name": acc["name"], "code": acc["code"], "balance": float(acc_balance)})
    
    equity_list = []
    for acc in equity_accounts.data or []:
        acc_balance = calculate_balance([acc["id"]])
        if acc_balance != 0:
            equity_list.append({"name": acc["name"], "code": acc["code"], "balance": float(acc_balance)})
    
    return BalanceSheetResponse(
        success=True,
        data={
            "date": date.isoformat(),
            "assets": {
                "total": float(total_assets),
                "items": assets_list
            },
            "liabilities": {
                "total": float(total_liabilities),
                "items": liabilities_list
            },
            "equity": {
                "total": float(total_equity),
                "items": equity_list
            },
        },
        message="Balance Sheet generated successfully"
    )


@router.get("/cash-flow", response_model=CashFlowResponse)
async def get_cash_flow(
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    cash_accounts = supabase.table("accounts").select("id").or_("code.eq.1110,code.eq.1120").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    cash_ids = [acc["id"] for acc in cash_accounts.data] if cash_accounts.data else []
    
    cash_inflows = Decimal("0")
    cash_outflows = Decimal("0")
    
    if cash_ids:
        response = supabase.table("journal_lines").select("debit, credit").in_("account_id", cash_ids).gte("created_at", start_date.isoformat()).lte("created_at", end_date.isoformat()).execute()
        for line in response.data:
            cash_inflows += Decimal(str(line["debit"]))
            cash_outflows += Decimal(str(line["credit"]))
    
    net_cash_flow = cash_inflows - cash_outflows
    
    return CashFlowResponse(
        success=True,
        data={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "cash_inflows": float(cash_inflows),
            "cash_outflows": float(cash_outflows),
            "net_cash_flow": float(net_cash_flow),
        },
        message="Cash Flow report generated successfully"
    )


@router.get("/trial-balance", response_model=TrialBalanceResponse)
async def get_trial_balance(
    date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    accounts = supabase.table("accounts").select("id, name, code, account_type").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    trial_balance = []
    total_debits = Decimal("0")
    total_credits = Decimal("0")
    
    for acc in accounts.data or []:
        query = supabase.table("journal_lines").select("debit, credit").eq("account_id", acc["id"])
        if date:
            query = query.lte("created_at", date.isoformat())
        
        response = query.execute()
        
        debit = sum(Decimal(str(line["debit"])) for line in response.data) if response.data else Decimal("0")
        credit = sum(Decimal(str(line["credit"])) for line in response.data) if response.data else Decimal("0")
        
        if debit != 0 or credit != 0:
            trial_balance.append({
                "account_code": acc["code"],
                "account_name": acc["name"],
                "account_type": acc["account_type"],
                "debit": float(debit),
                "credit": float(credit),
            })
            total_debits += debit
            total_credits += credit
    
    return TrialBalanceResponse(
        success=True,
        data=trial_balance,
        message="Trial Balance generated successfully"
    )


@router.get("/sales-summary", response_model=SalesSummaryResponse)
async def get_sales_summary(
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    invoices = supabase.table("invoices").select("total, amount_paid, status").eq("company_id", current_user.company_id).eq("is_deleted", False).gte("date", start_date.isoformat()).lte("date", end_date.isoformat()).execute()
    
    total_sales = Decimal("0")
    total_collected = Decimal("0")
    total_outstanding = Decimal("0")
    
    for inv in invoices.data or []:
        total_sales += Decimal(str(inv["total"]))
        total_collected += Decimal(str(inv["amount_paid"]))
        total_outstanding += Decimal(str(inv["balance_due"]))
    
    return SalesSummaryResponse(
        success=True,
        data={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_sales": float(total_sales),
            "total_collected": float(total_collected),
            "total_outstanding": float(total_outstanding),
            "invoice_count": len(invoices.data) if invoices.data else 0,
        },
        message="Sales Summary generated successfully"
    )


@router.get("/customer-ledger/{customer_id}", response_model=CustomerLedgerResponse)
async def get_customer_ledger(
    customer_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    customer = supabase.table("customers").select("*").eq("id", str(customer_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not customer.data or len(customer.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    invoices = supabase.table("invoices").select("id, invoice_number, date, total, amount_paid, balance_due").eq("customer_id", str(customer_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).order("date").execute()
    
    payments = supabase.table("payments").select("id, invoice_id, amount, date, method").eq("company_id", current_user.company_id).execute()
    
    ledger = []
    opening_balance = Decimal("0")
    
    for inv in invoices.data or []:
        ledger.append({
            "date": inv["date"],
            "type": "invoice",
            "reference": inv["invoice_number"],
            "debit": float(inv["total"]),
            "credit": 0,
            "balance": float(inv["balance_due"]),
        })
    
    for payment in payments.data or []:
        if payment["invoice_id"]:
            related_invoice = next((inv for inv in invoices.data or [] if inv["id"] == payment["invoice_id"]), None)
            if related_invoice:
                ledger.append({
                    "date": payment["date"],
                    "type": "payment",
                    "reference": f"Payment - {payment['method']}",
                    "debit": 0,
                    "credit": float(payment["amount"]),
                    "balance": float(related_invoice["balance_due"]),
                })
    
    closing_balance = Decimal(str(customer.data[0].get("balance_due", 0))) if "balance_due" in customer.data[0] else Decimal("0")

    return CustomerLedgerResponse(
        success=True,
        data=ledger,
        opening_balance=opening_balance,
        closing_balance=closing_balance,
        message="Customer Ledger generated successfully"
    )


class DashboardResponse(BaseModel):
    total_revenue: float
    total_expenses: float
    outstanding_receivables: float
    cash_balance: float
    recent_invoices: List[dict]
    recent_activity: List[dict]


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(current_user: User = Depends(get_current_user)):
    """Get dashboard metrics and recent activity"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    from datetime import datetime, timezone, timedelta

    # Get current month start and end
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        month_end = now.replace(year=now.year + 1, month=1, day=1)
    else:
        month_end = now.replace(month=now.month + 1, day=1)

    # Total Revenue: Sum of confirmed invoices for current month
    invoices_response = supabase.table("invoices").select("total_amount, paid_amount, status").eq("company_id", current_user.company_id).eq("is_deleted", False).gte("invoice_date", month_start.isoformat()).lt("invoice_date", month_end.isoformat()).execute()
    
    total_revenue = 0.0
    outstanding_receivables = 0.0
    
    for inv in invoices_response.data or []:
        total = float(inv.get("total_amount", 0) or 0)
        paid = float(inv.get("paid_amount", 0) or 0)
        status = inv.get("status", "pending")
        
        if status == "confirmed" or status == "paid":
            total_revenue += total
        
        if status in ["pending", "partial"]:
            outstanding_receivables += (total - paid)

    # Total Expenses: Sum of confirmed bills for current month
    bills_response = supabase.table("bills").select("total_amount, paid_amount, status").eq("company_id", current_user.company_id).eq("is_deleted", False).gte("bill_date", month_start.isoformat()).lt("bill_date", month_end.isoformat()).execute()
    
    total_expenses = 0.0
    for bill in bills_response.data or []:
        total = float(bill.get("total_amount", 0) or 0)
        status = bill.get("status", "pending")
        
        if status == "confirmed" or status == "paid":
            total_expenses += total

    # Cash Balance
    cash_balance = total_revenue - total_expenses

    # Recent Invoices (last 5)
    recent_invoices_response = supabase.table("invoices").select("""
        id,
        invoice_number,
        total_amount,
        status,
        invoice_date,
        customers!inner(name)
    """).eq("company_id", current_user.company_id).eq("is_deleted", False).order("invoice_date", desc=True).limit(5).execute()
    
    recent_invoices = []
    for inv in recent_invoices_response.data or []:
        customer_name = ""
        if inv.get("customers"):
            customer_name = inv["customers"].get("name", "")
        
        recent_invoices.append({
            "id": inv["id"],
            "invoice_number": inv["invoice_number"],
            "customer_name": customer_name,
            "amount": float(inv.get("total_amount", 0) or 0),
            "status": inv.get("status", "pending"),
            "due_date": inv.get("invoice_date", ""),
        })

    # Recent Activity: Combine invoices, bills (last 10)
    recent_invoices_activity = supabase.table("invoices").select("""
        id,
        invoice_number,
        total_amount,
        status,
        created_at,
        customers!inner(name)
    """).eq("company_id", current_user.company_id).eq("is_deleted", False).order("created_at", desc=True).limit(5).execute()
    
    recent_bills_activity = supabase.table("bills").select("""
        id,
        bill_number,
        total_amount,
        status,
        created_at,
        vendors!inner(name)
    """).eq("company_id", current_user.company_id).eq("is_deleted", False).order("created_at", desc=True).limit(5).execute()
    
    recent_activity = []
    
    for inv in recent_invoices_activity.data or []:
        customer_name = ""
        if inv.get("customers"):
            customer_name = inv["customers"].get("name", "")
        
        recent_activity.append({
            "id": inv["id"],
            "description": f"Invoice {inv['invoice_number']} created for {customer_name}",
            "type": "invoice",
            "amount": float(inv.get("total_amount", 0) or 0),
            "created_at": inv.get("created_at", ""),
        })
    
    for bill in recent_bills_activity.data or []:
        vendor_name = ""
        if bill.get("vendors"):
            vendor_name = bill["vendors"].get("name", "")
        
        recent_activity.append({
            "id": bill["id"],
            "description": f"Bill {bill['bill_number']} recorded for {vendor_name}",
            "type": "bill",
            "amount": float(bill.get("total_amount", 0) or 0),
            "created_at": bill.get("created_at", ""),
        })
    
    # Sort by created_at descending and take top 10
    recent_activity.sort(key=lambda x: x["created_at"] or "", reverse=True)
    recent_activity = recent_activity[:10]

    return DashboardResponse(
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        outstanding_receivables=outstanding_receivables,
        cash_balance=cash_balance,
        recent_invoices=recent_invoices,
        recent_activity=recent_activity,
    )


# ==================== EXPENSES ENDPOINTS ====================

class ExpenseCreate(BaseModel):
    date: datetime
    amount: Decimal
    account_id: UUID
    description: Optional[str] = None
    payment_method: str = "cash"
    reference: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: UUID
    date: datetime
    amount: Decimal
    account_id: UUID
    account_name: str
    description: Optional[str]
    payment_method: str
    reference: Optional[str]
    company_id: UUID
    created_by: UUID
    created_at: datetime


class ExpenseDetailResponse(BaseModel):
    success: bool
    data: ExpenseResponse
    message: str


class ExpensesListResponse(BaseModel):
    success: bool
    data: List[ExpenseResponse]
    total: int
    message: str


@router.get("/expenses", response_model=ExpensesListResponse)
async def list_expenses(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    account_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user)
):
    """List all expenses with optional filters"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Build query with account join
    query = supabase.table("expenses").select("""
        *,
        accounts!inner(name, code)
    """, count="exact").eq("company_id", current_user.company_id)

    if start_date:
        query = query.gte("date", start_date.isoformat())
    if end_date:
        query = query.lte("date", end_date.isoformat())
    if account_id:
        query = query.eq("account_id", str(account_id))

    response = query.order("date", desc=True).execute()

    expenses = []
    for exp in response.data:
        expenses.append(ExpenseResponse(
            id=exp["id"],
            date=exp["date"],
            amount=Decimal(str(exp["amount"])),
            account_id=exp["account_id"],
            account_name=exp["accounts"]["name"] if exp["accounts"] else "Unknown",
            description=exp.get("description"),
            payment_method=exp["payment_method"],
            reference=exp.get("reference"),
            company_id=exp["company_id"],
            created_by=exp["created_by"],
            created_at=exp["created_at"]
        ))

    return ExpensesListResponse(
        success=True,
        data=expenses,
        total=response.count or 0,
        message="Expenses retrieved successfully"
    )


@router.post("/expenses", response_model=ExpenseDetailResponse)
async def create_expense(
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new expense"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Validate account exists and is expense type
    account_response = supabase.table("accounts").select("*").eq("id", str(expense_data.account_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not account_response.data or len(account_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    
    account = account_response.data[0]
    if account["account_type"] != "expense":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected account must be of type 'expense'")

    # Create expense record
    expense_dict = {
        "date": expense_data.date.isoformat(),
        "amount": float(expense_data.amount),
        "account_id": str(expense_data.account_id),
        "description": expense_data.description,
        "payment_method": expense_data.payment_method,
        "reference": expense_data.reference,
        "company_id": str(current_user.company_id),
        "created_by": str(current_user.id),
    }

    response = supabase.table("expenses").insert(expense_dict).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create expense")

    expense = response.data[0]

    # Create journal entry: Debit Expense Account, Credit Cash/Bank
    try:
        # Find Cash/Bank account based on payment method
        if expense_data.payment_method == "cash":
            account_code = "1110"  # Cash
            account_name = "Cash"
        else:
            account_code = "1120"  # Bank
            account_name = "Bank"
        
        cash_account = supabase.table("accounts").select("id").eq("code", account_code).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
        if not cash_account.data or len(cash_account.data) == 0:
            # Create account if doesn't exist
            account_data = {
                "company_id": str(current_user.company_id),
                "code": account_code,
                "name": account_name,
                "account_type": "asset",
            }
            account_response = supabase.table("accounts").insert(account_data).execute()
            cash_account_id = account_response.data[0]["id"] if account_response.data else None
        else:
            cash_account_id = cash_account.data[0]["id"]

        if cash_account_id:
            # Create journal entry header
            journal_data = {
                "company_id": str(current_user.company_id),
                "date": expense_data.date.isoformat(),
                "reference_type": "expense",
                "reference_id": str(expense["id"]),
                "description": f"Expense: {expense_data.description or 'Expense recorded'}",
                "is_system_generated": True,
            }
            journal_response = supabase.table("journals").insert(journal_data).execute()
            
            if journal_response.data:
                journal_id = journal_response.data[0]["id"]
                
                # Debit Expense Account
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": str(expense_data.account_id),
                    "debit": float(expense_data.amount),
                    "credit": 0,
                    "description": f"Expense - {account['name']}",
                }).execute()
                
                # Credit Cash/Bank
                supabase.table("journal_lines").insert({
                    "journal_id": str(journal_id),
                    "account_id": cash_account_id,
                    "debit": 0,
                    "credit": float(expense_data.amount),
                    "description": f"{account_name} - Payment made",
                }).execute()
    except Exception as e:
        import logging
        logging.error(f"Failed to create journal entry for expense: {e}")

    return ExpenseDetailResponse(
        success=True,
        data=ExpenseResponse(
            id=expense["id"],
            date=expense["date"],
            amount=Decimal(str(expense["amount"])),
            account_id=expense["account_id"],
            account_name=account["name"],
            description=expense.get("description"),
            payment_method=expense["payment_method"],
            reference=expense.get("reference"),
            company_id=expense["company_id"],
            created_by=expense["created_by"],
            created_at=expense["created_at"]
        ),
        message="Expense recorded successfully"
    )


# ==================== CASH FLOW ENDPOINT ====================


@router.get("/cash-flow", response_model=CashFlowResponse)
async def get_cash_flow(
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user)
):
    """Get cash flow statement"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Get opening balance from bank accounts
    bank_response = supabase.table("bank_accounts").select("balance").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
    opening_balance = sum(acc.get("balance", 0) for acc in bank_response.data or [])

    # Operating Activities
    operating_items = []
    
    # Cash received from customers
    invoices_response = supabase.table("invoices").select("total_amount, paid_amount").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).gte("invoice_date", start_date.isoformat()).lte("invoice_date", end_date.isoformat()).execute()
    cash_from_customers = sum(inv.get("paid_amount", 0) for inv in invoices_response.data or [])
    if cash_from_customers > 0:
        operating_items.append({"description": "Cash received from customers", "amount": cash_from_customers})

    # Cash paid to vendors
    bills_response = supabase.table("bills").select("total_amount, paid_amount").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).gte("bill_date", start_date.isoformat()).lte("bill_date", end_date.isoformat()).execute()
    cash_to_vendors = sum(bill.get("paid_amount", 0) for bill in bills_response.data or [])
    if cash_to_vendors > 0:
        operating_items.append({"description": "Cash paid to vendors", "amount": -cash_to_vendors})

    # Expenses paid
    expenses_response = supabase.table("expenses").select("amount").eq("company_id", str(current_user.company_id)).gte("date", start_date.isoformat()).lte("date", end_date.isoformat()).execute()
    expenses_paid = sum(exp.get("amount", 0) for exp in expenses_response.data or [])
    if expenses_paid > 0:
        operating_items.append({"description": "Operating expenses paid", "amount": -expenses_paid})

    operating_total = sum(item["amount"] for item in operating_items)

    # Investing Activities
    investing_items = []
    # Asset purchases would go here
    investing_total = sum(item["amount"] for item in investing_items)

    # Financing Activities
    financing_items = []
    # Loans and equity would go here
    financing_total = sum(item["amount"] for item in financing_items)

    net_cash_flow = operating_total + investing_total + financing_total
    closing_balance = opening_balance + net_cash_flow

    return CashFlowResponse(
        success=True,
        data={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "operating": {"items": operating_items, "total": operating_total},
            "investing": {"items": investing_items, "total": investing_total},
            "financing": {"items": financing_items, "total": financing_total},
            "net_cash_flow": net_cash_flow,
            "opening_balance": opening_balance,
            "closing_balance": closing_balance,
        },
        message="Cash Flow Statement generated successfully"
    )


# ==================== CUSTOMER LEDGER ENDPOINT ====================

@router.get("/customer-ledger/{customer_id}", response_model=CustomerLedgerResponse)
async def get_customer_ledger(
    customer_id: UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user)
):
    """Get customer ledger with running balance"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Get customer details
    customer_response = supabase.table("customers").select("*").eq("id", str(customer_id)).eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
    if not customer_response.data or len(customer_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    customer = customer_response.data[0]
    opening_balance = customer.get("balance_due", 0)

    # Get all invoices for customer
    query = supabase.table("invoices").select("*").eq("customer_id", str(customer_id)).eq("company_id", str(current_user.company_id)).eq("is_deleted", False)
    if start_date:
        query = query.gte("invoice_date", start_date.isoformat())
    if end_date:
        query = query.lte("invoice_date", end_date.isoformat())
    
    invoices_response = query.order("invoice_date").execute()

    entries = []
    running_balance = opening_balance

    for inv in invoices_response.data or []:
        # Invoice entry (debit)
        entries.append({
            "id": inv["id"],
            "date": inv["invoice_date"],
            "description": f"Invoice {inv['invoice_number']}",
            "reference": inv["invoice_number"],
            "debit": float(inv.get("total_amount", 0)),
            "credit": 0,
            "balance": running_balance + float(inv.get("total_amount", 0)),
        })
        running_balance += float(inv.get("total_amount", 0))

        # Payment entry (credit)
        paid_amount = float(inv.get("paid_amount", 0))
        if paid_amount > 0:
            entries.append({
                "id": f"{inv['id']}-payment",
                "date": inv.get("payment_date", inv["invoice_date"]),
                "description": f"Payment received",
                "reference": f"Payment for {inv['invoice_number']}",
                "debit": 0,
                "credit": paid_amount,
                "balance": running_balance - paid_amount,
            })
            running_balance -= paid_amount

    closing_balance = running_balance

    return CustomerLedgerResponse(
        success=True,
        data={
            "customer": {
                "id": customer["id"],
                "name": customer["name"],
            },
            "opening_balance": opening_balance,
            "entries": entries,
            "closing_balance": closing_balance,
        },
        message="Customer Ledger generated successfully"
    )


# ==================== SALES SUMMARY ENDPOINT ====================

@router.get("/sales-summary", response_model=SalesSummaryResponse)
async def get_sales_summary(
    start_date: datetime,
    end_date: datetime,
    group_by: str = "monthly",
    current_user: User = Depends(get_current_user)
):
    """Get sales summary report"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Get all invoices in date range
    invoices_response = supabase.table("invoices").select("*").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).gte("invoice_date", start_date.isoformat()).lte("invoice_date", end_date.isoformat()).execute()

    # Group by period
    grouped_data = {}
    for inv in invoices_response.data or []:
        inv_date = datetime.fromisoformat(inv["invoice_date"])
        if group_by == "daily":
            period = inv_date.strftime("%Y-%m-%d")
        elif group_by == "weekly":
            period = f"Week {inv_date.isocalendar()[1]}"
        else:  # monthly
            period = inv_date.strftime("%B %Y")

        if period not in grouped_data:
            grouped_data[period] = {
                "invoices_count": 0,
                "subtotal": 0,
                "tax": 0,
                "total": 0,
                "collected": 0,
                "outstanding": 0,
            }

        grouped_data[period]["invoices_count"] += 1
        grouped_data[period]["total"] += float(inv.get("total_amount", 0))
        grouped_data[period]["collected"] += float(inv.get("paid_amount", 0))
        grouped_data[period]["outstanding"] += float(inv.get("balance_due", 0))

    data = [
        SalesSummaryItem(
            period=period,
            invoices_count=item["invoices_count"],
            subtotal=Decimal(str(item["total"] * 0.82)),  # Assuming 18% tax
            tax=Decimal(str(item["total"] * 0.18)),
            total=Decimal(str(item["total"])),
            collected=Decimal(str(item["collected"])),
            outstanding=Decimal(str(item["outstanding"])),
        )
        for period, item in grouped_data.items()
    ]

    # Top customers
    customer_totals = {}
    for inv in invoices_response.data or []:
        cust_id = inv.get("customer_id")
        if cust_id:
            if cust_id not in customer_totals:
                customer_totals[cust_id] = 0
            customer_totals[cust_id] += float(inv.get("total_amount", 0))

    top_customers = sorted(customer_totals.items(), key=lambda x: x[1], reverse=True)[:5]

    # Get customer names
    top_customers_data = []
    for cust_id, amount in top_customers:
        cust_response = supabase.table("customers").select("name").eq("id", cust_id).execute()
        if cust_response.data:
            top_customers_data.append({"name": cust_response.data[0]["name"], "amount": amount})

    total_invoices = len(invoices_response.data or [])
    total_revenue = sum(inv.get("total_amount", 0) for inv in invoices_response.data or [])
    total_collected = sum(inv.get("paid_amount", 0) for inv in invoices_response.data or [])
    total_outstanding = sum(inv.get("balance_due", 0) for inv in invoices_response.data or [])

    return SalesSummaryResponse(
        success=True,
        data={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "group_by": group_by,
            "data": [item.model_dump() for item in data],
            "top_customers": top_customers_data,
            "total_invoices": total_invoices,
            "total_revenue": total_revenue,
            "total_collected": total_collected,
            "total_outstanding": total_outstanding,
        },
        message="Sales Summary generated successfully"
    )


# ==================== OUTSTANDING RECEIVABLES ENDPOINT ====================

class OutstandingInvoice(BaseModel):
    id: UUID
    customer_name: str
    invoice_number: str
    invoice_date: datetime
    due_date: datetime
    amount: Decimal
    paid: Decimal
    balance: Decimal
    days_overdue: int


class OutstandingSummary(BaseModel):
    total_outstanding: Decimal
    overdue: Decimal
    due_this_week: Decimal
    future: Decimal


class OutstandingReceivablesResponse(BaseModel):
    success: bool
    data: dict
    message: str


@router.get("/outstanding-receivables", response_model=OutstandingReceivablesResponse)
async def get_outstanding_receivables(
    current_user: User = Depends(get_current_user)
):
    """Get outstanding receivables report"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    now = datetime.now(timezone.utc)
    week_from_now = datetime.now(timezone.utc).replace(day=now.day + 7) if now.day + 7 <= 28 else datetime.now(timezone.utc)

    # Get unpaid/partial invoices
    invoices_response = supabase.table("invoices").select("*").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).in_("status", ["pending", "partial", "confirmed"]).order("due_date").execute()

    invoices = []
    total_outstanding = 0
    overdue = 0
    due_this_week = 0
    future = 0

    for inv in invoices_response.data or []:
        due_date = datetime.fromisoformat(inv["due_date"])
        days_overdue = (now - due_date).days if now > due_date else 0
        balance = float(inv.get("balance_due", 0))

        # Get customer name
        cust_response = supabase.table("customers").select("name").eq("id", inv["customer_id"]).execute()
        customer_name = cust_response.data[0]["name"] if cust_response.data else "Unknown"

        invoices.append({
            "id": inv["id"],
            "customer_name": customer_name,
            "invoice_number": inv["invoice_number"],
            "invoice_date": inv["invoice_date"],
            "due_date": inv["due_date"],
            "amount": float(inv.get("total_amount", 0)),
            "paid": float(inv.get("paid_amount", 0)),
            "balance": balance,
            "days_overdue": days_overdue,
        })

        total_outstanding += balance
        if days_overdue > 0:
            overdue += balance
        elif due_date <= week_from_now:
            due_this_week += balance
        else:
            future += balance

    return OutstandingReceivablesResponse(
        success=True,
        data={
            "summary": {
                "total_outstanding": total_outstanding,
                "overdue": overdue,
                "due_this_week": due_this_week,
                "future": future,
            },
            "invoices": invoices,
        },
        message="Outstanding Receivables report generated successfully"
    )


# ==================== PURCHASE SUMMARY ENDPOINT ====================

class PurchaseSummaryItem(BaseModel):
    period: str
    bills_count: int
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    paid: Decimal
    outstanding: Decimal


class TopVendor(BaseModel):
    name: str
    amount: Decimal


class PurchaseSummaryResponse(BaseModel):
    success: bool
    data: dict
    message: str


@router.get("/purchase-summary", response_model=PurchaseSummaryResponse)
async def get_purchase_summary(
    start_date: datetime,
    end_date: datetime,
    group_by: str = "monthly",
    current_user: User = Depends(get_current_user)
):
    """Get purchase summary report"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    bills_response = supabase.table("bills").select("*").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).gte("bill_date", start_date.isoformat()).lte("bill_date", end_date.isoformat()).execute()

    grouped_data = {}
    for bill in bills_response.data or []:
        bill_date = datetime.fromisoformat(bill["bill_date"])
        if group_by == "daily":
            period = bill_date.strftime("%Y-%m-%d")
        elif group_by == "weekly":
            period = f"Week {bill_date.isocalendar()[1]}"
        else:
            period = bill_date.strftime("%B %Y")

        if period not in grouped_data:
            grouped_data[period] = {
                "bills_count": 0,
                "subtotal": 0,
                "tax": 0,
                "total": 0,
                "paid": 0,
                "outstanding": 0,
            }

        grouped_data[period]["bills_count"] += 1
        grouped_data[period]["total"] += float(bill.get("total_amount", 0))
        grouped_data[period]["paid"] += float(bill.get("paid_amount", 0))
        grouped_data[period]["outstanding"] += float(bill.get("balance_due", 0))

    data = [
        PurchaseSummaryItem(
            period=period,
            bills_count=item["bills_count"],
            subtotal=Decimal(str(item["total"] * 0.82)),
            tax=Decimal(str(item["total"] * 0.18)),
            total=Decimal(str(item["total"])),
            paid=Decimal(str(item["paid"])),
            outstanding=Decimal(str(item["outstanding"])),
        )
        for period, item in grouped_data.items()
    ]

    vendor_totals = {}
    for bill in bills_response.data or []:
        vend_id = bill.get("vendor_id")
        if vend_id:
            if vend_id not in vendor_totals:
                vendor_totals[vend_id] = 0
            vendor_totals[vend_id] += float(bill.get("total_amount", 0))

    top_vendors = sorted(vendor_totals.items(), key=lambda x: x[1], reverse=True)[:5]

    top_vendors_data = []
    for vend_id, amount in top_vendors:
        vend_response = supabase.table("vendors").select("name").eq("id", vend_id).execute()
        if vend_response.data:
            top_vendors_data.append({"name": vend_response.data[0]["name"], "amount": amount})

    total_bills = len(bills_response.data or [])
    total_purchases = sum(bill.get("total_amount", 0) for bill in bills_response.data or [])
    total_paid = sum(bill.get("paid_amount", 0) for bill in bills_response.data or [])
    total_outstanding = sum(bill.get("balance_due", 0) for bill in bills_response.data or [])

    return PurchaseSummaryResponse(
        success=True,
        data={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "group_by": group_by,
            "data": [item.model_dump() for item in data],
            "top_vendors": top_vendors_data,
            "total_bills": total_bills,
            "total_purchases": total_purchases,
            "total_paid": total_paid,
            "total_outstanding": total_outstanding,
        },
        message="Purchase Summary generated successfully"
    )


# ==================== STOCK SUMMARY ENDPOINT ====================

class StockSummaryItem(BaseModel):
    product_code: str
    product_name: str
    category: str
    quantity_on_hand: Decimal
    unit_cost: Decimal
    total_value: Decimal
    quantity_in: Decimal
    quantity_out: Decimal
    reorder_level: Decimal


class StockSummaryResponse(BaseModel):
    success: bool
    data: dict
    message: str


@router.get("/stock-summary", response_model=StockSummaryResponse)
async def get_stock_summary(
    category: Optional[str] = None,
    low_stock_only: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get stock summary report"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    query = supabase.table("products").select("*").eq("company_id", str(current_user.company_id)).eq("is_deleted", False)

    if category:
        query = query.eq("category", category)

    products_response = query.execute()

    items = []
    total_value = Decimal("0")
    total_items = 0
    low_stock_count = 0

    for prod in products_response.data or []:
        qty = Decimal(str(prod.get("quantity", 0)))
        unit_cost = Decimal(str(prod.get("cost_price", 0) or prod.get("unit_price", 0)))
        item_value = qty * unit_cost
        reorder = Decimal(str(prod.get("reorder_level", 0)))

        if low_stock_only and qty > reorder:
            continue

        total_value += item_value
        total_items += 1
        if qty <= reorder:
            low_stock_count += 1

        # Get stock movements
        qty_in_response = supabase.table("stock_movements").select("quantity").eq("company_id", str(current_user.company_id)).eq("product_id", prod["id"]).eq("movement_type", "in").execute()
        qty_out_response = supabase.table("stock_movements").select("quantity").eq("company_id", str(current_user.company_id)).eq("product_id", prod["id"]).eq("movement_type", "out").execute()

        qty_in = sum(Decimal(str(m.get("quantity", 0))) for m in qty_in_response.data or [])
        qty_out = sum(Decimal(str(m.get("quantity", 0))) for m in qty_out_response.data or [])

        items.append({
            "product_code": prod.get("sku", prod.get("code", "")),
            "product_name": prod["name"],
            "category": prod.get("category", "General"),
            "quantity_on_hand": float(qty),
            "unit_cost": float(unit_cost),
            "total_value": float(item_value),
            "quantity_in": float(qty_in),
            "quantity_out": float(qty_out),
            "reorder_level": float(reorder),
        })

    return StockSummaryResponse(
        success=True,
        data={
            "items": items,
            "summary": {
                "total_items": total_items,
                "total_value": float(total_value),
                "low_stock_count": low_stock_count,
            },
        },
        message="Stock Summary generated successfully"
    )


# ==================== SALES TAX REPORT ENDPOINT ====================

class SalesTaxReportResponse(BaseModel):
    success: bool
    data: dict
    message: str


@router.get("/sales-tax-report", response_model=SalesTaxReportResponse)
async def get_sales_tax_report(
    period_month: int,
    period_year: int,
    current_user: User = Depends(get_current_user)
):
    """Get Sales Tax Report (SRB/FBR compliant)"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    company_id = str(current_user.company_id)

    # Get sales invoices with tax for the period
    month_start = datetime(period_year, period_month, 1)
    if period_month == 12:
        month_end = datetime(period_year + 1, 1, 1)
    else:
        month_end = datetime(period_year, period_month + 1, 1)

    invoices_response = supabase.table("invoices").select("*").eq("company_id", company_id).eq("is_deleted", False).gte("invoice_date", month_start.isoformat()).lt("invoice_date", month_end.isoformat()).execute()

    total_sales = Decimal("0")
    total_output_tax = Decimal("0")
    taxable_sales = Decimal("0")
    exempt_sales = Decimal("0")
    zero_rated = Decimal("0")

    sales_by_tax_rate = {}

    for inv in invoices_response.data or []:
        total_amt = Decimal(str(inv.get("total_amount", 0)))
        tax_amt = Decimal(str(inv.get("tax_amount", 0)))
        sub_total = total_amt - tax_amt

        total_sales += total_amt
        total_output_tax += tax_amt
        taxable_sales += sub_total

        rate_key = str(inv.get("tax_rate", 17))
        if rate_key not in sales_by_tax_rate:
            sales_by_tax_rate[rate_key] = {"taxable_amount": 0, "tax_amount": 0, "count": 0}
        sales_by_tax_rate[rate_key]["taxable_amount"] += float(sub_total)
        sales_by_tax_rate[rate_key]["tax_amount"] += float(tax_amt)
        sales_by_tax_rate[rate_key]["count"] += 1

    # Get purchase bills with input tax
    bills_response = supabase.table("bills").select("*").eq("company_id", company_id).eq("is_deleted", False).gte("bill_date", month_start.isoformat()).lt("bill_date", month_end.isoformat()).execute()

    total_purchases = Decimal("0")
    total_input_tax = Decimal("0")

    for bill in bills_response.data or []:
        total_amt = Decimal(str(bill.get("total_amount", 0)))
        tax_amt = Decimal(str(bill.get("tax_amount", 0)))

        total_purchases += total_amt
        total_input_tax += tax_amt

    net_tax_payable = total_output_tax - total_input_tax

    return SalesTaxReportResponse(
        success=True,
        data={
            "period": f"{period_month:02d}/{period_year}",
            "output_tax": {
                "total_sales": float(total_sales),
                "taxable_sales": float(taxable_sales),
                "exempt_sales": float(exempt_sales),
                "zero_rated": float(zero_rated),
                "total_output_tax": float(total_output_tax),
                "sales_by_rate": sales_by_tax_rate,
            },
            "input_tax": {
                "total_purchases": float(total_purchases),
                "total_input_tax": float(total_input_tax),
            },
            "net_tax_payable": float(net_tax_payable if net_tax_payable > 0 else 0),
            "input_tax_credit": float(total_input_tax),
        },
        message="Sales Tax Report generated successfully"
    )


# ==================== WHT REPORT ENDPOINT ====================

class WHTReportResponse(BaseModel):
    success: bool
    data: dict
    message: str


@router.get("/wht-report", response_model=WHTReportResponse)
async def get_wht_report(
    period_month: int,
    period_year: int,
    current_user: User = Depends(get_current_user)
):
    """Get Withholding Tax (WHT) Report"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    company_id = str(current_user.company_id)
    month_start = datetime(period_year, period_month, 1)
    if period_month == 12:
        month_end = datetime(period_year + 1, 1, 1)
    else:
        month_end = datetime(period_year, period_month + 1, 1)

    wht_response = supabase.table("wht_transactions").select("*").eq("company_id", company_id).gte("transaction_date", month_start.isoformat()).lt("transaction_date", month_end.isoformat()).execute()

    category_summary = {}
    total_wht = Decimal("0")
    total_amount = Decimal("0")

    for txn in wht_response.data or []:
        cat = txn.get("wht_category", "Unknown")
        amount = Decimal(str(txn.get("amount", 0)))
        wht_amt = Decimal(str(txn.get("wht_amount", 0)))
        rate = Decimal(str(txn.get("wht_rate", 0)))

        if cat not in category_summary:
            category_summary[cat] = {"total_amount": 0, "total_wht": 0, "count": 0, "rate": float(rate)}
        category_summary[cat]["total_amount"] += float(amount)
        category_summary[cat]["total_wht"] += float(wht_amt)
        category_summary[cat]["count"] += 1

        total_wht += wht_amt
        total_amount += amount

    return WHTReportResponse(
        success=True,
        data={
            "period": f"{period_month:02d}/{period_year}",
            "categories": category_summary,
            "total_amount": float(total_amount),
            "total_wht_deducted": float(total_wht),
            "transaction_count": len(wht_response.data or []),
        },
        message="WHT Report generated successfully"
    )


# ==================== BRANCH-WISE REPORTS ENDPOINT ====================

class BranchWisePLItem(BaseModel):
    branch_id: int
    branch_name: str
    branch_code: str
    revenue: Decimal
    expenses: Decimal
    net_profit: Decimal
    invoice_count: int
    bill_count: int


class BranchWiseReportResponse(BaseModel):
    success: bool
    data: dict
    message: str


@router.get("/branch-wise-pl", response_model=BranchWiseReportResponse)
async def get_branch_wise_pl(
    start_date: datetime,
    end_date: datetime,
    current_user: User = Depends(get_current_user)
):
    """Get branch-wise Profit & Loss report"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    company_id = str(current_user.company_id)

    branches_response = supabase.table("branches").select("*").eq("company_id", company_id).eq("is_active", True).execute()

    branches = branches_response.data or []
    # If no branches, create a default entry
    if not branches:
        branches = [{"id": 0, "name": "Main Branch", "code": "MAIN"}]

    branch_reports = []
    grand_revenue = Decimal("0")
    grand_expenses = Decimal("0")

    for branch in branches:
        branch_id = branch.get("id")

        # Get invoices for this branch
        inv_query = supabase.table("invoices").select("*").eq("company_id", company_id).eq("is_deleted", False).gte("invoice_date", start_date.isoformat()).lte("invoice_date", end_date.isoformat())
        if branch_id and branch_id != 0:
            inv_query = inv_query.eq("branch_id", branch_id)

        invoices_response = inv_query.execute()
        branch_revenue = sum(Decimal(str(inv.get("total_amount", 0))) for inv in invoices_response.data or [])

        # Get bills for this branch
        bill_query = supabase.table("bills").select("*").eq("company_id", company_id).eq("is_deleted", False).gte("bill_date", start_date.isoformat()).lte("bill_date", end_date.isoformat())
        if branch_id and branch_id != 0:
            bill_query = bill_query.eq("branch_id", branch_id)

        bills_response = bill_query.execute()
        branch_expenses = sum(Decimal(str(bill.get("total_amount", 0))) for bill in bills_response.data or [])

        grand_revenue += branch_revenue
        grand_expenses += branch_expenses

        branch_reports.append({
            "branch_id": branch_id,
            "branch_name": branch.get("name", "Unknown"),
            "branch_code": branch.get("code", "UNK"),
            "revenue": float(branch_revenue),
            "expenses": float(branch_expenses),
            "net_profit": float(branch_revenue - branch_expenses),
            "invoice_count": len(invoices_response.data or []),
            "bill_count": len(bills_response.data or []),
        })

    return BranchWiseReportResponse(
        success=True,
        data={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "branches": branch_reports,
            "totals": {
                "total_revenue": float(grand_revenue),
                "total_expenses": float(grand_expenses),
                "total_net_profit": float(grand_revenue - grand_expenses),
            },
        },
        message="Branch-wise P&L report generated successfully"
    )


# ==================== CUSTOMER/SUPPLIER LEDGER (generic) ====================

class SupplierLedgerResponse(BaseModel):
    success: bool
    data: dict
    opening_balance: Decimal
    closing_balance: Decimal
    message: str


@router.get("/supplier-ledger/{supplier_id}", response_model=SupplierLedgerResponse)
async def get_supplier_ledger(
    supplier_id: UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user)
):
    """Get supplier/vendor ledger with running balance"""
    supabase = get_supabase_client()

    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    supplier_response = supabase.table("vendors").select("*").eq("id", str(supplier_id)).eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
    if not supplier_response.data or len(supplier_response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    supplier = supplier_response.data[0]
    opening_balance = supplier.get("balance_due", 0)

    query = supabase.table("bills").select("*").eq("vendor_id", str(supplier_id)).eq("company_id", str(current_user.company_id)).eq("is_deleted", False)
    if start_date:
        query = query.gte("bill_date", start_date.isoformat())
    if end_date:
        query = query.lte("bill_date", end_date.isoformat())

    bills_response = query.order("bill_date").execute()

    entries = []
    running_balance = opening_balance

    for bill in bills_response.data or []:
        entries.append({
            "id": bill["id"],
            "date": bill["bill_date"],
            "description": f"Bill {bill['bill_number']}",
            "reference": bill["bill_number"],
            "debit": float(bill.get("total_amount", 0)),
            "credit": 0,
            "balance": running_balance + float(bill.get("total_amount", 0)),
        })
        running_balance += float(bill.get("total_amount", 0))

        paid_amount = float(bill.get("paid_amount", 0))
        if paid_amount > 0:
            entries.append({
                "id": f"{bill['id']}-payment",
                "date": bill.get("payment_date", bill["bill_date"]),
                "description": "Payment made",
                "reference": f"Payment for {bill['bill_number']}",
                "debit": 0,
                "credit": paid_amount,
                "balance": running_balance - paid_amount,
            })
            running_balance -= paid_amount

    closing_balance = running_balance

    return SupplierLedgerResponse(
        success=True,
        data={
            "supplier": {
                "id": supplier["id"],
                "name": supplier["name"],
            },
            "opening_balance": opening_balance,
            "entries": entries,
            "closing_balance": closing_balance,
        },
        message="Supplier Ledger generated successfully"
    )
