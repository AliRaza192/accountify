import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from decimal import Decimal
from uuid import uuid4
import sys
import os

# Add backend app to path
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

def _employee_payload(**overrides):
    """Return a minimal EmployeeCreate payload."""
    base = {
        "full_name": "Ali Khan",
        "email": "ali.khan@example.com",
        "phone": "+92-300-1234567",
        "cnic": "42101-1234567-1",
        "designation": "Software Engineer",
        "department": "Engineering",
        "join_date": "2025-01-15T00:00:00Z",
        "employee_type": "permanent",
        "basic_salary": "80000.00",
        "house_rent_allowance": "32000.00",
        "medical_allowance": "8000.00",
        "other_allowance": "5000.00",
        "eobi_rate": "1",
        "tax_rate": "5",
        "bank_name": "HBL",
        "bank_account_number": "PK36HABB0012345678",
    }
    base.update(overrides)
    return base


def _employee_response(employee_id=None):
    """Return a mock employee DB response."""
    eid = str(employee_id) if employee_id else str(uuid4())
    cid = str(uuid4())
    return {
        "id": eid,
        "full_name": "Ali Khan",
        "email": "ali.khan@example.com",
        "phone": "+92-300-1234567",
        "cnic": "42101-1234567-1",
        "designation": "Software Engineer",
        "department": "Engineering",
        "join_date": "2025-01-15T00:00:00Z",
        "employee_type": "permanent",
        "basic_salary": "80000.00",
        "house_rent_allowance": "32000.00",
        "medical_allowance": "8000.00",
        "other_allowance": "5000.00",
        "eobi_rate": "1",
        "tax_rate": "5",
        "bank_name": "HBL",
        "bank_account_number": "PK36HABB0012345678",
        "company_id": cid,
        "is_active": True,
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z",
    }


def _salary_slip_response(slip_id=None, employee_id=None):
    """Return a mock salary slip DB response."""
    sid = str(slip_id) if slip_id else str(uuid4())
    eid = str(employee_id) if employee_id else str(uuid4())
    cid = str(uuid4())
    return {
        "id": sid,
        "employee_id": eid,
        "employees": {"full_name": "Ali Khan"},
        "month": 3,
        "year": 2025,
        "basic_salary": "80000.00",
        "house_rent_allowance": "32000.00",
        "medical_allowance": "8000.00",
        "other_allowance": "5000.00",
        "gross_salary": "125000.00",
        "eobi_deduction": "800.00",
        "tax_deduction": "6250.00",
        "other_deductions": "0",
        "total_deductions": "7050.00",
        "net_salary": "117950.00",
        "payment_date": None,
        "payment_method": None,
        "is_paid": False,
        "company_id": cid,
        "created_at": "2025-03-31T10:00:00Z",
    }


def _payroll_run_response(run_id=None):
    """Return a mock payroll run DB response."""
    rid = str(run_id) if run_id else str(uuid4())
    cid = str(uuid4())
    uid = str(uuid4())
    return {
        "id": rid,
        "month": 3,
        "year": 2025,
        "total_employees": 2,
        "total_amount": "235900.00",
        "status": "processed",
        "company_id": cid,
        "created_at": "2025-03-31T10:00:00Z",
        "created_by": uid,
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
        id="test-user-id",
        email="hr@example.com",
        full_name="HR Manager",
        role="admin",
        company_id="test-company-id",
        company_name="Test Company",
    )


@pytest.fixture
def override_payroll_deps(mock_current_user, mock_supabase):
    from app.routers import payroll
    from unittest.mock import patch

    async def mock_get_current_user():
        return mock_current_user

    app.dependency_overrides[payroll.get_current_user] = mock_get_current_user

    with patch.object(payroll, 'supabase', mock_supabase):
        yield mock_current_user

    app.dependency_overrides.clear()


# ===================================================================
# Employee CRUD
# ===================================================================

