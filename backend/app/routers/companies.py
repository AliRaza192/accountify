from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from supabase import create_client, Client

from app.config import settings
from app.database import get_db
from app.types import Company, User
from app.routers.auth import get_current_user, get_supabase_client

router = APIRouter()


class CompanyCreate(BaseModel):
    name: str
    ntn: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: str = "PKR"


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    ntn: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: Optional[str] = None


class CompanyResponse(BaseModel):
    success: bool
    data: Company
    message: str


class CompaniesListResponse(BaseModel):
    success: bool
    data: List[Company]
    message: str


@router.post("/", response_model=CompanyResponse)
async def create_company(
    company_data: CompanyCreate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    company_dict = company_data.model_dump()
    company_dict["created_by"] = current_user.id
    
    response = supabase.table("companies").insert(company_dict).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create company")
    
    return CompanyResponse(
        success=True,
        data=Company(**response.data[0]),
        message="Company created successfully"
    )


@router.get("/", response_model=CompanyResponse)
async def get_company(current_user: User = Depends(get_current_user)):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not associated with any company")
    
    response = supabase.table("companies").select("*").eq("id", current_user.company_id).eq("is_deleted", False).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    return CompanyResponse(
        success=True,
        data=Company(**response.data[0]),
        message="Company retrieved successfully"
    )


@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: UUID,
    company_data: CompanyUpdate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("companies").select("*").eq("id", str(company_id)).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    update_data = company_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    response = supabase.table("companies").update(update_data).eq("id", str(company_id)).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update company")
    
    return CompanyResponse(
        success=True,
        data=Company(**response.data[0]),
        message="Company updated successfully"
    )


@router.post("/{company_id}/logo", response_model=CompanyResponse)
async def upload_company_logo(
    company_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("companies").select("*").eq("id", str(company_id)).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    
    file_extension = file.filename.split(".")[-1] if file.filename else "png"
    file_name = f"{company_id}/logo.{file_extension}"
    
    file_content = await file.read()
    
    storage_response = supabase.storage.from_("company-logos").upload(file_name, file_content, {"upsert": True})
    
    public_url = supabase.storage.from_("company-logos").get_public_url(file_name)
    
    response = supabase.table("companies").update({"logo_url": public_url}).eq("id", str(company_id)).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update logo")
    
    return CompanyResponse(
        success=True,
        data=Company(**response.data[0]),
        message="Logo uploaded successfully"
    )
