from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
from uuid import UUID


class User(BaseModel):
    id: str
    email: str
    full_name: str
    role: Optional[str] = "user"
    password_hash: Optional[str] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    is_deleted: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Company(BaseModel):
    id: str
    name: str
    ntn: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: str = "PKR"
    logo_url: Optional[str] = None
    owner_id: Optional[str] = None
    is_deleted: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
