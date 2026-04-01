"""
CRM Pydantic Schemas
For API request/response validation
"""

from pydantic import BaseModel, Field, ConfigDict, EmailStr
from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID

from app.schemas.base import AuditableSchema, CompanyBaseSchema


# ============ Lead Schemas ============

class LeadBase(CompanyBaseSchema):
    """Base schema for lead"""
    lead_code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=200)
    contact_phone: Optional[str] = Field(None, max_length=20)
    contact_email: Optional[EmailStr] = Field(None, max_length=100)
    source: str = Field(..., pattern="^(website|whatsapp|referral|walk_in|cold_call)$")
    requirement: Optional[str] = None
    estimated_value: Optional[Decimal] = Field(None, gt=0)
    probability_percent: int = Field(default=50, ge=0, le=100)
    stage: str = Field(default="new", pattern="^(new|contacted|proposal|negotiation|converted|lost)$")
    assigned_to: Optional[UUID] = None
    follow_up_date: Optional[date] = None
    ai_score: Optional[int] = Field(None, ge=0, le=100)


class LeadCreate(LeadBase):
    """Schema for creating lead"""
    pass


class LeadUpdate(BaseModel):
    """Schema for updating lead"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_phone: Optional[str] = Field(None, max_length=20)
    contact_email: Optional[EmailStr] = Field(None, max_length=100)
    source: Optional[str] = Field(None, pattern="^(website|whatsapp|referral|walk_in|cold_call)$")
    requirement: Optional[str] = None
    estimated_value: Optional[Decimal] = Field(None, gt=0)
    probability_percent: Optional[int] = Field(None, ge=0, le=100)
    stage: Optional[str] = Field(None, pattern="^(new|contacted|proposal|negotiation|converted|lost)$")
    assigned_to: Optional[UUID] = None
    follow_up_date: Optional[date] = None


class LeadUpdateStage(BaseModel):
    """Schema for updating lead stage"""
    stage: str = Field(..., pattern="^(new|contacted|proposal|negotiation|converted|lost)$")


class LeadResponse(AuditableSchema):
    """Schema for lead response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    lead_code: str
    name: str
    contact_phone: Optional[str]
    contact_email: Optional[str]
    source: str
    requirement: Optional[str]
    estimated_value: Optional[Decimal]
    probability_percent: int
    stage: str
    assigned_to: Optional[UUID]
    follow_up_date: Optional[date]
    ai_score: Optional[int]
    converted_to_customer_id: Optional[UUID]


class LeadPipelineStage(BaseModel):
    """Pipeline stage summary"""
    stage: str
    count: int
    total_value: Decimal
    weighted_value: Decimal


# ============ Ticket Schemas ============

class CRMTicketBase(CompanyBaseSchema):
    """Base schema for ticket"""
    ticket_number: str = Field(..., min_length=1, max_length=20)
    customer_id: UUID
    issue_category: str = Field(..., pattern="^(billing|technical|general|complaint)$")
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    assigned_to: Optional[UUID] = None
    status: str = Field(default="open", pattern="^(open|in_progress|waiting_customer|resolved|closed)$")
    description: str = Field(..., min_length=1, max_length=1000)
    resolution_notes: Optional[str] = None
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)


class CRMTicketCreate(CRMTicketBase):
    """Schema for creating ticket"""
    pass


class CRMTicketUpdate(BaseModel):
    """Schema for updating ticket"""
    issue_category: Optional[str] = Field(None, pattern="^(billing|technical|general|complaint)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    assigned_to: Optional[UUID] = None
    status: Optional[str] = Field(None, pattern="^(open|in_progress|waiting_customer|resolved|closed)$")
    description: Optional[str] = Field(None, min_length=1, max_length=1000)
    resolution_notes: Optional[str] = None
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)


class CRMTicketResolve(BaseModel):
    """Schema for resolving ticket"""
    resolution_notes: str = Field(..., min_length=1, max_length=1000)
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)


class CRMTicketResponse(AuditableSchema):
    """Schema for ticket response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    ticket_number: str
    customer_id: UUID
    issue_category: str
    priority: str
    assigned_to: Optional[UUID]
    status: str
    description: str
    resolution_notes: Optional[str]
    satisfaction_rating: Optional[int]
    resolved_at: Optional[date]


# ============ Loyalty Program Schemas ============

class LoyaltyProgramBase(CompanyBaseSchema):
    """Base schema for loyalty program"""
    program_name: str = Field(..., min_length=1, max_length=100)
    points_per_rupee: Decimal = Field(default=1.0, gt=0)
    redemption_rate: Decimal = Field(default=1.0, gt=0)
    tier_benefits_json: Optional[Dict[str, Any]] = None
    is_active: bool = True


class LoyaltyProgramCreate(LoyaltyProgramBase):
    """Schema for creating loyalty program"""
    pass


class LoyaltyProgramUpdate(BaseModel):
    """Schema for updating loyalty program"""
    program_name: Optional[str] = Field(None, min_length=1, max_length=100)
    points_per_rupee: Optional[Decimal] = Field(None, gt=0)
    redemption_rate: Optional[Decimal] = Field(None, gt=0)
    tier_benefits_json: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class LoyaltyProgramResponse(AuditableSchema):
    """Schema for loyalty program response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    program_name: str
    points_per_rupee: Decimal
    redemption_rate: Decimal
    tier_benefits_json: Optional[Dict[str, Any]]
    is_active: bool


# ============ Loyalty Points Schemas ============

class LoyaltyPointsEarn(BaseModel):
    """Schema for earning points"""
    customer_id: UUID
    amount_spent: Decimal = Field(..., gt=0)
    reference_id: Optional[UUID] = None
    description: Optional[str] = None


class LoyaltyPointsRedeem(BaseModel):
    """Schema for redeeming points"""
    customer_id: UUID
    points_to_redeem: Decimal = Field(..., gt=0)
    reference_id: Optional[UUID] = None
    description: Optional[str] = None


class LoyaltyPointsResponse(BaseModel):
    """Schema for loyalty points response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    customer_id: UUID
    points: Decimal
    transaction_type: str
    reference_id: Optional[UUID]
    description: Optional[str]
    expiry_date: Optional[date]
    created_at: date


class CustomerPointsSummary(BaseModel):
    """Customer points summary"""
    customer_id: UUID
    customer_name: str
    total_points: Decimal
    points_earned: Decimal
    points_redeemed: Decimal
    points_expired: Decimal


# ============ CRM Dashboard Schema ============

class CRMDashboardSummary(BaseModel):
    """CRM dashboard summary"""
    total_leads: int
    leads_by_stage: Dict[str, int]
    pipeline_value: Decimal
    weighted_pipeline_value: Decimal
    open_tickets: int
    critical_tickets: int
    conversion_rate: Decimal
    top_customers: List[Dict[str, Any]]
