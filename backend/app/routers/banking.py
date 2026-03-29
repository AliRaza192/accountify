from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
import logging

from app.database import supabase
from app.types import User
from app.routers.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class BankAccountCreate(BaseModel):
    name: str
    account_number: str
    bank_name: str
    opening_balance: Decimal = Decimal("0")
    currency: str = "PKR"


class BankAccountUpdate(BaseModel):
    name: Optional[str] = None
    account_number: Optional[str] = None
    bank_name: Optional[str] = None
    currency: Optional[str] = None


class BankTransactionCreate(BaseModel):
    transaction_type: str  # deposit, withdrawal, transfer
    amount: Decimal
    date: datetime
    description: str
    reference: Optional[str] = None


class BankTransactionResponse(BaseModel):
    id: UUID
    bank_account_id: UUID
    transaction_type: str
    amount: Decimal
    date: datetime
    description: str
    reference: Optional[str]
    is_reconciled: bool
    running_balance: Decimal
    created_at: datetime


class BankAccountResponse(BaseModel):
    id: UUID
    name: str
    account_number: str
    bank_name: str
    balance: Decimal
    currency: str
    company_id: UUID
    created_at: datetime
    updated_at: datetime


class BankAccountsListResponse(BaseModel):
    success: bool
    data: List[BankAccountResponse]
    message: str


class BankAccountDetailResponse(BaseModel):
    success: bool
    data: BankAccountResponse
    message: str


class TransactionsListResponse(BaseModel):
    success: bool
    data: List[BankTransactionResponse]
    total: int
    message: str


class ReconcileRequest(BaseModel):
    transaction_ids: List[UUID]


class ReconcileResponse(BaseModel):
    success: bool
    message: str
    reconciled_count: int


