from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
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


class VendorCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    ntn: Optional[str] = None
    credit_limit: Decimal = Decimal("0")
    payment_terms: int = 30


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    ntn: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms: Optional[int] = None


class VendorResponse(BaseModel):
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


class VendorDetailResponse(BaseModel):
    success: bool
    data: VendorResponse
    message: str


class VendorsListResponse(BaseModel):
    success: bool
    data: List[VendorResponse]
    total: int
    message: str


@router.get("/", response_model=VendorsListResponse)
async def list_vendors(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    query = supabase.table("vendors").select("*", count="exact").eq("company_id", current_user.company_id).eq("is_deleted", False)
    
    if search:
        query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%")
    
    response = query.order("name").execute()
    
    vendors = []
    for vendor in response.data:
        vendors.append(VendorResponse(**vendor))
    
    return VendorsListResponse(
        success=True,
        data=vendors,
        total=response.count or 0,
        message="Vendors retrieved successfully"
    )


@router.post("/", response_model=VendorDetailResponse)
async def create_vendor(
    vendor_data: VendorCreate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    existing = supabase.table("vendors").select("id").eq("email", vendor_data.email).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if existing.data and len(existing.data) > 0 and vendor_data.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    
    vendor_dict = vendor_data.model_dump()
    vendor_dict["company_id"] = str(current_user.company_id)
    
    response = supabase.table("vendors").insert(vendor_dict).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create vendor")
    
    return VendorDetailResponse(
        success=True,
        data=VendorResponse(**response.data[0]),
        message="Vendor created successfully"
    )


@router.get("/{vendor_id}", response_model=VendorDetailResponse)
async def get_vendor(
    vendor_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    response = supabase.table("vendors").select("*").eq("id", str(vendor_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    
    return VendorDetailResponse(
        success=True,
        data=VendorResponse(**response.data[0]),
        message="Vendor retrieved successfully"
    )


@router.put("/{vendor_id}", response_model=VendorDetailResponse)
async def update_vendor(
    vendor_id: UUID,
    vendor_data: VendorUpdate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("vendors").select("*").eq("id", str(vendor_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    
    update_data = vendor_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    response = supabase.table("vendors").update(update_data).eq("id", str(vendor_id)).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update vendor")
    
    return VendorDetailResponse(
        success=True,
        data=VendorResponse(**response.data[0]),
        message="Vendor updated successfully"
    )


@router.delete("/{vendor_id}")
async def delete_vendor(
    vendor_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("vendors").select("*").eq("id", str(vendor_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    
    response = supabase.table("vendors").update({
        "is_deleted": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", str(vendor_id)).execute()
    
    return {"success": True, "message": "Vendor deleted successfully"}
