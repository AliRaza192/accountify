"""
CRM API Router
Endpoints: Leads, Tickets, Loyalty Program, Dashboard
"""

import logging
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date
from uuid import UUID

from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user
from app.models.crm import Lead, CRMTicket, LoyaltyProgram, LoyaltyPoints
from app.schemas.crm import (
    LeadCreate, LeadUpdate, LeadUpdateStage, LeadResponse, LeadPipelineStage,
    CRMTicketCreate, CRMTicketUpdate, CRMTicketResolve, CRMTicketResponse,
    LoyaltyProgramCreate, LoyaltyProgramUpdate, LoyaltyProgramResponse,
    LoyaltyPointsEarn, LoyaltyPointsRedeem, LoyaltyPointsResponse, CustomerPointsSummary,
    CRMDashboardSummary
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ============ Helper Functions ============

def get_next_lead_code(db: Session, company_id: UUID) -> str:
    """Generate next lead code"""
    from sqlalchemy import select, func
    query = select(func.max(Lead.lead_code)).where(Lead.company_id == company_id)
    max_code = db.execute(query).scalar()
    if max_code:
        try:
            num = int(max_code.split('-')[1]) + 1
        except:
            num = 1
    else:
        num = 1
    return f"LEAD-{num:03d}"


def get_next_ticket_number(db: Session, company_id: UUID) -> str:
    """Generate next ticket number"""
    from sqlalchemy import select, func
    query = select(func.max(CRMTicket.ticket_number)).where(CRMTicket.company_id == company_id)
    max_number = db.execute(query).scalar()
    if max_number:
        try:
            num = int(max_number.split('-')[1]) + 1
        except:
            num = 1
    else:
        num = 1
    return f"TKT-{num:03d}"


# ============ Leads Endpoints ============

@router.get("/leads", response_model=List[LeadResponse])
async def list_leads(
    stage: Optional[str] = None,
    source: Optional[str] = None,
    assigned_to: Optional[UUID] = None,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List leads with filters"""
    try:
        from sqlalchemy import select, and_
        query = select(Lead).where(Lead.company_id == current_user.company_id)
        
        if stage:
            query = query.where(Lead.stage == stage)
        if source:
            query = query.where(Lead.source == source)
        if assigned_to:
            query = query.where(Lead.assigned_to == assigned_to)
        
        query = query.order_by(Lead.created_at.desc())
        result = service.execute(query)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error listing leads: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead: LeadCreate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new lead"""
    try:
        lead_code = get_next_lead_code(service, current_user.company_id)
        db_lead = Lead(
            company_id=current_user.company_id,
            lead_code=lead_code,
            **lead.model_dump(exclude={'lead_code'})
        )
        service.add(db_lead)
        service.commit()
        service.refresh(db_lead)
        return db_lead
    except Exception as e:
        logger.error(f"Error creating lead: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: UUID,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get lead detail"""
    try:
        from sqlalchemy import select, and_
        query = select(Lead).where(
            and_(
                Lead.id == lead_id,
                Lead.company_id == current_user.company_id
            )
        )
        lead = service.execute(query).scalar_one_or_none()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return lead
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lead: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    lead: LeadUpdate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update lead"""
    try:
        from sqlalchemy import select, and_
        query = select(Lead).where(
            and_(
                Lead.id == lead_id,
                Lead.company_id == current_user.company_id
            )
        )
        db_lead = service.execute(query).scalar_one_or_none()
        if not db_lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        update_data = lead.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_lead, field, value)
        
        service.commit()
        service.refresh(db_lead)
        return db_lead
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lead: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/leads/{lead_id}/stage", response_model=LeadResponse)
async def update_lead_stage(
    lead_id: UUID,
    stage_data: LeadUpdateStage,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update lead stage"""
    try:
        from sqlalchemy import select, and_
        query = select(Lead).where(
            and_(
                Lead.id == lead_id,
                Lead.company_id == current_user.company_id
            )
        )
        db_lead = service.execute(query).scalar_one_or_none()
        if not db_lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        db_lead.stage = stage_data.stage
        service.commit()
        service.refresh(db_lead)
        return db_lead
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lead stage: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/leads/{lead_id}/convert", response_model=dict)
async def convert_lead_to_customer(
    lead_id: UUID,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Convert lead to customer"""
    try:
        from sqlalchemy import select, and_
        from app.models.customers import Customer
        
        # Get lead
        query = select(Lead).where(
            and_(
                Lead.id == lead_id,
                Lead.company_id == current_user.company_id
            )
        )
        lead = service.execute(query).scalar_one_or_none()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Create customer
        customer = Customer(
            company_id=current_user.company_id,
            name=lead.name,
            email=lead.contact_email,
            phone=lead.contact_phone,
            source=lead.source
        )
        service.add(customer)
        service.flush()
        
        # Update lead
        lead.stage = "converted"
        lead.converted_to_customer_id = customer.id
        service.commit()
        
        return {
            "lead_id": str(lead.id),
            "customer_id": str(customer.id),
            "customer_name": customer.name
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting lead: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/leads/pipeline", response_model=List[LeadPipelineStage])
async def get_pipeline_summary(
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get pipeline summary by stage"""
    try:
        from sqlalchemy import select, func, and_
        
        stages = ["new", "contacted", "proposal", "negotiation", "converted", "lost"]
        result = []
        
        for stage in stages:
            query = select(
                func.count(Lead.id).label('count'),
                func.coalesce(func.sum(Lead.estimated_value), 0).label('total_value')
            ).where(
                and_(
                    Lead.company_id == current_user.company_id,
                    Lead.stage == stage
                )
            )
            row = service.execute(query).first()
            
            probability = {"new": 10, "contacted": 25, "proposal": 50, "negotiation": 75, "converted": 100, "lost": 0}[stage]
            weighted_value = Decimal(str(row.total_value)) * Decimal(str(probability)) / 100
            
            result.append(LeadPipelineStage(
                stage=stage,
                count=row.count,
                total_value=Decimal(str(row.total_value)),
                weighted_value=weighted_value
            ))
        
        return result
    except Exception as e:
        logger.error(f"Error getting pipeline summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Tickets Endpoints ============

@router.get("/tickets", response_model=List[CRMTicketResponse])
async def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    customer_id: Optional[UUID] = None,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List tickets with filters"""
    try:
        from sqlalchemy import select, and_
        query = select(CRMTicket).where(CRMTicket.company_id == current_user.company_id)
        
        if status_filter:
            query = query.where(CRMTicket.status == status_filter)
        if priority:
            query = query.where(CRMTicket.priority == priority)
        if customer_id:
            query = query.where(CRMTicket.customer_id == customer_id)
        
        query = query.order_by(CRMTicket.created_at.desc())
        result = service.execute(query)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error listing tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tickets", response_model=CRMTicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket: CRMTicketCreate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new ticket"""
    try:
        ticket_number = get_next_ticket_number(service, current_user.company_id)
        db_ticket = CRMTicket(
            company_id=current_user.company_id,
            ticket_number=ticket_number,
            **ticket.model_dump(exclude={'ticket_number'})
        )
        service.add(db_ticket)
        service.commit()
        service.refresh(db_ticket)
        return db_ticket
    except Exception as e:
        logger.error(f"Error creating ticket: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tickets/{ticket_id}", response_model=CRMTicketResponse)
async def get_ticket(
    ticket_id: UUID,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get ticket detail"""
    try:
        from sqlalchemy import select, and_
        query = select(CRMTicket).where(
            and_(
                CRMTicket.id == ticket_id,
                CRMTicket.company_id == current_user.company_id
            )
        )
        ticket = service.execute(query).scalar_one_or_none()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        return ticket
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/tickets/{ticket_id}", response_model=CRMTicketResponse)
async def update_ticket(
    ticket_id: UUID,
    ticket: CRMTicketUpdate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update ticket"""
    try:
        from sqlalchemy import select, and_
        query = select(CRMTicket).where(
            and_(
                CRMTicket.id == ticket_id,
                CRMTicket.company_id == current_user.company_id
            )
        )
        db_ticket = service.execute(query).scalar_one_or_none()
        if not db_ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        update_data = ticket.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_ticket, field, value)
        
        service.commit()
        service.refresh(db_ticket)
        return db_ticket
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating ticket: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/tickets/{ticket_id}/resolve", response_model=CRMTicketResponse)
async def resolve_ticket(
    ticket_id: UUID,
    resolve_data: CRMTicketResolve,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resolve ticket"""
    try:
        from sqlalchemy import select, and_
        query = select(CRMTicket).where(
            and_(
                CRMTicket.id == ticket_id,
                CRMTicket.company_id == current_user.company_id
            )
        )
        db_ticket = service.execute(query).scalar_one_or_none()
        if not db_ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        db_ticket.status = "resolved"
        db_ticket.resolution_notes = resolve_data.resolution_notes
        db_ticket.resolved_at = date.today()
        if resolve_data.satisfaction_rating:
            db_ticket.satisfaction_rating = resolve_data.satisfaction_rating
        
        service.commit()
        service.refresh(db_ticket)
        return db_ticket
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving ticket: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Loyalty Program Endpoints ============

@router.get("/loyalty/program", response_model=LoyaltyProgramResponse)
async def get_loyalty_program(
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get loyalty program settings"""
    try:
        from sqlalchemy import select
        query = select(LoyaltyProgram).where(LoyaltyProgram.company_id == current_user.company_id)
        program = service.execute(query).scalar_one_or_none()
        
        if not program:
            # Create default program
            program = LoyaltyProgram(
                company_id=current_user.company_id,
                program_name="Standard Loyalty Program",
                points_per_rupee=Decimal('1.0'),
                redemption_rate=Decimal('1.0'),
                is_active=True
            )
            service.add(program)
            service.commit()
            service.refresh(program)
        
        return program
    except Exception as e:
        logger.error(f"Error getting loyalty program: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/loyalty/program", response_model=LoyaltyProgramResponse)
async def update_loyalty_program(
    program_data: LoyaltyProgramUpdate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update loyalty program"""
    try:
        from sqlalchemy import select
        query = select(LoyaltyProgram).where(LoyaltyProgram.company_id == current_user.company_id)
        program = service.execute(query).scalar_one_or_none()
        
        if not program:
            program = LoyaltyProgram(company_id=current_user.company_id)
            service.add(program)
        
        update_data = program_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(program, field, value)
        
        service.commit()
        service.refresh(program)
        return program
    except Exception as e:
        logger.error(f"Error updating loyalty program: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/loyalty/points/{customer_id}", response_model=List[LoyaltyPointsResponse])
async def get_customer_points(
    customer_id: UUID,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customer loyalty points history"""
    try:
        from sqlalchemy import select
        query = select(LoyaltyPoints).where(
            LoyaltyPoints.company_id == current_user.company_id,
            LoyaltyPoints.customer_id == customer_id
        ).order_by(LoyaltyPoints.created_at.desc())
        result = service.execute(query)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error getting customer points: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/loyalty/points/earn", response_model=LoyaltyPointsResponse)
async def earn_points(
    points_data: LoyaltyPointsEarn,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Earn loyalty points"""
    try:
        # Get loyalty program
        from sqlalchemy import select
        program_query = select(LoyaltyProgram).where(LoyaltyProgram.company_id == current_user.company_id)
        program = service.execute(program_query).scalar_one_or_none()
        
        if not program or not program.is_active:
            raise HTTPException(status_code=400, detail="Loyalty program not active")
        
        # Calculate points
        points_earned = points_data.amount_spent * program.points_per_rupee
        
        # Create points record
        points = LoyaltyPoints(
            company_id=current_user.company_id,
            customer_id=points_data.customer_id,
            points=points_earned,
            transaction_type="earned",
            reference_id=points_data.reference_id,
            description=points_data.description or f"Earned on purchase of PKR {points_data.amount_spent}"
        )
        service.add(points)
        service.commit()
        service.refresh(points)
        return points
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error earning points: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/loyalty/points/redeem", response_model=LoyaltyPointsResponse)
async def redeem_points(
    points_data: LoyaltyPointsRedeem,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Redeem loyalty points"""
    try:
        from sqlalchemy import select, func, and_
        
        # Check customer has enough points
        points_query = select(func.sum(LoyaltyPoints.points)).where(
            and_(
                LoyaltyPoints.company_id == current_user.company_id,
                LoyaltyPoints.customer_id == points_data.customer_id,
                LoyaltyPoints.transaction_type.in_(["earned", "redeemed"])
            )
        )
        total_points = service.execute(points_query).scalar() or Decimal('0')
        
        if total_points < points_data.points_to_redeem:
            raise HTTPException(status_code=400, detail="Insufficient points")
        
        # Create redemption record
        points = LoyaltyPoints(
            company_id=current_user.company_id,
            customer_id=points_data.customer_id,
            points=-points_data.points_to_redeem,
            transaction_type="redeemed",
            reference_id=points_data.reference_id,
            description=points_data.description or f"Redeemed {points_data.points_to_redeem} points"
        )
        service.add(points)
        service.commit()
        service.refresh(points)
        return points
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error redeeming points: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ CRM Dashboard Endpoint ============

@router.get("/dashboard", response_model=CRMDashboardSummary)
async def get_crm_dashboard(
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get CRM dashboard summary"""
    try:
        from sqlalchemy import select, func, and_
        
        # Total leads
        total_leads_query = select(func.count(Lead.id)).where(Lead.company_id == current_user.company_id)
        total_leads = service.execute(total_leads_query).scalar() or 0
        
        # Leads by stage
        leads_by_stage = {}
        for stage in ["new", "contacted", "proposal", "negotiation", "converted", "lost"]:
            stage_query = select(func.count(Lead.id)).where(
                and_(
                    Lead.company_id == current_user.company_id,
                    Lead.stage == stage
                )
            )
            leads_by_stage[stage] = service.execute(stage_query).scalar() or 0
        
        # Pipeline value
        pipeline_query = select(
            func.coalesce(func.sum(Lead.estimated_value), 0),
            func.coalesce(func.sum(Lead.estimated_value * Lead.probability_percent / 100), 0)
        ).where(
            and_(
                Lead.company_id == current_user.company_id,
                Lead.stage.not_in(["converted", "lost"])
            )
        )
        pipeline_result = service.execute(pipeline_query).first()
        pipeline_value = Decimal(str(pipeline_result[0])) if pipeline_result else Decimal('0')
        weighted_value = Decimal(str(pipeline_result[1])) if pipeline_result else Decimal('0')
        
        # Open tickets
        open_tickets_query = select(func.count(CRMTicket.id)).where(
            and_(
                CRMTicket.company_id == current_user.company_id,
                CRMTicket.status.in_(["open", "in_progress"])
            )
        )
        open_tickets = service.execute(open_tickets_query).scalar() or 0
        
        # Critical tickets
        critical_query = select(func.count(CRMTicket.id)).where(
            and_(
                CRMTicket.company_id == current_user.company_id,
                CRMTicket.priority == "critical",
                CRMTicket.status.in_(["open", "in_progress"])
            )
        )
        critical_tickets = service.execute(critical_query).scalar() or 0
        
        # Conversion rate
        converted = leads_by_stage.get("converted", 0)
        conversion_rate = Decimal(str(converted)) / Decimal(str(total_leads)) * 100 if total_leads > 0 else Decimal('0')
        
        return CRMDashboardSummary(
            total_leads=total_leads,
            leads_by_stage=leads_by_stage,
            pipeline_value=pipeline_value,
            weighted_pipeline_value=weighted_value,
            open_tickets=open_tickets,
            critical_tickets=critical_tickets,
            conversion_rate=conversion_rate,
            top_customers=[]
        )
    except Exception as e:
        logger.error(f"Error getting CRM dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))
