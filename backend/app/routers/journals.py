from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
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


class JournalLineCreate(BaseModel):
    account_id: UUID
    debit: Decimal = Field(default=Decimal("0"), ge=0)
    credit: Decimal = Field(default=Decimal("0"), ge=0)
    description: Optional[str] = None


class JournalEntryCreate(BaseModel):
    reference: str
    date: datetime
    description: str
    lines: List[JournalLineCreate]
    is_posted: bool = False


class JournalEntryUpdate(BaseModel):
    reference: Optional[str] = None
    description: Optional[str] = None
    lines: Optional[List[JournalLineCreate]] = None


class JournalLineResponse(BaseModel):
    id: UUID
    journal_entry_id: UUID
    account_id: UUID
    account_name: str
    debit: Decimal
    credit: Decimal
    description: Optional[str]
    created_at: datetime


class JournalEntryResponse(BaseModel):
    id: UUID
    reference: str
    date: datetime
    description: str
    is_posted: bool
    company_id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    lines: Optional[List[JournalLineResponse]] = None


class JournalListResponse(BaseModel):
    success: bool
    data: List[JournalEntryResponse]
    total: int
    page: int
    per_page: int
    message: str


class JournalDetailResponse(BaseModel):
    success: bool
    data: JournalEntryResponse
    message: str


def validate_journal_lines(lines: List[JournalLineCreate]):
    total_debit = sum(line.debit for line in lines)
    total_credit = sum(line.credit for line in lines)
    
    if total_debit != total_credit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Debits ({total_debit}) must equal credits ({total_credit})"
        )
    
    if total_debit == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Journal entry must have non-zero amounts"
        )


