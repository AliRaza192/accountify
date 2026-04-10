import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from decimal import Decimal
from uuid import uuid4
from datetime import date, timedelta, datetime
import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_SERVICE_KEY'] = 'test-key'
os.environ['SUPABASE_JWT_SECRET'] = 'test-jwt-secret'
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost/test'
os.environ['GEMINI_API_KEY'] = 'test-key'
os.environ['SECRET_KEY'] = 'test-secret'

from app.main import app
from app.types import User

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _bank_account_dict(account_id=None):
    aid = str(account_id) if account_id else str(uuid4())
    cid = str(uuid4())
    return {
        "id": aid,
        "name": "HBL Current Account",
        "bank_name": "HBL",
        "account_number": "PK36HABB0012345678",
        "account_type": "current",
        "company_id": cid,
        "current_balance": Decimal("144500.00"),
        "is_active": True,
    }


def _pdc_dict(pdc_id=None):
    pid = str(pdc_id) if pdc_id else str(uuid4())
    return {
        "id": pid,
        "cheque_number": "CHQ-PDC-001",
        "party_id": str(uuid4()),
        "party_type": "customer",
        "amount": Decimal("50000.00"),
        "cheque_date": date(2025, 4, 15),
        "status": "pending",
        "company_id": str(uuid4()),
    }


