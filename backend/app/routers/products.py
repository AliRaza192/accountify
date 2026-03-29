from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
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


class ProductCreate(BaseModel):
    name: str
    code: str
    category: Optional[str] = None
    sale_price: Decimal
    purchase_price: Decimal
    tax_rate: Decimal = Decimal("0")
    unit: str = "unit"
    track_inventory: bool = True
    reorder_level: int = 0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    sale_price: Optional[Decimal] = None
    purchase_price: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    unit: Optional[str] = None
    track_inventory: Optional[bool] = None
    reorder_level: Optional[int] = None


class ProductResponse(BaseModel):
    id: UUID
    name: str
    code: str
    category: Optional[str]
    sale_price: Decimal
    purchase_price: Decimal
    tax_rate: Decimal
    unit: str
    track_inventory: bool
    reorder_level: int
    company_id: UUID
    stock_quantity: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class ProductDetailResponse(BaseModel):
    success: bool
    data: ProductResponse
    message: str


class ProductsListResponse(BaseModel):
    success: bool
    data: List[ProductResponse]
    total: int
    message: str


@router.get("/", response_model=ProductsListResponse)
async def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    query = supabase.table("products").select("*", count="exact").eq("company_id", current_user.company_id).eq("is_deleted", False)
    
    if search:
        query = query.or_(f"name.ilike.%{search}%,code.ilike.%{search}%")
    
    if category:
        query = query.eq("category", category)
    
    response = query.order("name").execute()
    
    products = []
    for prod in response.data:
        stock_response = supabase.table("inventory").select("quantity").eq("product_id", prod["id"]).eq("is_deleted", False).execute()
        stock_quantity = sum(item["quantity"] for item in stock_response.data) if stock_response.data else 0
        
        products.append(ProductResponse(
            **prod,
            stock_quantity=stock_quantity
        ))
    
    return ProductsListResponse(
        success=True,
        data=products,
        total=response.count or 0,
        message="Products retrieved successfully"
    )


@router.post("/", response_model=ProductDetailResponse)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    existing = supabase.table("products").select("id").eq("code", product_data.code).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if existing.data and len(existing.data) > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product code already exists")
    
    product_dict = product_data.model_dump()
    product_dict["company_id"] = str(current_user.company_id)
    
    response = supabase.table("products").insert(product_dict).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create product")
    
    return ProductDetailResponse(
        success=True,
        data=ProductResponse(**response.data[0]),
        message="Product created successfully"
    )


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(
    product_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    response = supabase.table("products").select("*").eq("id", str(product_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    product = response.data[0]
    
    stock_response = supabase.table("inventory").select("quantity").eq("product_id", str(product_id)).eq("is_deleted", False).execute()
    stock_quantity = sum(item["quantity"] for item in stock_response.data) if stock_response.data else 0
    
    return ProductDetailResponse(
        success=True,
        data=ProductResponse(**product, stock_quantity=stock_quantity),
        message="Product retrieved successfully"
    )


@router.put("/{product_id}", response_model=ProductDetailResponse)
async def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("products").select("*").eq("id", str(product_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    update_data = product_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    response = supabase.table("products").update(update_data).eq("id", str(product_id)).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update product")
    
    product = response.data[0]
    
    stock_response = supabase.table("inventory").select("quantity").eq("product_id", str(product_id)).eq("is_deleted", False).execute()
    stock_quantity = sum(item["quantity"] for item in stock_response.data) if stock_response.data else 0
    
    return ProductDetailResponse(
        success=True,
        data=ProductResponse(**product, stock_quantity=stock_quantity),
        message="Product updated successfully"
    )


@router.delete("/{product_id}")
async def delete_product(
    product_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("products").select("*").eq("id", str(product_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    response = supabase.table("products").update({
        "is_deleted": True,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", str(product_id)).execute()
    
    return {"success": True, "message": "Product deleted successfully"}