class TestCreateEmployee:
    """Test POST /api/employees - Create employee"""

    def test_create_employee_success(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test creating an employee with valid data"""
        # Duplicate CNIC check returns empty
        mock_check = MagicMock()
        mock_check.select.return_value = mock_check
        mock_check.eq.return_value = mock_check
        mock_check.execute.return_value = MagicMock(data=[])

        # Insert returns created employee
        emp_resp = _employee_response()
        mock_insert = MagicMock()
        mock_insert.insert.return_value = mock_insert
        mock_insert.execute.return_value = MagicMock(data=[emp_resp])

        mock_supabase.table.side_effect = [mock_check, mock_insert]

        response = client.post("/api/payroll/employees", json=_employee_payload(), headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Ali Khan"
        assert data["email"] == "ali.khan@example.com"

    def test_create_employee_duplicate_cnic(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test creating employee with duplicate CNIC returns 400"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[{"id": "existing-emp"}])
        mock_supabase.table.return_value = mock_query

        response = client.post("/api/payroll/employees", json=_employee_payload(), headers=auth_headers)

        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_create_employee_no_company(self, auth_headers, mock_supabase):
        """Test creating employee when user has no company"""
        from app.routers import payroll
        from app.types import User

        async def mock_get_user_no_company():
            return User(id="u1", email="a@b.com", full_name="A", company_id=None, company_name=None)

        app.dependency_overrides[payroll.get_current_user] = mock_get_user_no_company

        response = client.post("/api/payroll/employees", json=_employee_payload(), headers=auth_headers)
        assert response.status_code == 400

        app.dependency_overrides.clear()

    def test_create_employee_missing_required_fields(self, override_payroll_deps, auth_headers):
        """Test employee creation fails without required fields"""
        payload = {"full_name": "Only Name"}
        response = client.post("/api/payroll/employees", json=payload, headers=auth_headers)
        assert response.status_code == 422


class TestListEmployees:
    """Test GET /api/employees - List employees"""

    def test_list_employees_success(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test listing all active employees"""
        emp = _employee_response()
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[emp])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/payroll/employees", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["full_name"] == "Ali Khan"

    def test_list_employees_with_inactive_filter(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test listing employees with is_active=False filter"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/payroll/employees?is_active=false", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_employees_no_company(self, auth_headers):
        """Test listing employees when user has no company returns 400"""
        from app.routers import payroll
        from app.types import User

        async def mock_no_company():
            return User(id="u1", email="a@b.com", full_name="A", company_id=None, company_name=None)

        app.dependency_overrides[payroll.get_current_user] = mock_no_company
        response = client.get("/api/payroll/employees", headers=auth_headers)
        assert response.status_code == 400
        app.dependency_overrides.clear()


class TestGetEmployee:
    """Test GET /api/employees/{id}"""

    def test_get_employee_success(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test fetching a single employee"""
        emp_id = uuid4()
        emp = _employee_response(emp_id)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[emp])
        mock_supabase.table.return_value = mock_query

        response = client.get(f"/api/payroll/employees/{emp_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(emp_id)

    def test_get_employee_not_found(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test fetching non-existent employee returns 404"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        response = client.get(f"/api/payroll/employees/{uuid4()}", headers=auth_headers)
        assert response.status_code == 404


class TestUpdateEmployee:
    """Test PUT /api/employees/{id}"""

    def test_update_employee_success(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test updating employee details"""
        emp = _employee_response()

        # Get existing
        mock_get = MagicMock()
        mock_get.select.return_value = mock_get
        mock_get.eq.return_value = mock_get
        mock_get.execute.return_value = MagicMock(data=[emp])

        # Update
        emp["full_name"] = "Ali Khan Updated"
        mock_upd = MagicMock()
        mock_upd.update.return_value = mock_upd
        mock_upd.eq.return_value = mock_upd
        mock_upd.execute.return_value = MagicMock(data=[emp])

        mock_supabase.table.side_effect = [mock_get, mock_upd]

        response = client.put(
            f"/api/payroll/employees/{emp['id']}",
            json={"full_name": "Ali Khan Updated"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["full_name"] == "Ali Khan Updated"

    def test_update_employee_not_found(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test updating non-existent employee returns 404"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        response = client.put(f"/api/payroll/employees/{uuid4()}", json={"full_name": "X"}, headers=auth_headers)
        assert response.status_code == 404


# ===================================================================
# Payroll Run
# ===================================================================

class TestRunPayroll:
    """Test POST /api/run - Run payroll for a month"""

    def test_run_payroll_success(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test running payroll for a month with active employees"""
        # Check existing payroll run (none)
        mock_check = MagicMock()
        mock_check.select.return_value = mock_check
        mock_check.eq.return_value = mock_check
        mock_check.execute.return_value = MagicMock(data=[])

        # Active employees
        emp = _employee_response()
        mock_emp_list = MagicMock()
        mock_emp_list.select.return_value = mock_emp_list
        mock_emp_list.eq.return_value = mock_emp_list
        mock_emp_list.execute.return_value = MagicMock(data=[emp])

        # Create payroll run
        run_id = uuid4()
        mock_run = MagicMock()
        mock_run.insert.return_value = mock_run
        mock_run.execute.return_value = MagicMock(data=[{"id": str(run_id), "month": 3, "year": 2025}])

        # Create salary slip
        mock_slip = MagicMock()
        mock_slip.insert.return_value = mock_slip
        mock_slip.execute.return_value = MagicMock(data=[_salary_slip_response(employee_id=emp["id"])])

        # Update payroll run
        mock_update_run = MagicMock()
        mock_update_run.update.return_value = mock_update_run
        mock_update_run.eq.return_value = mock_update_run
        mock_update_run.execute.return_value = MagicMock(data=[])

        # Salary expense account lookup
        mock_account = MagicMock()
        mock_account.select.return_value = mock_account
        mock_account.eq.return_value = mock_account
        mock_account.execute.return_value = MagicMock(data=[{"id": "acc-id"}])

        # Journal creation
        mock_journal = MagicMock()
        mock_journal.insert.return_value = mock_journal
        mock_journal.execute.return_value = MagicMock(data=[{"id": "j1"}])

        mock_journal_lines = MagicMock()
        mock_journal_lines.insert.return_value = mock_journal_lines
        mock_journal_lines.execute.return_value = MagicMock(data=[])

        # Side effect cycles through all mocks
        mock_supabase.table.side_effect = [
            mock_check,        # payroll_runs check
            mock_emp_list,     # employees list
            mock_run,          # payroll_runs insert
            mock_slip,         # salary_slips insert
            mock_update_run,   # payroll_runs update
            mock_account,      # accounts (salary expense)
            mock_account,      # accounts (cash)
            mock_journal,      # journals insert
            mock_journal_lines,
            mock_journal_lines,
        ]

        response = client.post("/api/payroll/run", json={"month": 3, "year": 2025}, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["employees_processed"] >= 1

    def test_run_payroll_duplicate_month(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test running payroll for a month that already exists returns 400"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[{"id": "existing-run"}])
        mock_supabase.table.return_value = mock_query

        response = client.post("/api/payroll/run", json={"month": 3, "year": 2025}, headers=auth_headers)
        assert response.status_code == 400
        assert "already run" in response.json()["detail"]

    def test_run_payroll_no_active_employees(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test running payroll with no active employees returns 400"""
        # No existing payroll run
        mock_check = MagicMock()
        mock_check.select.return_value = mock_check
        mock_check.eq.return_value = mock_check
        mock_check.execute.return_value = MagicMock(data=[])

        # No active employees
        mock_emp = MagicMock()
        mock_emp.select.return_value = mock_emp
        mock_emp.eq.return_value = mock_emp
        mock_emp.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_check, mock_emp]

        response = client.post("/api/payroll/run", json={"month": 4, "year": 2025}, headers=auth_headers)
        assert response.status_code == 400
        assert "No active employees" in response.json()["detail"]


class TestListPayrollRuns:
    """Test GET /api/runs"""

    def test_list_payroll_runs_success(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test listing payroll runs"""
        run = _payroll_run_response()
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[run])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/payroll/runs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["month"] == 3
        assert data[0]["status"] == "processed"

    def test_list_payroll_runs_empty(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test listing payroll runs when none exist"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/payroll/runs", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []


# ===================================================================
# Salary Slips
# ===================================================================

class TestListSalarySlips:
    """Test GET /api/slips"""

    def test_list_slips_all(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test listing all salary slips"""
        slip = _salary_slip_response()
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[slip])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/payroll/slips", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["employee_name"] == "Ali Khan"

    def test_list_slips_filtered_by_month_year(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test listing salary slips filtered by month and year"""
        slip = _salary_slip_response()
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[slip])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/payroll/slips?month=3&year=2025", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data[0]["month"] == 3
        assert data[0]["year"] == 2025

    def test_list_slips_by_employee(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test listing salary slips for a specific employee"""
        emp_id = uuid4()
        slip = _salary_slip_response(employee_id=emp_id)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[slip])
        mock_supabase.table.return_value = mock_query

        response = client.get(f"/api/payroll/slips?employee_id={emp_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data[0]["employee_id"] == str(emp_id)


class TestGetSalarySlip:
    """Test GET /api/slips/{slip_id}"""

    def test_get_slip_success(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test fetching a specific salary slip"""
        slip_id = uuid4()
        emp_id = uuid4()
        slip = _salary_slip_response(slip_id=slip_id, employee_id=emp_id)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[slip])
        mock_supabase.table.return_value = mock_query

        response = client.get(f"/api/payroll/slips/{slip_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(slip_id)
        assert data["gross_salary"] == "125000.00"

    def test_get_slip_not_found(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test fetching non-existent salary slip returns 404"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        response = client.get(f"/api/payroll/slips/{uuid4()}", headers=auth_headers)
        assert response.status_code == 404


# ===================================================================
# EOBI / Tax Calculations
# ===================================================================

class TestEOBITaxCalculations:
    """Test EOBI and tax deduction logic within payroll run"""

    def test_eobi_deduction_at_default_rate(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test EOBI deduction calculated at default 1% of basic salary"""
        # No existing payroll run
        mock_check = MagicMock()
        mock_check.select.return_value = mock_check
        mock_check.eq.return_value = mock_check
        mock_check.execute.return_value = MagicMock(data=[])

        # One employee with basic 80000, eobi_rate 1
        emp = _employee_response()
        mock_emp = MagicMock()
        mock_emp.select.return_value = mock_emp
        mock_emp.eq.return_value = mock_emp
        mock_emp.execute.return_value = MagicMock(data=[emp])

        run_id = uuid4()
        mock_run = MagicMock()
        mock_run.insert.return_value = mock_run
        mock_run.execute.return_value = MagicMock(data=[{"id": str(run_id)}])

        # Capture slip insert arguments
        captured_slips = []

        def capture_slip_insert(data):
            captured_slips.append(data)
            mock_r = MagicMock()
            mock_r.execute.return_value = MagicMock(data=[{"id": str(uuid4())}])
            return mock_r

        mock_slip = MagicMock()
        mock_slip.insert.side_effect = capture_slip_insert

        mock_update = MagicMock()
        mock_update.update.return_value = mock_update
        mock_update.eq.return_value = mock_update
        mock_update.execute.return_value = MagicMock(data=[])

        mock_account = MagicMock()
        mock_account.select.return_value = mock_account
        mock_account.eq.return_value = mock_account
        mock_account.execute.return_value = MagicMock(data=[{"id": "acc-id"}])

        mock_journal = MagicMock()
        mock_journal.insert.return_value = mock_journal
        mock_journal.execute.return_value = MagicMock(data=[{"id": "j1"}])

        mock_jl = MagicMock()
        mock_jl.insert.return_value = mock_jl
        mock_jl.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [
            mock_check, mock_emp, mock_run, mock_slip, mock_update,
            mock_account, mock_account, mock_journal, mock_jl, mock_jl,
        ]

        client.post("/api/payroll/run", json={"month": 5, "year": 2025}, headers=auth_headers)

        assert len(captured_slips) == 1
        slip = captured_slips[0]
        # EOBI = 80000 * 1% = 800
        assert Decimal(str(slip["eobi_deduction"])) == Decimal("800.00")

    def test_tax_deduction_at_custom_rate(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test income tax deduction at employee-specific 5% rate on gross"""
        mock_check = MagicMock()
        mock_check.select.return_value = mock_check
        mock_check.eq.return_value = mock_check
        mock_check.execute.return_value = MagicMock(data=[])

        emp = _employee_response()
        mock_emp = MagicMock()
        mock_emp.select.return_value = mock_emp
        mock_emp.eq.return_value = mock_emp
        mock_emp.execute.return_value = MagicMock(data=[emp])

        run_id = uuid4()
        mock_run = MagicMock()
        mock_run.insert.return_value = mock_run
        mock_run.execute.return_value = MagicMock(data=[{"id": str(run_id)}])

        captured_slips = []

        def capture(data):
            captured_slips.append(data)
            m = MagicMock()
            m.execute.return_value = MagicMock(data=[{"id": str(uuid4())}])
            return m

        mock_slip = MagicMock()
        mock_slip.insert.side_effect = capture

        mock_update = MagicMock()
        mock_update.update.return_value = mock_update
        mock_update.eq.return_value = mock_update
        mock_update.execute.return_value = MagicMock(data=[])

        mock_account = MagicMock()
        mock_account.select.return_value = mock_account
        mock_account.eq.return_value = mock_account
        mock_account.execute.return_value = MagicMock(data=[{"id": "a"}])

        mock_journal = MagicMock()
        mock_journal.insert.return_value = mock_journal
        mock_journal.execute.return_value = MagicMock(data=[{"id": "j1"}])

        mock_jl = MagicMock()
        mock_jl.insert.return_value = mock_jl
        mock_jl.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [
            mock_check, mock_emp, mock_run, mock_slip, mock_update,
            mock_account, mock_account, mock_journal, mock_jl, mock_jl,
        ]

        client.post("/api/payroll/run", json={"month": 6, "year": 2025}, headers=auth_headers)

        slip = captured_slips[0]
        # Gross = 80000 + 32000 + 8000 + 5000 = 125000
        # Tax = 125000 * 5% = 6250
        assert Decimal(str(slip["tax_deduction"])) == Decimal("6250.00")

    def test_net_salary_after_deductions(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test net salary = gross - (EOBI + tax)"""
        mock_check = MagicMock()
        mock_check.select.return_value = mock_check
        mock_check.eq.return_value = mock_check
        mock_check.execute.return_value = MagicMock(data=[])

        emp = _employee_response()
        mock_emp = MagicMock()
        mock_emp.select.return_value = mock_emp
        mock_emp.eq.return_value = mock_emp
        mock_emp.execute.return_value = MagicMock(data=[emp])

        run_id = uuid4()
        mock_run = MagicMock()
        mock_run.insert.return_value = mock_run
        mock_run.execute.return_value = MagicMock(data=[{"id": str(run_id)}])

        captured_slips = []

        def capture(data):
            captured_slips.append(data)
            m = MagicMock()
            m.execute.return_value = MagicMock(data=[{"id": str(uuid4())}])
            return m

        mock_slip = MagicMock()
        mock_slip.insert.side_effect = capture

        mock_update = MagicMock()
        mock_update.update.return_value = mock_update
        mock_update.eq.return_value = mock_update
        mock_update.execute.return_value = MagicMock(data=[])

        mock_account = MagicMock()
        mock_account.select.return_value = mock_account
        mock_account.eq.return_value = mock_account
        mock_account.execute.return_value = MagicMock(data=[{"id": "a"}])

        mock_journal = MagicMock()
        mock_journal.insert.return_value = mock_journal
        mock_journal.execute.return_value = MagicMock(data=[{"id": "j1"}])

        mock_jl = MagicMock()
        mock_jl.insert.return_value = mock_jl
        mock_jl.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [
            mock_check, mock_emp, mock_run, mock_slip, mock_update,
            mock_account, mock_account, mock_journal, mock_jl, mock_jl,
        ]

        client.post("/api/payroll/run", json={"month": 7, "year": 2025}, headers=auth_headers)

        slip = captured_slips[0]
        gross = Decimal(str(slip["gross_salary"]))
        eobi = Decimal(str(slip["eobi_deduction"]))
        tax = Decimal(str(slip["tax_deduction"]))
        net = Decimal(str(slip["net_salary"]))
        total_deductions = Decimal(str(slip["total_deductions"]))

        assert total_deductions == eobi + tax
        assert net == gross - total_deductions

    def test_payroll_journal_entry_created(self, override_payroll_deps, auth_headers, mock_supabase):
        """Test that a payroll run creates debit/credit journal entries"""
        mock_check = MagicMock()
        mock_check.select.return_value = mock_check
        mock_check.eq.return_value = mock_check
        mock_check.execute.return_value = MagicMock(data=[])

        emp = _employee_response()
        mock_emp = MagicMock()
        mock_emp.select.return_value = mock_emp
        mock_emp.eq.return_value = mock_emp
        mock_emp.execute.return_value = MagicMock(data=[emp])

        run_id = uuid4()
        mock_run = MagicMock()
        mock_run.insert.return_value = mock_run
        mock_run.execute.return_value = MagicMock(data=[{"id": str(run_id)}])

        mock_slip = MagicMock()
        mock_slip.insert.return_value = mock_slip
        mock_slip.execute.return_value = MagicMock(data=[_salary_slip_response()])

        mock_update = MagicMock()
        mock_update.update.return_value = mock_update
        mock_update.eq.return_value = mock_update
        mock_update.execute.return_value = MagicMock(data=[])

        mock_account = MagicMock()
        mock_account.select.return_value = mock_account
        mock_account.eq.return_value = mock_account
        mock_account.execute.return_value = MagicMock(data=[{"id": "acc-salary"}, {"id": "acc-cash"}])

        captured_journals = []

        def capture_journal(data):
            captured_journals.append(data)
            m = MagicMock()
            m.execute.return_value = MagicMock(data=[{"id": "j1"}])
            return m

        mock_journal = MagicMock()
        mock_journal.insert.side_effect = capture_journal

        mock_jl = MagicMock()
        mock_jl.insert.return_value = mock_jl
        mock_jl.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [
            mock_check, mock_emp, mock_run, mock_slip, mock_update,
            mock_account, mock_account, mock_journal, mock_jl, mock_jl,
        ]

        client.post("/api/payroll/run", json={"month": 8, "year": 2025}, headers=auth_headers)

        assert len(captured_journals) >= 1
        journal = captured_journals[0]
        assert journal["reference_type"] == "payroll"
        assert journal["is_system_generated"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