def _reconciliation_session_dict(session_id=None):
    sid = str(session_id) if session_id else str(uuid4())
    return {
        "id": sid,
        "bank_account_id": str(uuid4()),
        "period_month": 3,
        "period_year": 2025,
        "opening_balance": Decimal("100000.00"),
        "closing_balance_per_bank": Decimal("144500.00"),
        "closing_balance_per_books": Decimal("144500.00"),
        "difference": Decimal("0.00"),
        "status": "in_progress",
        "company_id": str(uuid4()),
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-token"}


@pytest.fixture
def mock_current_user():
    return User(
        id=str(uuid4()),
        email="finance@example.com",
        full_name="Finance Manager",
        role="admin",
        company_id=str(uuid4()),
        company_name="Test Company",
    )


@pytest.fixture
def override_bank_deps(mock_current_user):
    """Override get_current_user for bank_reconciliation router.
    
    All DB-level operations are mocked at the service/ORM level.
    """
    from app.routers import bank_reconciliation

    async def mock_get_current_user():
        return mock_current_user

    app.dependency_overrides[bank_reconciliation.get_current_user] = mock_get_current_user

    yield mock_current_user

    app.dependency_overrides.clear()


# ===================================================================
# Bank Statement Import
# ===================================================================

class TestBankStatementImport:
    """Test bank statement import endpoints"""

    def test_import_bank_statement_csv_success(self, override_bank_deps, auth_headers):
        """Test importing a bank statement from CSV file"""
        from app.routers import bank_reconciliation
        from app.models.bank_reconciliation import BankStatement

        account_id = uuid4()
        statement_id = uuid4()

        # Mock bank account lookup
        mock_account = MagicMock()
        mock_account.id = account_id
        mock_account.company_id = uuid4()
        mock_account.name = "HBL Current"
        mock_account.bank_name = "HBL"
        mock_account.account_number = "PK36HABB0012345678"
        mock_account.current_balance = Decimal("144500.00")
        mock_account.is_active = True

        # Mock statement creation
        mock_statement = MagicMock()
        mock_statement.id = statement_id
        mock_statement.bank_account_id = account_id
        mock_statement.statement_date = date(2025, 3, 31)
        mock_statement.opening_balance = Decimal("100000.00")
        mock_statement.closing_balance = Decimal("144500.00")
        mock_statement.imported_at = date(2025, 4, 1)
        mock_statement.imported_by = uuid4()

        def mock_execute(query):
            result = MagicMock()
            result.scalar_one_or_none.return_value = mock_account
            result.scalars.return_value.all.return_value = [mock_statement]
            return result

        mock_session = MagicMock()
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()

        def mock_refresh(obj):
            obj.id = statement_id
            obj.bank_account_id = account_id
            obj.statement_date = date(2025, 3, 31)
            obj.opening_balance = Decimal("100000.00")
            obj.closing_balance = Decimal("144500.00")
            obj.imported_at = date(2025, 4, 1)
            obj.imported_by = uuid4()

        mock_session.refresh = mock_refresh

        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        csv_bytes = "date,description,debit,credit,balance,cheque_number\n2025-03-01,NEFT received,0,50000,150000,\n".encode()

        response = client.post(
            "/api/bank-reconciliation/import-statement",
            files={"file": ("statement.csv", csv_bytes, "text/csv")},
            params={
                "bank_account_id": str(account_id),
                "statement_date": "2025-03-31",
                "opening_balance": "100000.00",
                "closing_balance": "144500.00",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["transactions_count"] == 1

    def test_import_bank_statement_missing_account(self, override_bank_deps, auth_headers):
        """Test importing statement for non-existent bank account returns 404"""
        from app.routers import bank_reconciliation

        mock_session = MagicMock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = None
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        csv_bytes = "date,description,debit,credit\n2025-03-01,test,0,50000\n".encode()
        response = client.post(
            "/api/bank-reconciliation/import-statement",
            files={"file": ("statement.csv", csv_bytes, "text/csv")},
            params={
                "bank_account_id": str(uuid4()),
                "statement_date": "2025-03-31",
                "opening_balance": "0",
                "closing_balance": "50000",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# Auto-Matching
# ===================================================================

class TestAutoMatching:
    """Test auto-matching suggestions for bank reconciliation"""

    def test_get_matching_suggestions(self, override_bank_deps, auth_headers):
        """Test getting auto-matching suggestions"""
        from app.routers import bank_reconciliation

        mock_session = MagicMock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = None
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.get("/api/bank-reconciliation/matching-suggestions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "auto_matches" in data
        assert "matching_rules_applied" in data
        assert "exact_amount_match" in data["matching_rules_applied"]

    def test_match_transactions(self, override_bank_deps, auth_headers):
        """Test matching a bank transaction with a system transaction"""
        from app.routers import bank_reconciliation

        session_id = uuid4()
        session_obj = MagicMock()
        session_obj.id = session_id
        session_obj.company_id = "test-company-id"
        session_obj.reconciled_transactions = {}

        mock_session = MagicMock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = session_obj
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.post(
            f"/api/bank-reconciliation/sessions/{session_id}/match",
            json={
                "bank_transaction_id": "bnk-txn-001",
                "system_transaction_id": str(uuid4()),
                "match_type": "manual",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert "matched successfully" in response.json()["message"].lower()

    def test_match_transactions_session_not_found(self, override_bank_deps, auth_headers):
        """Test matching transactions for non-existent session returns 404"""
        from app.routers import bank_reconciliation

        mock_session = MagicMock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = None
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.post(
            f"/api/bank-reconciliation/sessions/{uuid4()}/match",
            json={
                "bank_transaction_id": "bnk-001",
                "system_transaction_id": str(uuid4()),
                "match_type": "manual",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404


# ===================================================================
# PDC Management
# ===================================================================

class TestPDCManagement:
    """Test PDC (Post-Dated Cheque) management endpoints"""

    def test_create_pdc_customer(self, override_bank_deps, auth_headers):
        """Test creating a customer PDC (receivable)"""
        from app.routers import bank_reconciliation

        pdc_id = uuid4()
        mock_pdc = MagicMock()
        mock_pdc.id = pdc_id
        mock_pdc.cheque_number = "CHQ-PDC-001"
        mock_pdc.bank_name = "HBL"
        mock_pdc.party_id = uuid4()
        mock_pdc.party_type = "customer"
        mock_pdc.amount = Decimal("50000.00")
        mock_pdc.cheque_date = date(2025, 4, 15)
        mock_pdc.status = "pending"
        mock_pdc.company_id = str(uuid4())
        mock_pdc.deposited_at = None
        mock_pdc.cleared_at = None
        mock_pdc.bounced_at = None
        mock_pdc.bounce_reason = None
        mock_pdc.payment_id = None
        mock_pdc.created_at = date(2025, 3, 1)
        mock_pdc.updated_at = date(2025, 3, 1)

        def mock_execute(query):
            result = MagicMock()
            result.scalars.return_value.all.return_value = [mock_pdc]
            return result

        mock_session = MagicMock()
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()

        def mock_refresh(obj):
            obj.id = pdc_id
            obj.cheque_number = "CHQ-PDC-001"
            obj.bank_name = "HBL"
            obj.party_type = "customer"
            obj.amount = Decimal("50000.00")
            obj.cheque_date = date(2025, 4, 15)
            obj.status = "pending"
            obj.deposited_at = None
            obj.cleared_at = None
            obj.bounced_at = None
            obj.bounce_reason = None
            obj.payment_id = None
            obj.created_at = date(2025, 3, 1)
            obj.updated_at = date(2025, 3, 1)

        mock_session.refresh = mock_refresh
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        party_id = uuid4()
        response = client.post(
            "/api/bank-reconciliation/pdcs",
            json={
                "cheque_number": "CHQ-PDC-001",
                "bank_name": "HBL",
                "party_id": str(party_id),
                "party_type": "customer",
                "amount": "50000.00",
                "cheque_date": "2025-04-15",
                },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["party_type"] == "customer"
        assert data["status"] == "pending"

    def test_create_pdc_vendor(self, override_bank_deps, auth_headers):
        """Test creating a vendor PDC (payable)"""
        from app.routers import bank_reconciliation

        pdc_id = uuid4()
        mock_pdc = MagicMock()
        mock_pdc.id = pdc_id
        mock_pdc.cheque_number = "CHQ-VND-001"
        mock_pdc.bank_name = "Meezan Bank"
        mock_pdc.party_type = "vendor"
        mock_pdc.party_id = uuid4()
        mock_pdc.amount = Decimal("75000.00")
        mock_pdc.cheque_date = date(2025, 5, 1)
        mock_pdc.status = "pending"
        mock_pdc.deposited_at = None
        mock_pdc.cleared_at = None
        mock_pdc.bounced_at = None
        mock_pdc.bounce_reason = None
        mock_pdc.payment_id = None
        mock_pdc.created_at = date(2025, 3, 1)
        mock_pdc.updated_at = date(2025, 3, 1)

        mock_session = MagicMock()
        mock_session.execute.return_value.scalars.return_value.all.return_value = [mock_pdc]
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()

        def mock_refresh(obj):
            obj.id = pdc_id
            obj.cheque_number = "CHQ-VND-001"
            obj.bank_name = "Meezan Bank"
            obj.party_type = "vendor"
            obj.party_id = uuid4()
            obj.amount = Decimal("75000.00")
            obj.cheque_date = date(2025, 5, 1)
            obj.status = "pending"
            obj.deposited_at = None
            obj.cleared_at = None
            obj.bounced_at = None
            obj.bounce_reason = None
            obj.payment_id = None
            obj.created_at = date(2025, 3, 1)
            obj.updated_at = date(2025, 3, 1)

        mock_session.refresh = mock_refresh
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.post(
            "/api/bank-reconciliation/pdcs",
            json={
                "cheque_number": "CHQ-VND-001",
                "bank_name": "Meezan Bank",
                "party_id": str(uuid4()),
                "party_type": "vendor",
                "amount": "75000.00",
                "cheque_date": "2025-05-01",
                },
            headers=auth_headers,
        )
        assert response.status_code == 201
        assert response.json()["party_type"] == "vendor"

    def test_list_pdcs(self, override_bank_deps, auth_headers):
        """Test listing PDCs"""
        from app.routers import bank_reconciliation

        mock_pdc = MagicMock()
        mock_pdc.id = uuid4()
        mock_pdc.cheque_number = "CHQ-001"
        mock_pdc.bank_name = "HBL"
        mock_pdc.party_type = "customer"
        mock_pdc.party_id = uuid4()
        mock_pdc.amount = Decimal("50000.00")
        mock_pdc.cheque_date = date(2025, 4, 15)
        mock_pdc.status = "pending"
        mock_pdc.deposited_at = None
        mock_pdc.cleared_at = None
        mock_pdc.bounced_at = None
        mock_pdc.bounce_reason = None
        mock_pdc.payment_id = None
        mock_pdc.company_id = str(uuid4())
        mock_pdc.created_at = date(2025, 3, 1)
        mock_pdc.updated_at = date(2025, 3, 1)

        mock_session = MagicMock()
        mock_session.execute.return_value.scalars.return_value.all.return_value = [mock_pdc]
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.get("/api/bank-reconciliation/pdcs", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_list_pdcs_filtered_by_status(self, override_bank_deps, auth_headers):
        """Test listing PDCs filtered by status"""
        from app.routers import bank_reconciliation

        mock_session = MagicMock()
        mock_session.execute.return_value.scalars.return_value.all.return_value = []
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.get("/api/bank-reconciliation/pdcs?status=pending", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_deposit_pdc(self, override_bank_deps, auth_headers):
        """Test depositing a pending PDC to bank"""
        from app.routers import bank_reconciliation

        pdc_id = uuid4()
        mock_pdc = MagicMock()
        mock_pdc.id = pdc_id
        mock_pdc.company_id = str(uuid4())
        mock_pdc.status = "pending"
        mock_pdc.deposited_at = None
        mock_pdc.cleared_at = None
        mock_pdc.bounced_at = None
        mock_pdc.bounce_reason = None
        mock_pdc.cheque_number = "CHQ-001"
        mock_pdc.bank_name = "HBL"
        mock_pdc.party_type = "customer"
        mock_pdc.party_id = uuid4()
        mock_pdc.amount = Decimal("50000.00")
        mock_pdc.cheque_date = date(2025, 4, 15)
        mock_pdc.payment_id = None
        mock_pdc.created_at = date(2025, 3, 1)
        mock_pdc.updated_at = date(2025, 3, 1)

        def mock_execute(query):
            result = MagicMock()
            result.scalar_one_or_none.return_value = mock_pdc
            result.scalars.return_value.all.return_value = [mock_pdc]
            return result

        mock_session = MagicMock()
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.post(f"/api/bank-reconciliation/pdcs/{pdc_id}/deposit", headers=auth_headers)
        assert response.status_code == 200
        assert mock_pdc.status == "deposited"

    def test_deposit_pdc_already_deposited(self, override_bank_deps, auth_headers):
        """Test depositing an already-deposited PDC returns 400"""
        from app.routers import bank_reconciliation

        pdc_id = uuid4()
        mock_pdc = MagicMock()
        mock_pdc.id = pdc_id
        mock_pdc.company_id = str(uuid4())
        mock_pdc.status = "deposited"

        def mock_execute(query):
            result = MagicMock()
            result.scalar_one_or_none.return_value = mock_pdc
            return result

        mock_session = MagicMock()
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.post(f"/api/bank-reconciliation/pdcs/{pdc_id}/deposit", headers=auth_headers)
        assert response.status_code == 400
        assert "Cannot deposit" in response.json()["detail"]

    def test_update_pdc_status_cleared(self, override_bank_deps, auth_headers):
        """Test updating PDC status to cleared"""
        from app.routers import bank_reconciliation

        pdc_id = uuid4()
        mock_pdc = MagicMock()
        mock_pdc.id = pdc_id
        mock_pdc.company_id = str(uuid4())
        mock_pdc.status = "deposited"
        mock_pdc.deposited_at = None
        mock_pdc.cleared_at = None
        mock_pdc.bounced_at = None
        mock_pdc.bounce_reason = None
        mock_pdc.cheque_number = "CHQ-001"
        mock_pdc.bank_name = "HBL"
        mock_pdc.party_type = "customer"
        mock_pdc.party_id = uuid4()
        mock_pdc.amount = Decimal("50000.00")
        mock_pdc.cheque_date = date(2025, 4, 15)
        mock_pdc.payment_id = None
        mock_pdc.created_at = date(2025, 3, 1)
        mock_pdc.updated_at = date(2025, 3, 1)

        def mock_execute(query):
            result = MagicMock()
            result.scalar_one_or_none.return_value = mock_pdc
            return result

        mock_session = MagicMock()
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.put(
            f"/api/bank-reconciliation/pdcs/{pdc_id}/status",
            json={"status": "cleared"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert mock_pdc.status == "cleared"

    def test_update_pdc_status_bounced(self, override_bank_deps, auth_headers):
        """Test updating PDC status to bounced with reason"""
        from app.routers import bank_reconciliation

        pdc_id = uuid4()
        mock_pdc = MagicMock()
        mock_pdc.id = pdc_id
        mock_pdc.company_id = str(uuid4())
        mock_pdc.status = "deposited"
        mock_pdc.deposited_at = None
        mock_pdc.cleared_at = None
        mock_pdc.bounced_at = None
        mock_pdc.bounce_reason = None
        mock_pdc.cheque_number = "CHQ-001"
        mock_pdc.bank_name = "HBL"
        mock_pdc.party_type = "vendor"
        mock_pdc.party_id = uuid4()
        mock_pdc.amount = Decimal("30000.00")
        mock_pdc.cheque_date = date(2025, 4, 15)
        mock_pdc.payment_id = None
        mock_pdc.created_at = date(2025, 3, 1)
        mock_pdc.updated_at = date(2025, 3, 1)

        def mock_execute(query):
            result = MagicMock()
            result.scalar_one_or_none.return_value = mock_pdc
            return result

        mock_session = MagicMock()
        mock_session.execute = mock_execute
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.put(
            f"/api/bank-reconciliation/pdcs/{pdc_id}/status",
            json={"status": "bounced", "bounce_reason": "Insufficient funds"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert mock_pdc.status == "bounced"
        assert mock_pdc.bounce_reason == "Insufficient funds"

    def test_pdc_maturity_report(self, override_bank_deps, auth_headers):
        """Test PDC maturity report shows upcoming due cheques"""
        from app.routers import bank_reconciliation
        from datetime import timedelta

        pdc_id = uuid4()
        mock_pdc = MagicMock()
        mock_pdc.id = pdc_id
        mock_pdc.cheque_number = "CHQ-MAT-001"
        mock_pdc.bank_name = "HBL"
        mock_pdc.party_type = "customer"
        mock_pdc.party_id = uuid4()
        mock_pdc.amount = Decimal("25000.00")
        mock_pdc.cheque_date = date.today() + timedelta(days=10)
        mock_pdc.status = "pending"
        mock_pdc.company_id = str(uuid4())
        mock_pdc.deposited_at = None
        mock_pdc.cleared_at = None
        mock_pdc.bounced_at = None
        mock_pdc.bounce_reason = None
        mock_pdc.payment_id = None
        mock_pdc.created_at = date(2025, 3, 1)
        mock_pdc.updated_at = date(2025, 3, 1)

        mock_session = MagicMock()
        mock_session.execute.return_value.scalars.return_value.all.return_value = [mock_pdc]
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.get("/api/bank-reconciliation/pdcs/maturity-report?days_ahead=30", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["days_until_maturity"] <= 30


# ===================================================================
# Reconciliation Sessions
# ===================================================================

class TestReconciliation:
    """Test reconciliation session endpoints"""

    def test_list_reconciliation_sessions(self, override_bank_deps, auth_headers):
        """Test listing reconciliation sessions"""
        from app.routers import bank_reconciliation

        mock_session_obj = MagicMock()
        mock_session_obj.id = uuid4()
        mock_session_obj.company_id = str(uuid4())
        mock_session_obj.created_by = uuid4()
        mock_session_obj.updated_by = None
        mock_session_obj.bank_account_id = uuid4()
        mock_session_obj.period_month = 3
        mock_session_obj.period_year = 2025
        mock_session_obj.opening_balance = Decimal("100000.00")
        mock_session_obj.closing_balance_per_bank = Decimal("144500.00")
        mock_session_obj.closing_balance_per_books = Decimal("144500.00")
        mock_session_obj.difference = Decimal("0.00")
        mock_session_obj.status = "completed"
        mock_session_obj.completed_at = date(2025, 3, 31)
        mock_session_obj.completed_by = uuid4()

        mock_session = MagicMock()
        mock_session.execute.return_value.scalars.return_value.all.return_value = [mock_session_obj]
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.get("/api/bank-reconciliation/sessions", headers=auth_headers)
        assert response.status_code == 200

    def test_start_reconciliation_session(self, override_bank_deps, auth_headers):
        """Test starting a new reconciliation session"""
        from app.routers import bank_reconciliation

        session_id = uuid4()
        mock_session_obj = MagicMock()
        mock_session_obj.id = session_id
        mock_session_obj.bank_account_id = uuid4()
        mock_session_obj.period_month = 3
        mock_session_obj.period_year = 2025
        mock_session_obj.opening_balance = Decimal("100000.00")
        mock_session_obj.closing_balance_per_bank = Decimal("144500.00")
        mock_session_obj.closing_balance_per_books = Decimal("144500.00")
        mock_session_obj.difference = Decimal("0.00")
        mock_session_obj.status = "in_progress"
        mock_session_obj.completed_at = None
        mock_session_obj.completed_by = None
        mock_session_obj.reconciled_transactions = {}
        mock_session_obj.company_id = str(uuid4())
        mock_session_obj.created_by = uuid4()
        mock_session_obj.updated_by = None
        mock_session_obj.created_at = datetime(2025, 3, 1, 0, 0, 0)
        mock_session_obj.updated_at = datetime(2025, 3, 1, 0, 0, 0)

        mock_session = MagicMock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = None
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()

        def mock_refresh(obj):
            obj.id = session_id
            obj.status = "in_progress"
            obj.bank_account_id = uuid4()
            obj.period_month = 3
            obj.period_year = 2025
            obj.opening_balance = Decimal("100000.00")
            obj.closing_balance_per_bank = Decimal("144500.00")
            obj.closing_balance_per_books = Decimal("144500.00")
            obj.difference = Decimal("0.00")
            obj.completed_at = None
            obj.completed_by = None
            obj.reconciled_transactions = {}
            obj.company_id = str(uuid4())
            obj.created_by = uuid4()
            obj.updated_by = None
            obj.created_at = datetime(2025, 3, 1, 0, 0, 0)
            obj.updated_at = datetime(2025, 3, 1, 0, 0, 0)

        mock_session.refresh = mock_refresh
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.post(
            "/api/bank-reconciliation/sessions",
            json={
                "bank_account_id": str(uuid4()),
                "period_month": 3,
                "period_year": 2025,
                "opening_balance": "100000.00",
                "closing_balance_per_bank": "144500.00",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201

    def test_start_duplicate_session_blocked(self, override_bank_deps, auth_headers):
        """Test starting a session for an already-reconciled period returns 400"""
        from app.routers import bank_reconciliation

        mock_session = MagicMock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = MagicMock(id="existing")
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.post(
            "/api/bank-reconciliation/sessions",
            json={
                "bank_account_id": str(uuid4()),
                "period_month": 3,
                "period_year": 2025,
                "opening_balance": "100000.00",
                "closing_balance_per_bank": "144500.00",
            },
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_complete_reconciliation_success(self, override_bank_deps, auth_headers):
        """Test completing reconciliation when difference is zero"""
        from app.routers import bank_reconciliation

        session_id = uuid4()
        mock_session_obj = MagicMock()
        mock_session_obj.id = session_id
        mock_session_obj.company_id = str(uuid4())
        mock_session_obj.created_by = uuid4()
        mock_session_obj.updated_by = None
        mock_session_obj.bank_account_id = uuid4()
        mock_session_obj.period_month = 3
        mock_session_obj.period_year = 2025
        mock_session_obj.opening_balance = Decimal("100000.00")
        mock_session_obj.closing_balance_per_bank = Decimal("144500.00")
        mock_session_obj.closing_balance_per_books = Decimal("144500.00")
        mock_session_obj.difference = Decimal("0.00")
        mock_session_obj.status = "in_progress"
        mock_session_obj.completed_at = None
        mock_session_obj.completed_by = None

        mock_session = MagicMock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_session_obj
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()

        def mock_refresh(obj):
            obj.id = session_id
            obj.status = "completed"
            obj.company_id = str(uuid4())
            obj.created_by = uuid4()
            obj.updated_by = None
            obj.bank_account_id = uuid4()
            obj.period_month = 3
            obj.period_year = 2025
            obj.opening_balance = Decimal("100000.00")
            obj.closing_balance_per_bank = Decimal("144500.00")
            obj.closing_balance_per_books = Decimal("144500.00")
            obj.difference = Decimal("0.00")
            obj.completed_at = date.today()
            obj.completed_by = uuid4()

        mock_session.refresh = mock_refresh
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.post(
            f"/api/bank-reconciliation/sessions/{session_id}/complete",
            json={"closing_balance_per_books": "144500.00"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert mock_session_obj.status == "completed"

    def test_complete_reconciliation_with_difference_fails(self, override_bank_deps, auth_headers):
        """Test completing reconciliation with non-zero difference returns 400"""
        from app.routers import bank_reconciliation

        session_id = uuid4()
        mock_session_obj = MagicMock()
        mock_session_obj.id = session_id
        mock_session_obj.company_id = str(uuid4())
        mock_session_obj.difference = Decimal("5000.00")

        mock_session = MagicMock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_session_obj
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.post(
            f"/api/bank-reconciliation/sessions/{session_id}/complete",
            json={"closing_balance_per_books": "149500.00"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "Cannot complete" in response.json()["detail"]

    def test_get_reconciliation_session(self, override_bank_deps, auth_headers):
        """Test fetching a reconciliation session detail"""
        from app.routers import bank_reconciliation

        session_id = uuid4()
        mock_session_obj = MagicMock()
        mock_session_obj.id = session_id
        mock_session_obj.company_id = str(uuid4())
        mock_session_obj.created_by = uuid4()
        mock_session_obj.updated_by = None
        mock_session_obj.created_at = datetime(2025, 3, 1, 0, 0, 0)
        mock_session_obj.updated_at = datetime(2025, 3, 1, 0, 0, 0)
        mock_session_obj.bank_account_id = uuid4()
        mock_session_obj.period_month = 3
        mock_session_obj.period_year = 2025
        mock_session_obj.opening_balance = Decimal("100000.00")
        mock_session_obj.closing_balance_per_bank = Decimal("144500.00")
        mock_session_obj.closing_balance_per_books = Decimal("144500.00")
        mock_session_obj.difference = Decimal("0.00")
        mock_session_obj.status = "in_progress"
        mock_session_obj.completed_at = None
        mock_session_obj.completed_by = None
        mock_session_obj.reconciled_transactions = {}

        mock_session = MagicMock()
        mock_session.execute.return_value.scalar_one_or_none.return_value = mock_session_obj
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.get(f"/api/bank-reconciliation/sessions/{session_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(session_id)
        assert data["status"] == "in_progress"


# ===================================================================
# Bank Accounts
# ===================================================================

class TestBankAccounts:
    """Test bank account CRUD"""

    def test_list_bank_accounts(self, override_bank_deps, auth_headers):
        """Test listing active bank accounts"""
        from app.routers import bank_reconciliation

        cid = str(uuid4())
        mock_acc = MagicMock()
        mock_acc.id = uuid4()
        mock_acc.name = "HBL Current"
        mock_acc.bank_name = "HBL"
        mock_acc.account_number = "PK36HABB0012345678"
        mock_acc.branch = "Karachi Main"
        mock_acc.iban = "PK36HABB0012345678901234"
        mock_acc.currency = "PKR"
        mock_acc.current_balance = Decimal("144500.00")
        mock_acc.opening_balance = Decimal("100000.00")
        mock_acc.is_active = True
        mock_acc.company_id = cid
        mock_acc.created_by = uuid4()
        mock_acc.updated_by = None
        mock_acc.created_at = datetime(2025, 1, 1, 0, 0, 0)
        mock_acc.updated_at = datetime(2025, 1, 1, 0, 0, 0)

        mock_session = MagicMock()
        mock_session.execute.return_value.scalars.return_value.all.return_value = [mock_acc]
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()
        mock_session.refresh = MagicMock()
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.get("/api/bank-reconciliation/accounts", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_create_bank_account(self, override_bank_deps, auth_headers):
        """Test creating a new bank account"""
        from app.routers import bank_reconciliation

        account_id = uuid4()
        mock_acc = MagicMock()
        mock_acc.id = account_id
        mock_acc.name = "Meezan Savings"
        mock_acc.bank_name = "Meezan Bank"
        mock_acc.account_number = "PK12MEZN0098765432"
        mock_acc.branch = None
        mock_acc.iban = None
        mock_acc.currency = "PKR"
        mock_acc.current_balance = Decimal("0.00")
        mock_acc.opening_balance = Decimal("0.00")
        mock_acc.is_active = True
        mock_acc.company_id = str(uuid4())
        mock_acc.created_by = uuid4()
        mock_acc.updated_by = None
        mock_acc.created_at = datetime(2025, 1, 1, 0, 0, 0)
        mock_acc.updated_at = datetime(2025, 1, 1, 0, 0, 0)

        mock_session = MagicMock()
        mock_session.execute.return_value.scalars.return_value.all.return_value = [mock_acc]
        mock_session.add = MagicMock()
        mock_session.commit = MagicMock()

        def mock_refresh(obj):
            obj.id = account_id
            obj.name = "Meezan Savings"
            obj.bank_name = "Meezan Bank"
            obj.account_number = "PK12MEZN0098765432"
            obj.branch = None
            obj.iban = None
            obj.currency = "PKR"
            obj.current_balance = Decimal("0.00")
            obj.opening_balance = Decimal("0.00")
            obj.is_active = True
            obj.company_id = str(uuid4())
            obj.created_by = uuid4()
            obj.updated_by = None
            obj.created_at = datetime(2025, 1, 1, 0, 0, 0)
            obj.updated_at = datetime(2025, 1, 1, 0, 0, 0)

        mock_session.refresh = mock_refresh
        app.dependency_overrides[bank_reconciliation.get_db] = lambda: mock_session

        response = client.post(
            "/api/bank-reconciliation/accounts",
            json={
                "name": "Meezan Savings",
                "bank_name": "Meezan Bank",
                "account_number": "PK12MEZN0098765432",
                "opening_balance": "0.00",
                "current_balance": "0.00",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