@router.get("/", response_model=JournalListResponse)
async def list_journals(
    page: int = 1,
    per_page: int = 20,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    offset = (page - 1) * per_page
    
    response = supabase.table("journal_entries").select("*", count="exact").eq("company_id", current_user.company_id).eq("is_deleted", False).order("date", desc=True).range(offset, offset + per_page - 1).execute()
    
    journals = []
    for entry in response.data:
        lines_response = supabase.table("journal_lines").select("*, accounts(name)").eq("journal_entry_id", entry["id"]).execute()
        lines = []
        for line in lines_response.data:
            lines.append(JournalLineResponse(
                id=line["id"],
                journal_entry_id=line["journal_entry_id"],
                account_id=line["account_id"],
                account_name=line["accounts"]["name"],
                debit=line["debit"],
                credit=line["credit"],
                description=line.get("description"),
                created_at=line["created_at"]
            ))
        
        journals.append(JournalEntryResponse(
            id=entry["id"],
            reference=entry["reference"],
            date=entry["date"],
            description=entry["description"],
            is_posted=entry["is_posted"],
            company_id=entry["company_id"],
            created_by=entry["created_by"],
            created_at=entry["created_at"],
            updated_at=entry["updated_at"],
            is_deleted=entry["is_deleted"],
            lines=lines
        ))
    
    return JournalListResponse(
        success=True,
        data=journals,
        total=response.count or 0,
        page=page,
        per_page=per_page,
        message="Journal entries retrieved successfully"
    )


@router.post("/", response_model=JournalDetailResponse)
async def create_journal(
    journal_data: JournalEntryCreate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    if not current_user.company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not associated with any company")
    
    validate_journal_lines(journal_data.lines)
    
    entry_dict = {
        "reference": journal_data.reference,
        "date": journal_data.date.isoformat(),
        "description": journal_data.description,
        "is_posted": journal_data.is_posted,
        "company_id": str(current_user.company_id),
        "created_by": str(current_user.id),
    }
    
    response = supabase.table("journal_entries").insert(entry_dict).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create journal entry")
    
    entry_id = response.data[0]["id"]
    
    for line in journal_data.lines:
        line_dict = {
            "journal_entry_id": str(entry_id),
            "account_id": str(line.account_id),
            "debit": float(line.debit),
            "credit": float(line.credit),
            "description": line.description,
        }
        supabase.table("journal_lines").insert(line_dict).execute()
    
    lines_response = supabase.table("journal_lines").select("*, accounts(name)").eq("journal_entry_id", str(entry_id)).execute()
    lines = []
    for line in lines_response.data:
        lines.append(JournalLineResponse(
            id=line["id"],
            journal_entry_id=line["journal_entry_id"],
            account_id=line["account_id"],
            account_name=line["accounts"]["name"],
            debit=line["debit"],
            credit=line["credit"],
            description=line.get("description"),
            created_at=line["created_at"]
        ))
    
    return JournalDetailResponse(
        success=True,
        data=JournalEntryResponse(
            id=entry_id,
            reference=response.data[0]["reference"],
            date=response.data[0]["date"],
            description=response.data[0]["description"],
            is_posted=response.data[0]["is_posted"],
            company_id=response.data[0]["company_id"],
            created_by=response.data[0]["created_by"],
            created_at=response.data[0]["created_at"],
            updated_at=response.data[0]["updated_at"],
            is_deleted=response.data[0]["is_deleted"],
            lines=lines
        ),
        message="Journal entry created successfully"
    )


@router.get("/{entry_id}", response_model=JournalDetailResponse)
async def get_journal(
    entry_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    response = supabase.table("journal_entries").select("*").eq("id", str(entry_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    
    entry = response.data[0]
    
    lines_response = supabase.table("journal_lines").select("*, accounts(name)").eq("journal_entry_id", str(entry_id)).execute()
    lines = []
    for line in lines_response.data:
        lines.append(JournalLineResponse(
            id=line["id"],
            journal_entry_id=line["journal_entry_id"],
            account_id=line["account_id"],
            account_name=line["accounts"]["name"],
            debit=line["debit"],
            credit=line["credit"],
            description=line.get("description"),
            created_at=line["created_at"]
        ))
    
    return JournalDetailResponse(
        success=True,
        data=JournalEntryResponse(
            id=entry["id"],
            reference=entry["reference"],
            date=entry["date"],
            description=entry["description"],
            is_posted=entry["is_posted"],
            company_id=entry["company_id"],
            created_by=entry["created_by"],
            created_at=entry["created_at"],
            updated_at=entry["updated_at"],
            is_deleted=entry["is_deleted"],
            lines=lines
        ),
        message="Journal entry retrieved successfully"
    )


@router.put("/{entry_id}", response_model=JournalDetailResponse)
async def update_journal(
    entry_id: UUID,
    journal_data: JournalEntryUpdate,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("journal_entries").select("*").eq("id", str(entry_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    
    if existing.data[0]["is_posted"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update posted journal entry")
    
    update_data = journal_data.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if journal_data.lines:
        validate_journal_lines(journal_data.lines)
        supabase.table("journal_lines").delete().eq("journal_entry_id", str(entry_id)).execute()
        
        for line in journal_data.lines:
            line_dict = {
                "journal_entry_id": str(entry_id),
                "account_id": str(line.account_id),
                "debit": float(line.debit),
                "credit": float(line.credit),
                "description": line.description,
            }
            supabase.table("journal_lines").insert(line_dict).execute()
    
    response = supabase.table("journal_entries").update(update_data).eq("id", str(entry_id)).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update journal entry")
    
    lines_response = supabase.table("journal_lines").select("*, accounts(name)").eq("journal_entry_id", str(entry_id)).execute()
    lines = []
    for line in lines_response.data:
        lines.append(JournalLineResponse(
            id=line["id"],
            journal_entry_id=line["journal_entry_id"],
            account_id=line["account_id"],
            account_name=line["accounts"]["name"],
            debit=line["debit"],
            credit=line["credit"],
            description=line.get("description"),
            created_at=line["created_at"]
        ))
    
    return JournalDetailResponse(
        success=True,
        data=JournalEntryResponse(
            id=entry_id,
            reference=response.data[0]["reference"],
            date=response.data[0]["date"],
            description=response.data[0]["description"],
            is_posted=response.data[0]["is_posted"],
            company_id=response.data[0]["company_id"],
            created_by=response.data[0]["created_by"],
            created_at=response.data[0]["created_at"],
            updated_at=response.data[0]["updated_at"],
            is_deleted=response.data[0]["is_deleted"],
            lines=lines
        ),
        message="Journal entry updated successfully"
    )


@router.post("/{entry_id}/post", response_model=JournalDetailResponse)
async def post_journal(
    entry_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("journal_entries").select("*").eq("id", str(entry_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    
    if existing.data[0]["is_posted"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Journal entry already posted")
    
    response = supabase.table("journal_entries").update({
        "is_posted": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", str(entry_id)).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to post journal entry")
    
    lines_response = supabase.table("journal_lines").select("*, accounts(name)").eq("journal_entry_id", str(entry_id)).execute()
    lines = []
    for line in lines_response.data:
        lines.append(JournalLineResponse(
            id=line["id"],
            journal_entry_id=line["journal_entry_id"],
            account_id=line["account_id"],
            account_name=line["accounts"]["name"],
            debit=line["debit"],
            credit=line["credit"],
            description=line.get("description"),
            created_at=line["created_at"]
        ))
    
    return JournalDetailResponse(
        success=True,
        data=JournalEntryResponse(
            id=entry_id,
            reference=response.data[0]["reference"],
            date=response.data[0]["date"],
            description=response.data[0]["description"],
            is_posted=response.data[0]["is_posted"],
            company_id=response.data[0]["company_id"],
            created_by=response.data[0]["created_by"],
            created_at=response.data[0]["created_at"],
            updated_at=response.data[0]["updated_at"],
            is_deleted=response.data[0]["is_deleted"],
            lines=lines
        ),
        message="Journal entry posted successfully"
    )


@router.delete("/{entry_id}")
async def delete_journal(
    entry_id: UUID,
    current_user: User = Depends(get_current_user)
):
    supabase = get_supabase_client()
    
    existing = supabase.table("journal_entries").select("*").eq("id", str(entry_id)).eq("company_id", current_user.company_id).eq("is_deleted", False).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    
    if existing.data[0]["is_posted"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete posted journal entry")
    
    response = supabase.table("journal_entries").update({
        "is_deleted": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", str(entry_id)).execute()
    
    return {"success": True, "message": "Journal entry deleted successfully"}
