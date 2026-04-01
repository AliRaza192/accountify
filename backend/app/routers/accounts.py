from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from supabase import create_client, Client

from app.config import settings
from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user, get_supabase_client

router = APIRouter()


class AccountCreate(BaseModel):
    code: str
    name: str
    account_type: str
    parent_id: Optional[UUID] = None
    description: Optional[str] = None


class AccountUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    account_type: Optional[str] = None
    parent_id: Optional[UUID] = None
    description: Optional[str] = None


class AccountResponse(BaseModel):
    id: UUID
    code: str
    name: str
    account_type: str
    parent_id: Optional[UUID]
    description: Optional[str]
    company_id: UUID
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class AccountsListResponse(BaseModel):
    success: bool
    data: List[AccountResponse]
    message: str


class AccountDetailResponse(BaseModel):
    success: bool
    data: AccountResponse
    message: str


@router.get("/", response_model=AccountsListResponse)
async def list_accounts(
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    response = supabase.table("accounts").select("*").eq("company_id", current_user.company_id).eq("is_deleted", False).order("code").execute()
    
    return AccountsListResponse(
        success=True,
        data=[AccountResponse(**acc) for acc in response.data],
        message="Accounts retrieved successfully"
    )


@router.post("/", response_model=AccountDetailResponse)
async def create_account(
    account_data: AccountCreate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    existing = supabase.table("accounts").select("id").eq("code", account_data.code).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account code already exists")
    
    account_dict = account_data.model_dump()
    account_dict["company_id"] = current_user.company_id
    account_dict["parent_id"] = str(account_data.parent_id) if account_data.parent_id else None
    
    response = supabase.table("accounts").insert(account_dict).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create account")
    
    return AccountDetailResponse(
        success=True,
        data=AccountResponse(**response.data[0]),
        message="Account created successfully"
    )


@router.put("/{account_id}", response_model=AccountDetailResponse)
async def update_account(
    account_id: UUID,
    account_data: AccountUpdate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("accounts").select("*").eq("id", str(account_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    
    update_data = account_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if "parent_id" in update_data and update_data["parent_id"]:
        update_data["parent_id"] = str(update_data["parent_id"])
    
    response = supabase.table("accounts").update(update_data).eq("id", str(account_id)).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update account")
    
    return AccountDetailResponse(
        success=True,
        data=AccountResponse(**response.data[0]),
        message="Account updated successfully"
    )


@router.delete("/{account_id}")
async def delete_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("accounts").select("*").eq("id", str(account_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    
    response = supabase.table("accounts").update({"is_deleted": True, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", str(account_id)).execute()
    
    return {"success": True, "message": "Account deleted successfully"}


@router.post("/seed")
async def seed_default_accounts(
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    default_accounts = [
        {"code": "1000", "name": "Assets", "account_type": "asset", "parent_id": None},
        {"code": "1100", "name": "Current Assets", "account_type": "asset", "parent_id": "1000"},
        {"code": "1110", "name": "Cash", "account_type": "asset", "parent_id": "1100"},
        {"code": "1120", "name": "Bank", "account_type": "asset", "parent_id": "1100"},
        {"code": "1130", "name": "Accounts Receivable", "account_type": "asset", "parent_id": "1100"},
        {"code": "1140", "name": "Inventory", "account_type": "asset", "parent_id": "1100"},
        {"code": "1150", "name": "Advance Deposits", "account_type": "asset", "parent_id": "1100"},
        {"code": "1200", "name": "Fixed Assets", "account_type": "asset", "parent_id": "1000"},
        {"code": "1210", "name": "Property, Plant & Equipment", "account_type": "asset", "parent_id": "1200"},
        {"code": "1220", "name": "Vehicles", "account_type": "asset", "parent_id": "1200"},
        {"code": "1230", "name": "Accumulated Depreciation", "account_type": "asset", "parent_id": "1200"},
        
        {"code": "2000", "name": "Liabilities", "account_type": "liability", "parent_id": None},
        {"code": "2100", "name": "Current Liabilities", "account_type": "liability", "parent_id": "2000"},
        {"code": "2110", "name": "Accounts Payable", "account_type": "liability", "parent_id": "2100"},
        {"code": "2120", "name": "Accrued Expenses", "account_type": "liability", "parent_id": "2100"},
        {"code": "2130", "name": "Sales Tax Payable", "account_type": "liability", "parent_id": "2100"},
        {"code": "2140", "name": "Income Tax Payable", "account_type": "liability", "parent_id": "2100"},
        {"code": "2150", "name": "Short-term Loans", "account_type": "liability", "parent_id": "2100"},
        {"code": "2200", "name": "Long-term Liabilities", "account_type": "liability", "parent_id": "2000"},
        {"code": "2210", "name": "Long-term Loans", "account_type": "liability", "parent_id": "2200"},
        
        {"code": "3000", "name": "Equity", "account_type": "equity", "parent_id": None},
        {"code": "3100", "name": "Owner's Equity", "account_type": "equity", "parent_id": "3000"},
        {"code": "3110", "name": "Capital", "account_type": "equity", "parent_id": "3100"},
        {"code": "3120", "name": "Retained Earnings", "account_type": "equity", "parent_id": "3100"},
        {"code": "3130", "name": "Drawings", "account_type": "equity", "parent_id": "3100"},
        
        {"code": "4000", "name": "Revenue", "account_type": "revenue", "parent_id": None},
        {"code": "4100", "name": "Sales Revenue", "account_type": "revenue", "parent_id": "4000"},
        {"code": "4110", "name": "Product Sales", "account_type": "revenue", "parent_id": "4100"},
        {"code": "4120", "name": "Service Revenue", "account_type": "revenue", "parent_id": "4100"},
        {"code": "4130", "name": "Sales Returns", "account_type": "revenue", "parent_id": "4100"},
        {"code": "4200", "name": "Other Income", "account_type": "revenue", "parent_id": "4000"},
        
        {"code": "5000", "name": "Expenses", "account_type": "expense", "parent_id": None},
        {"code": "5100", "name": "Cost of Goods Sold", "account_type": "expense", "parent_id": "5000"},
        {"code": "5110", "name": "Purchases", "account_type": "expense", "parent_id": "5100"},
        {"code": "5120", "name": "Freight Inward", "account_type": "expense", "parent_id": "5100"},
        {"code": "5200", "name": "Operating Expenses", "account_type": "expense", "parent_id": "5000"},
        {"code": "5210", "name": "Salaries & Wages", "account_type": "expense", "parent_id": "5200"},
        {"code": "5220", "name": "Rent Expense", "account_type": "expense", "parent_id": "5200"},
        {"code": "5230", "name": "Utilities", "account_type": "expense", "parent_id": "5200"},
        {"code": "5240", "name": "Office Supplies", "account_type": "expense", "parent_id": "5200"},
        {"code": "5250", "name": "Depreciation Expense", "account_type": "expense", "parent_id": "5200"},
        {"code": "5260", "name": "Marketing & Advertising", "account_type": "expense", "parent_id": "5200"},
        {"code": "5270", "name": "Professional Fees", "account_type": "expense", "parent_id": "5200"},
        {"code": "5280", "name": "Bank Charges", "account_type": "expense", "parent_id": "5200"},
        {"code": "5290", "name": "Miscellaneous Expense", "account_type": "expense", "parent_id": "5200"},
    ]
    
    code_to_id = {}
    inserted_accounts = []
    
    for acc in default_accounts:
        parent_id = None
        if acc["parent_id"]:
            parent_id = code_to_id.get(acc["parent_id"])
        
        account_dict = {
            "code": acc["code"],
            "name": acc["name"],
            "account_type": acc["account_type"],
            "parent_id": parent_id,
            "company_id": str(current_user.company_id),
            "description": f"Default {acc['name']} account"
        }
        
        response = supabase.table("accounts").insert(account_dict).execute()
        
        if response.data and len(response.data) > 0:
            code_to_id[acc["code"]] = response.data[0]["id"]
            inserted_accounts.append(AccountResponse(**response.data[0]))
    
    return {
        "success": True,
        "message": f"Seeded {len(inserted_accounts)} default accounts",
        "data": inserted_accounts
    }
