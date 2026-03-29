from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from supabase import create_client, Client

from app.config import settings
from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user, get_supabase_client

router = APIRouter()


class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    ntn: Optional[str] = None
    credit_limit: Decimal = Decimal("0")
    payment_terms: int = 30


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    ntn: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms: Optional[int] = None


class CustomerResponse(BaseModel):
    id: UUID
    name: str
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    ntn: Optional[str]
    credit_limit: Decimal
    payment_terms: int
    company_id: UUID
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    balance: Optional[Decimal] = None


class CustomerDetailResponse(BaseModel):
    success: bool
    data: CustomerResponse
    message: str


class CustomersListResponse(BaseModel):
    success: bool
    data: List[CustomerResponse]
    total: int
    message: str


@router.get("/", response_model=CustomersListResponse)
async def list_customers(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    query = supabase.table("customers").select("*", count="exact").eq("company_id", current_user.company_id).eq("is_deleted", False)
    
    if search:
        query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%")
    
    response = query.order("name").execute()
    
    customers = []
    for cust in response.data:
        customers.append(CustomerResponse(**cust))
    
    return CustomersListResponse(
        success=True,
        data=customers,
        total=response.count or 0,
        message="Customers retrieved successfully"
    )


@router.post("/", response_model=CustomerDetailResponse)
async def create_customer(
    customer_data: CustomerCreate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    existing = supabase.table("customers").select("id").eq("email", customer_data.email).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if existing.data and len(existing.data) > 0 and customer_data.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    
    customer_dict = customer_data.model_dump()
    customer_dict["company_id"] = str(current_user.company_id)
    
    response = supabase.table("customers").insert(customer_dict).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create customer")
    
    return CustomerDetailResponse(
        success=True,
        data=CustomerResponse(**response.data[0]),
        message="Customer created successfully"
    )


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
async def get_customer(
    customer_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    response = supabase.table("customers").select("*").eq("id", str(customer_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    return CustomerDetailResponse(
        success=True,
        data=CustomerResponse(**response.data[0]),
        message="Customer retrieved successfully"
    )


@router.put("/{customer_id}", response_model=CustomerDetailResponse)
async def update_customer(
    customer_id: UUID,
    customer_data: CustomerUpdate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("customers").select("*").eq("id", str(customer_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    update_data = customer_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    response = supabase.table("customers").update(update_data).eq("id", str(customer_id)).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update customer")
    
    return CustomerDetailResponse(
        success=True,
        data=CustomerResponse(**response.data[0]),
        message="Customer updated successfully"
    )


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("customers").select("*").eq("id", str(customer_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    
    response = supabase.table("customers").update({
        "is_deleted": True,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(customer_id)).execute()
    
    return {"success": True, "message": "Customer deleted successfully"}
