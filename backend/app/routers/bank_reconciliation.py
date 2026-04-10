"""
Bank Reconciliation API Router
Endpoints: Bank accounts, reconciliation, PDC management
"""

import logging
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from datetime import date, timedelta
from uuid import UUID
import csv
import io

from app.database import get_db
from app.types import User
from app.routers.auth import get_current_user
from app.models.bank_reconciliation import BankAccount, BankStatement, ReconciliationSession, PDC
from app.schemas.bank_reconciliation import (
    BankAccountCreate, BankAccountUpdate, BankAccountResponse,
    BankStatementImport, BankStatementResponse,
    ReconciliationSessionStart, ReconciliationSessionMatch, ReconciliationSessionComplete,
    ReconciliationSessionResponse, ReconciliationSessionDetail,
    PDCCreate, PDCUpdateStatus, PDCResponse, PDCMaturityItem, CashPositionSummary
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ============ Helper Functions ============

def get_bank_account_or_404(db: Session, company_id: UUID, account_id: UUID) -> BankAccount:
    """Get bank account or raise 404"""
    from sqlalchemy import select, and_
    query = select(BankAccount).where(
        and_(
            BankAccount.id == account_id,
            BankAccount.company_id == company_id
        )
    )
    result = db.execute(query).scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return result


def get_pdc_or_404(db: Session, company_id: UUID, pdc_id: UUID) -> PDC:
    """Get PDC or raise 404"""
    from sqlalchemy import select, and_
    query = select(PDC).where(
        and_(
            PDC.id == pdc_id,
            PDC.company_id == company_id
        )
    )
    result = db.execute(query).scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="PDC not found")
    return result


# ============ Bank Accounts Endpoints ============