@router.get("/", response_model=BankAccountsListResponse)
async def list_bank_accounts(current_user: User = Depends(get_current_user)):
    """List all bank accounts for the company"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    response = supabase.table("bank_accounts").select("*").eq("company_id", str(current_user.company_id)).eq("is_deleted", False).order("name").execute()

    accounts = [BankAccountResponse(**acc) for acc in response.data]

    return BankAccountsListResponse(
        success=True,
        data=accounts,
        message="Bank accounts retrieved successfully"
    )


@router.post("/", response_model=BankAccountDetailResponse)
async def create_bank_account(
    account_data: BankAccountCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new bank account"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Check for duplicate account number
    existing = supabase.table("bank_accounts").select("id").eq("account_number", account_data.account_number).eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account number already exists")

    account_dict = account_data.model_dump()
    account_dict["company_id"] = str(current_user.company_id)
    account_dict["balance"] = float(account_data.opening_balance)

    response = supabase.table("bank_accounts").insert(account_dict).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create bank account")

    return BankAccountDetailResponse(
        success=True,
        data=BankAccountResponse(**response.data[0]),
        message="Bank account created successfully"
    )


@router.get("/{account_id}/transactions", response_model=TransactionsListResponse)
async def list_transactions(
    account_id: UUID,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user)
):
    """List transactions for a bank account with running balance"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Verify account belongs to company
    account_check = supabase.table("bank_accounts").select("id, balance").eq("id", str(account_id)).eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
    if not account_check.data or len(account_check.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    opening_balance = Decimal(str(account_check.data[0]["balance"]))

    # Build query
    query = supabase.table("bank_transactions").select("*").eq("bank_account_id", str(account_id)).eq("company_id", str(current_user.company_id))

    if start_date:
        query = query.gte("date", start_date.isoformat())
    if end_date:
        query = query.lte("date", end_date.isoformat())

    response = query.order("date", desc=True).order("created_at", desc=True).execute()

    # Calculate running balance
    transactions = []
    running_balance = opening_balance

    # Sort by date ascending for running balance calculation
    sorted_data = sorted(response.data, key=lambda x: x["date"])

    for txn in sorted_data:
        amount = Decimal(str(txn["amount"]))
        if txn["transaction_type"] == "deposit":
            running_balance += amount
        else:  # withdrawal or transfer
            running_balance -= amount

        transactions.append(BankTransactionResponse(
            id=txn["id"],
            bank_account_id=txn["bank_account_id"],
            transaction_type=txn["transaction_type"],
            amount=amount,
            date=txn["date"],
            description=txn.get("description", ""),
            reference=txn.get("reference"),
            is_reconciled=txn["is_reconciled"],
            running_balance=running_balance,
            created_at=txn["created_at"]
        ))

    # Reverse to show newest first
    transactions.reverse()

    return TransactionsListResponse(
        success=True,
        data=transactions,
        total=len(transactions),
        message="Transactions retrieved successfully"
    )


@router.post("/{account_id}/transaction")
async def create_transaction(
    account_id: UUID,
    transaction_data: BankTransactionCreate,
    current_user: User = Depends(get_current_user)
):
    """Add a new transaction to a bank account"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Verify account belongs to company
    account_check = supabase.table("bank_accounts").select("*").eq("id", str(account_id)).eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
    if not account_check.data or len(account_check.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    # Validate transaction type
    if transaction_data.transaction_type not in ["deposit", "withdrawal", "transfer"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid transaction type")

    # Create transaction
    txn_dict = transaction_data.model_dump()
    txn_dict["bank_account_id"] = str(account_id)
    txn_dict["company_id"] = str(current_user.company_id)
    txn_dict["amount"] = float(transaction_data.amount)
    txn_dict["date"] = transaction_data.date.isoformat()

    response = supabase.table("bank_transactions").insert(txn_dict).execute()

    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create transaction")

    # Update account balance
    account = account_check.data[0]
    current_balance = Decimal(str(account["balance"]))

    if transaction_data.transaction_type == "deposit":
        new_balance = current_balance + transaction_data.amount
    else:
        new_balance = current_balance - transaction_data.amount

    supabase.table("bank_accounts").update({
        "balance": float(new_balance),
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(account_id)).execute()

    return {
        "success": True,
        "message": "Transaction created successfully",
        "transaction_id": response.data[0]["id"],
        "new_balance": float(new_balance)
    }


@router.get("/{account_id}/reconcile")
async def get_unreconciled_transactions(
    account_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Get unreconciled transactions for reconciliation"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Verify account belongs to company
    account_check = supabase.table("bank_accounts").select("*").eq("id", str(account_id)).eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
    if not account_check.data or len(account_check.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    # Get unreconciled transactions
    response = supabase.table("bank_transactions").select("*").eq("bank_account_id", str(account_id)).eq("company_id", str(current_user.company_id)).eq("is_reconciled", False).order("date").execute()

    transactions = []
    for txn in response.data:
        transactions.append({
            "id": txn["id"],
            "transaction_type": txn["transaction_type"],
            "amount": float(txn["amount"]),
            "date": txn["date"],
            "description": txn.get("description", ""),
            "reference": txn.get("reference"),
        })

    return {
        "success": True,
        "data": transactions,
        "account_balance": float(account_check.data[0]["balance"]),
        "message": "Unreconciled transactions retrieved successfully"
    }


@router.post("/{account_id}/reconcile", response_model=ReconcileResponse)
async def reconcile_transactions(
    account_id: UUID,
    reconcile_data: ReconcileRequest,
    current_user: User = Depends(get_current_user)
):
    """Mark transactions as reconciled"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Verify account belongs to company
    account_check = supabase.table("bank_accounts").select("*").eq("id", str(account_id)).eq("company_id", str(current_user.company_id)).eq("is_deleted", False).execute()
    if not account_check.data or len(account_check.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    reconciled_count = 0
    for txn_id in reconcile_data.transaction_ids:
        response = supabase.table("bank_transactions").update({
            "is_reconciled": True,
            "reconciled_at": datetime.utcnow().isoformat()
        }).eq("id", str(txn_id)).eq("bank_account_id", str(account_id)).execute()

        if response.data and len(response.data) > 0:
            reconciled_count += 1

    return ReconcileResponse(
        success=True,
        message=f"{reconciled_count} transactions marked as reconciled",
        reconciled_count=reconciled_count
    )


@router.delete("/{account_id}")
async def delete_bank_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user)
):
    """Soft delete a bank account (only if no transactions)"""
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")

    # Check if account has transactions
    txn_check = supabase.table("bank_transactions").select("id").eq("bank_account_id", str(account_id)).limit(1).execute()
    if txn_check.data and len(txn_check.data) > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete account with transactions")

    response = supabase.table("bank_accounts").update({
        "is_deleted": True,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(account_id)).execute()

    return {"success": True, "message": "Bank account deleted successfully"}
