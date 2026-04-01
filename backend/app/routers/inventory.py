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


class InventoryItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    product_code: str
    warehouse_id: Optional[UUID]
    warehouse_name: Optional[str]
    quantity: int
    reorder_level: int
    unit: str
    company_id: UUID
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class InventoryListResponse(BaseModel):
    success: bool
    data: List[InventoryItemResponse]
    total: int
    message: str


class LowStockItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_name: str
    product_code: str
    warehouse_id: Optional[UUID]
    warehouse_name: Optional[str]
    quantity: int
    reorder_level: int
    shortage: int
    unit: str


class LowStockListResponse(BaseModel):
    success: bool
    data: List[LowStockItemResponse]
    message: str


class StockAdjustmentCreate(BaseModel):
    product_id: UUID
    quantity: int
    reason: str
    warehouse_id: Optional[UUID] = None


class StockTransferCreate(BaseModel):
    product_id: UUID
    quantity: int
    from_warehouse_id: UUID
    to_warehouse_id: UUID
    reason: str


class AdjustmentResponse(BaseModel):
    success: bool
    message: str
    data: dict


class TransferResponse(BaseModel):
    success: bool
    message: str


@router.get("/", response_model=InventoryListResponse)
async def list_inventory(
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    response = supabase.table("inventory").select("*, products(name, code, unit, reorder_level), warehouses(name)").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    items = []
    for item in response.data:
        items.append(InventoryItemResponse(
            id=item["id"],
            product_id=item["product_id"],
            product_name=item["products"]["name"],
            product_code=item["products"]["code"],
            warehouse_id=item["warehouse_id"],
            warehouse_name=item["warehouses"]["name"] if item["warehouses"] else None,
            quantity=item["quantity"],
            reorder_level=item["products"]["reorder_level"],
            unit=item["products"]["unit"],
            company_id=item["company_id"],
            created_at=item["created_at"],
            updated_at=item["updated_at"],
            is_deleted=item["is_deleted"]
        ))
    
    return InventoryListResponse(
        success=True,
        data=items,
        total=len(items),
        message="Inventory retrieved successfully"
    )


@router.get("/low-stock", response_model=LowStockListResponse)
async def get_low_stock_items(
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    response = supabase.table("inventory").select("*, products(name, code, unit, reorder_level), warehouses(name)").eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    low_stock_items = []
    for item in response.data:
        if item["quantity"] < item["products"]["reorder_level"]:
            low_stock_items.append(LowStockItemResponse(
                id=item["id"],
                product_id=item["product_id"],
                product_name=item["products"]["name"],
                product_code=item["products"]["code"],
                warehouse_id=item["warehouse_id"],
                warehouse_name=item["warehouses"]["name"] if item["warehouses"] else None,
                quantity=item["quantity"],
                reorder_level=item["products"]["reorder_level"],
                shortage=item["products"]["reorder_level"] - item["quantity"],
                unit=item["products"]["unit"]
            ))
    
    return LowStockListResponse(
        success=True,
        data=low_stock_items,
        message=f"Found {len(low_stock_items)} items below reorder level"
    )


@router.post("/adjustment", response_model=AdjustmentResponse)
async def create_stock_adjustment(
    adjustment_data: StockAdjustmentCreate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    product = supabase.table("products").select("*").eq("id", str(adjustment_data.product_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not product.data or len(product.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    warehouse_id = str(adjustment_data.warehouse_id) if adjustment_data.warehouse_id else None
    
    existing = supabase.table("inventory").select("*").eq("product_id", str(adjustment_data.product_id)).eq("company_id", current_user.company_id).eq("is_deleted", False)
    if warehouse_id:
        existing = existing.eq("warehouse_id", warehouse_id)
    else:
        existing = existing.is_("warehouse_id", None)
    
    existing_response = existing.execute()
    
    if existing_response.data and len(existing_response.data) > 0:
        current_qty = existing_response.data[0]["quantity"]
        new_qty = current_qty + adjustment_data.quantity
        
        if new_qty < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")
        
        update_data = {
            "quantity": new_qty,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        update_query = supabase.table("inventory").update(update_data).eq("id", existing_response.data[0]["id"])
        update_query.execute()
        
        inventory_id = existing_response.data[0]["id"]
    else:
        if adjustment_data.quantity < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot create negative inventory")
        
        insert_data = {
            "product_id": str(adjustment_data.product_id),
            "warehouse_id": warehouse_id,
            "quantity": adjustment_data.quantity,
            "company_id": str(current_user.company_id),
        }
        
        response = supabase.table("inventory").insert(insert_data).execute()
        inventory_id = response.data[0]["id"] if response.data else None
    
    adjustment_dict = {
        "inventory_id": str(inventory_id) if inventory_id else None,
        "product_id": str(adjustment_data.product_id),
        "quantity": adjustment_data.quantity,
        "reason": adjustment_data.reason,
        "company_id": str(current_user.company_id),
        "created_by": str(current_user.id),
    }
    supabase.table("stock_adjustments").insert(adjustment_dict).execute()
    
    return AdjustmentResponse(
        success=True,
        message="Stock adjustment recorded successfully",
        data={"inventory_id": str(inventory_id), "quantity_change": adjustment_data.quantity}
    )


@router.post("/transfer", response_model=TransferResponse)
async def transfer_stock(
    transfer_data: StockTransferCreate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    if transfer_data.from_warehouse_id == transfer_data.to_warehouse_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source and destination warehouses must be different")
    
    from_inventory = supabase.table("inventory").select("*").eq("product_id", str(transfer_data.product_id)).eq("warehouse_id", str(transfer_data.from_warehouse_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    if not from_inventory.data or len(from_inventory.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found in source warehouse")
    
    current_qty = from_inventory.data[0]["quantity"]
    if current_qty < transfer_data.quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock in source warehouse")
    
    supabase.table("inventory").update({
        "quantity": current_qty - transfer_data.quantity,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", from_inventory.data[0]["id"]).execute()
    
    to_inventory = supabase.table("inventory").select("*").eq("product_id", str(transfer_data.product_id)).eq("warehouse_id", str(transfer_data.to_warehouse_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    if to_inventory.data and len(to_inventory.data) > 0:
        new_qty = to_inventory.data[0]["quantity"] + transfer_data.quantity
        supabase.table("inventory").update({
            "quantity": new_qty,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", to_inventory.data[0]["id"]).execute()
    else:
        insert_data = {
            "product_id": str(transfer_data.product_id),
            "warehouse_id": str(transfer_data.to_warehouse_id),
            "quantity": transfer_data.quantity,
            "company_id": str(current_user.company_id),
        }
        supabase.table("inventory").insert(insert_data).execute()
    
    transfer_dict = {
        "product_id": str(transfer_data.product_id),
        "quantity": transfer_data.quantity,
        "from_warehouse_id": str(transfer_data.from_warehouse_id),
        "to_warehouse_id": str(transfer_data.to_warehouse_id),
        "reason": transfer_data.reason,
        "company_id": str(current_user.company_id),
        "created_by": str(current_user.id),
    }
    supabase.table("stock_transfers").insert(transfer_dict).execute()
    
    return TransferResponse(
        success=True,
        message="Stock transfer completed successfully"
    )