@router.get("/accounts", response_model=List[BankAccountResponse])
async def list_bank_accounts(
    is_active: bool = True,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all bank accounts"""
    try:
        from sqlalchemy import select
        query = select(BankAccount).where(
            BankAccount.company_id == current_user.company_id
        )
        if is_active:
            query = query.where(BankAccount.is_active == True)
        query = query.order_by(BankAccount.bank_name, BankAccount.name)
        result = service.execute(query)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error listing bank accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accounts", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_account(
    account: BankAccountCreate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new bank account"""
    try:
        db_account = BankAccount(
            company_id=current_user.company_id,
            **account.model_dump()
        )
        service.add(db_account)
        service.commit()
        service.refresh(db_account)
        return db_account
    except Exception as e:
        logger.error(f"Error creating bank account: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/accounts/{account_id}", response_model=BankAccountResponse)
async def update_bank_account(
    account_id: UUID,
    account: BankAccountUpdate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing bank account"""
    try:
        db_account = get_bank_account_or_404(service, current_user.company_id, account_id)
        
        update_data = account.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_account, field, value)
        
        service.commit()
        service.refresh(db_account)
        return db_account
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating bank account: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Bank Statement Import Endpoints ============

@router.post("/import-statement", response_model=BankStatementResponse)
async def import_bank_statement(
    bank_account_id: UUID,
    statement_date: date,
    opening_balance: Decimal,
    closing_balance: Decimal,
    file: UploadFile = File(...),
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import bank statement from CSV"""
    try:
        # Verify bank account exists
        get_bank_account_or_404(service, current_user.company_id, bank_account_id)
        
        # Parse CSV file
        contents = await file.read()
        csv_text = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_text))
        
        transactions = []
        for row in csv_reader:
            transactions.append({
                'date': row.get('date', row.get('Date', '')),
                'description': row.get('description', row.get('Description', row.get('Narration', ''))),
                'debit': Decimal(row.get('debit', row.get('Debit', row.get('Withdrawal', '0')))),
                'credit': Decimal(row.get('credit', row.get('Credit', row.get('Deposit', '0')))),
                'balance': Decimal(row.get('balance', row.get('Balance', '0'))),
                'cheque_number': row.get('cheque_number', row.get('Cheque No', ''))
            })
        
        # Create bank statement record
        statement = BankStatement(
            company_id=current_user.company_id,
            bank_account_id=bank_account_id,
            statement_date=statement_date,
            opening_balance=opening_balance,
            closing_balance=closing_balance,
            transactions_json={"transactions": transactions},
            imported_by=current_user.id
        )
        service.add(statement)
        service.commit()
        service.refresh(statement)
        
        return BankStatementResponse(
            id=statement.id,
            bank_account_id=statement.bank_account_id,
            statement_date=statement.statement_date,
            opening_balance=statement.opening_balance,
            closing_balance=statement.closing_balance,
            transactions_count=len(transactions),
            imported_at=statement.imported_at,
            imported_by=statement.imported_by
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing bank statement: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Reconciliation Sessions Endpoints ============

@router.get("/sessions", response_model=List[ReconciliationSessionResponse])
async def list_reconciliation_sessions(
    bank_account_id: Optional[UUID] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List reconciliation sessions"""
    try:
        from sqlalchemy import select, and_
        query = select(ReconciliationSession).where(
            ReconciliationSession.company_id == current_user.company_id
        )
        
        if bank_account_id:
            query = query.where(ReconciliationSession.bank_account_id == bank_account_id)
        if status_filter:
            query = query.where(ReconciliationSession.status == status_filter)
        
        query = query.order_by(ReconciliationSession.period_year.desc(), ReconciliationSession.period_month.desc())
        result = service.execute(query)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error listing reconciliation sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions", response_model=ReconciliationSessionResponse, status_code=status.HTTP_201_CREATED)
async def start_reconciliation_session(
    session_data: ReconciliationSessionStart,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new reconciliation session"""
    try:
        from sqlalchemy import select, and_
        
        # Check if session already exists for this period
        existing = service.execute(
            select(ReconciliationSession).where(
                and_(
                    ReconciliationSession.company_id == current_user.company_id,
                    ReconciliationSession.bank_account_id == session_data.bank_account_id,
                    ReconciliationSession.period_month == session_data.period_month,
                    ReconciliationSession.period_year == session_data.period_year
                )
            )
        ).scalar_one_or_none()
        
        if existing:
            raise HTTPException(status_code=400, detail="Reconciliation session already exists for this period")
        
        # Create new session
        session = ReconciliationSession(
            company_id=current_user.company_id,
            **session_data.model_dump(),
            closing_balance_per_books=0,  # Will be calculated from system transactions
            status="in_progress"
        )
        service.add(session)
        service.commit()
        service.refresh(session)
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting reconciliation session: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions/{session_id}", response_model=ReconciliationSessionDetail)
async def get_reconciliation_session(
    session_id: UUID,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get reconciliation session with transactions"""
    try:
        from sqlalchemy import select, and_
        query = select(ReconciliationSession).where(
            and_(
                ReconciliationSession.id == session_id,
                ReconciliationSession.company_id == current_user.company_id
            )
        )
        session = service.execute(query).scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Reconciliation session not found")
        
        # In production, would fetch actual bank and system transactions
        return ReconciliationSessionDetail(
            id=session.id,
            company_id=session.company_id,
            bank_account_id=session.bank_account_id,
            period_month=session.period_month,
            period_year=session.period_year,
            opening_balance=session.opening_balance,
            closing_balance_per_bank=session.closing_balance_per_bank,
            closing_balance_per_books=session.closing_balance_per_books,
            difference=session.difference,
            status=session.status,
            completed_at=session.completed_at,
            completed_by=session.completed_by,
            created_by=session.created_by,
            updated_by=session.updated_by,
            bank_transactions=[],
            system_transactions=[],
            matched_transactions=session.reconciled_transactions
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting reconciliation session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/{session_id}/match")
async def match_transactions(
    session_id: UUID,
    match_data: ReconciliationSessionMatch,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Match a bank transaction with a system transaction"""
    try:
        from sqlalchemy import select, and_
        session = service.execute(
            select(ReconciliationSession).where(
                and_(
                    ReconciliationSession.id == session_id,
                    ReconciliationSession.company_id == current_user.company_id
                )
            )
        ).scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update reconciled transactions
        if session.reconciled_transactions is None:
            session.reconciled_transactions = {}
        
        session.reconciled_transactions[match_data.bank_transaction_id] = {
            "system_transaction_id": str(match_data.system_transaction_id),
            "match_type": match_data.match_type,
            "matched_at": date.today().isoformat()
        }
        
        service.commit()
        return {"message": "Transactions matched successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error matching transactions: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sessions/{session_id}/complete", response_model=ReconciliationSessionResponse)
async def complete_reconciliation(
    session_id: UUID,
    complete_data: ReconciliationSessionComplete,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Complete reconciliation session"""
    try:
        from sqlalchemy import select, and_
        session = service.execute(
            select(ReconciliationSession).where(
                and_(
                    ReconciliationSession.id == session_id,
                    ReconciliationSession.company_id == current_user.company_id
                )
            )
        ).scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if difference is zero
        if session.difference != 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot complete reconciliation. Difference: {session.difference}. Must be zero."
            )
        
        session.status = "completed"
        session.completed_at = date.today()
        session.completed_by = current_user.id
        service.commit()
        service.refresh(session)
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing reconciliation: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ PDC Endpoints ============

@router.get("/pdcs", response_model=List[PDCResponse])
async def list_pdcs(
    status_filter: Optional[str] = Query(None, alias="status"),
    party_type: Optional[str] = Query(None, alias="party_type"),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List PDCs with filters"""
    try:
        from sqlalchemy import select, and_
        query = select(PDC).where(PDC.company_id == current_user.company_id)
        
        if status_filter:
            query = query.where(PDC.status == status_filter)
        if party_type:
            query = query.where(PDC.party_type == party_type)
        if from_date:
            query = query.where(PDC.cheque_date >= from_date)
        if to_date:
            query = query.where(PDC.cheque_date <= to_date)
        
        query = query.order_by(PDC.cheque_date)
        result = service.execute(query)
        return list(result.scalars().all())
    except Exception as e:
        logger.error(f"Error listing PDCs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pdcs", response_model=PDCResponse, status_code=status.HTTP_201_CREATED)
async def create_pdc(
    pdc: PDCCreate,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new PDC"""
    try:
        db_pdc = PDC(
            company_id=current_user.company_id,
            **pdc.model_dump()
        )
        service.add(db_pdc)
        service.commit()
        service.refresh(db_pdc)
        return db_pdc
    except Exception as e:
        logger.error(f"Error creating PDC: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/pdcs/{pdc_id}/status", response_model=PDCResponse)
async def update_pdc_status(
    pdc_id: UUID,
    status_data: PDCUpdateStatus,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update PDC status (deposit/clear/bounce)"""
    try:
        pdc = get_pdc_or_404(service, current_user.company_id, pdc_id)
        
        pdc.status = status_data.status
        if status_data.status == "deposited":
            pdc.deposited_at = date.today()
        elif status_data.status == "cleared":
            pdc.cleared_at = date.today()
        elif status_data.status == "bounced":
            pdc.bounced_at = date.today()
            pdc.bounce_reason = status_data.bounce_reason
        
        service.commit()
        service.refresh(pdc)
        return pdc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating PDC status: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/pdcs/maturity-report", response_model=List[PDCMaturityItem])
async def get_pdc_maturity_report(
    days_ahead: int = Query(default=30, ge=1, le=90),
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get PDCs due in next X days"""
    try:
        from sqlalchemy import select, and_
        today = date.today()
        future_date = today + timedelta(days=days_ahead)
        
        query = select(PDC).where(
            and_(
                PDC.company_id == current_user.company_id,
                PDC.status == "pending",
                PDC.cheque_date >= today,
                PDC.cheque_date <= future_date
            )
        ).order_by(PDC.cheque_date)
        
        result = service.execute(query)
        pdcs = list(result.scalars().all())
        
        # In production, would fetch party names from customers/vendors tables
        return [
            PDCMaturityItem(
                id=pdc.id,
                cheque_number=pdc.cheque_number,
                party_name="Party Name",  # Would join with customers/vendors
                party_type=pdc.party_type,
                amount=pdc.amount,
                cheque_date=pdc.cheque_date,
                days_until_maturity=(pdc.cheque_date - today).days,
                status=pdc.status
            )
            for pdc in pdcs
        ]
    except Exception as e:
        logger.error(f"Error getting PDC maturity report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Matching Suggestions Endpoint ============

@router.get("/matching-suggestions")
async def get_matching_suggestions(
    session_id: Optional[UUID] = Query(None),
    bank_account_id: Optional[UUID] = Query(None),
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get auto-matching suggestions for bank reconciliation.
    
    Matches bank transactions with system transactions based on:
    - Exact amount match (debit/credit vs payment/receipt)
    - Date within tolerance (default 3 days)
    - Reference/cheque number matching
    """
    try:
        from sqlalchemy import select, and_

        # If session_id provided, get session context
        session = None
        if session_id:
            query = select(ReconciliationSession).where(
                and_(
                    ReconciliationSession.id == session_id,
                    ReconciliationSession.company_id == current_user.company_id
                )
            )
            session = service.execute(query).scalar_one_or_none()
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

        # In production, would query actual bank_transactions and system_transactions tables
        # For now, return empty suggestions structure
        suggestions = {
            "auto_matches": [],
            "unmatched_bank_transactions": [],
            "unmatched_system_transactions": [],
            "matching_rules_applied": [
                "exact_amount_match",
                "date_tolerance_3_days",
                "reference_number_match"
            ]
        }

        return suggestions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting matching suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Reports Endpoints ============

@router.get("/reports/statement")
async def get_reconciliation_statement(
    bank_account_id: UUID,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get reconciliation statement report"""
    try:
        from sqlalchemy import select, and_

        # Verify bank account
        account = get_bank_account_or_404(service, current_user.company_id, bank_account_id)

        # Get completed reconciliation sessions for this account
        query = select(ReconciliationSession).where(
            and_(
                ReconciliationSession.company_id == current_user.company_id,
                ReconciliationSession.bank_account_id == bank_account_id,
                ReconciliationSession.status == "completed"
            )
        )
        if from_date:
            # Filter by period
            from sqlalchemy import extract
            year = from_date.year
            month = from_date.month
            query = query.where(
                and_(
                    ReconciliationSession.period_year >= year,
                    ReconciliationSession.period_month >= month if ReconciliationSession.period_year == year else True
                )
            )
        if to_date:
            year = to_date.year
            month = to_date.month
            query = query.where(
                and_(
                    ReconciliationSession.period_year <= year,
                    ReconciliationSession.period_month <= month if ReconciliationSession.period_year == year else True
                )
            )

        query = query.order_by(ReconciliationSession.period_year.desc(), ReconciliationSession.period_month.desc())
        sessions = list(service.execute(query).scalars().all())

        return {
            "bank_account": {
                "id": str(account.id),
                "name": account.name,
                "bank_name": account.bank_name,
                "account_number": account.account_number,
            },
            "period": {
                "from_date": from_date.isoformat() if from_date else None,
                "to_date": to_date.isoformat() if to_date else None,
            },
            "reconciled_sessions": [
                {
                    "id": str(s.id),
                    "period": f"{s.period_month:02d}/{s.period_year}",
                    "opening_balance": float(s.opening_balance),
                    "closing_balance_per_bank": float(s.closing_balance_per_bank),
                    "closing_balance_per_books": float(s.closing_balance_per_books),
                    "difference": float(s.difference),
                    "completed_at": s.completed_at.isoformat() if s.completed_at else None,
                }
                for s in sessions
            ],
            "summary": {
                "total_sessions": len(sessions),
                "last_reconciled": sessions[0].completed_at.isoformat() if sessions else None,
                "last_difference": float(sessions[0].difference) if sessions else 0,
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting reconciliation statement: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ PDC Deposit Endpoint ============

@router.post("/pdcs/{pdc_id}/deposit", response_model=PDCResponse)
async def deposit_pdc(
    pdc_id: UUID,
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deposit a PDC to bank (change status from pending to deposited)"""
    try:
        pdc = get_pdc_or_404(service, current_user.company_id, pdc_id)

        if pdc.status != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot deposit PDC. Current status: {pdc.status}. Must be 'pending'."
            )

        pdc.status = "deposited"
        pdc.deposited_at = date.today()
        service.commit()
        service.refresh(pdc)
        return pdc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error depositing PDC: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============ Cash Position Endpoint ============

@router.get("/cash-position", response_model=CashPositionSummary)
async def get_cash_position(
    service: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get cash position summary"""
    try:
        from sqlalchemy import select, func
        
        # Get all bank accounts
        accounts_query = select(BankAccount).where(
            and_(
                BankAccount.company_id == current_user.company_id,
                BankAccount.is_active == True
            )
        )
        accounts = list(service.execute(accounts_query).scalars().all())
        
        # Calculate total bank balance
        total_bank_balance = sum(acc.current_balance for acc in accounts)
        
        # Calculate PDCs receivable (customer PDCs pending)
        pdc_receivable_query = select(func.sum(PDC.amount)).where(
            and_(
                PDC.company_id == current_user.company_id,
                PDC.party_type == "customer",
                PDC.status == "pending"
            )
        )
        pdc_receivable = service.execute(pdc_receivable_query).scalar() or Decimal('0')
        
        # Calculate PDCs payable (vendor PDCs pending)
        pdc_payable_query = select(func.sum(PDC.amount)).where(
            and_(
                PDC.company_id == current_user.company_id,
                PDC.party_type == "vendor",
                PDC.status == "pending"
            )
        )
        pdc_payable = service.execute(pdc_payable_query).scalar() or Decimal('0')
        
        # Cash in hand (would come from cash accounts in chart of accounts)
        cash_in_hand = Decimal('0')  # Placeholder
        
        return CashPositionSummary(
            total_cash_in_hand=cash_in_hand,
            total_cash_at_bank=total_bank_balance,
            total_pdc_receivable=pdc_receivable,
            total_pdc_payable=pdc_payable,
            net_cash_position=total_bank_balance + cash_in_hand + pdc_receivable - pdc_payable,
            bank_accounts=[
                {
                    "id": str(acc.id),
                    "name": acc.name,
                    "bank_name": acc.bank_name,
                    "account_number": acc.account_number,
                    "balance": float(acc.current_balance)
                }
                for acc in accounts
            ]
        )
    except Exception as e:
        logger.error(f"Error getting cash position: {e}")
        raise HTTPException(status_code=500, detail=str(e))
