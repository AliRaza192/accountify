"""
Tests for Budget API
Endpoints: budget CRUD, budget lines, budget vs actual comparison
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from uuid import uuid4
import sys
import os

# Add backend app to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Set up mocks BEFORE importing app
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
# Test data helpers
# ---------------------------------------------------------------------------

def create_mock_budget(budget_id=1, company_id=None):
    """Create a mock budget header"""
    return {
        "id": budget_id,
        "company_id": company_id or str(uuid4()),
        "fiscal_year": 2025,
        "name": "FY2025 Operating Budget",
        "branch_id": None,
        "status": "draft",
        "created_by": str(uuid4()),
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
    }


def create_mock_budget_line(line_id=1, budget_id=1):
    """Create a mock budget line with monthly amounts"""
    return {
        "id": line_id,
        "budget_id": budget_id,
        "account_id": 5001,
        "cost_center_id": None,
        "jan": 10000.0,
        "feb": 10000.0,
        "mar": 12000.0,
        "apr": 10000.0,
        "may": 10000.0,
        "jun": 11000.0,
        "jul": 10000.0,
        "aug": 10000.0,
        "sep": 10000.0,
        "oct": 10000.0,
        "nov": 10000.0,
        "dec": 15000.0,
        "total": 128000.0,
        "notes": "Operating expenses"
    }


def create_auth_headers(token="test-token"):
    """Create authorization headers"""
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def auth_headers():
    """Fixture for auth headers"""
    return create_auth_headers()


def _override_user_and_supabase(user=None, supabase_client=None):
    """Helper to override both get_current_user and get_supabase_client"""
    from app.routers import budgets

    if user is None:
        user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            company_id="test-company-id",
            company_name="Test Company"
        )

    async def mock_get_current_user():
        return user

    def mock_get_supabase_client():
        return supabase_client

    app.dependency_overrides[budgets.get_current_user] = mock_get_current_user
    app.dependency_overrides[budgets.get_supabase_client] = mock_get_supabase_client


def _clear_overrides():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# TestBudgetCRUD - list and create budgets
# ---------------------------------------------------------------------------

class TestBudgetCRUD:
    """Test budget CRUD endpoints"""

    def test_list_budgets_success(self, auth_headers, mock_supabase):
        """Test listing all budgets for a company"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=1, company_id=company_id)

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_budget])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/budgets", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["name"] == "FY2025 Operating Budget"
        assert data[0]["fiscal_year"] == 2025

        _clear_overrides()

    def test_list_budgets_with_fiscal_year_filter(self, auth_headers, mock_supabase):
        """Test listing budgets filtered by fiscal year"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=2, company_id=company_id)
        mock_budget["fiscal_year"] = 2024

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_budget])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/budgets?fiscal_year=2024", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["fiscal_year"] == 2024

        _clear_overrides()

    def test_list_budgets_with_status_filter(self, auth_headers, mock_supabase):
        """Test listing budgets filtered by status"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/budgets?status=approved", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data == []

        _clear_overrides()

    def test_list_budgets_no_supabase(self, auth_headers):
        """Test listing budgets when supabase client is None"""
        _override_user_and_supabase(supabase_client=None)

        response = client.get("/api/budgets", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

        _clear_overrides()

    def test_list_budgets_empty_result(self, auth_headers, mock_supabase):
        """Test listing budgets when none exist"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/budgets", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

        _clear_overrides()

    def test_create_budget_success(self, auth_headers, mock_supabase):
        """Test creating a budget with lines"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=10, company_id=company_id)
        mock_budget["name"] = "FY2025 Budget"

        mock_budget_query = MagicMock()
        mock_budget_query.insert.return_value = mock_budget_query
        mock_budget_query.execute.return_value = MagicMock(data=[mock_budget])

        mock_lines_query = MagicMock()
        mock_lines_query.insert.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=[create_mock_budget_line(budget_id=10)])

        mock_supabase.table.side_effect = [
            mock_budget_query,   # insert budget
            mock_lines_query,    # insert line 1
            mock_lines_query,    # insert line 2
        ]

        _override_user_and_supabase(supabase_client=mock_supabase)

        budget_data = {
            "fiscal_year": 2025,
            "name": "FY2025 Budget",
            "branch_id": None,
            "lines": [
                {
                    "account_id": 5001,
                    "cost_center_id": None,
                    "jan": 10000.0,
                    "feb": 10000.0,
                    "mar": 12000.0,
                    "apr": 10000.0,
                    "may": 10000.0,
                    "jun": 11000.0,
                    "jul": 10000.0,
                    "aug": 10000.0,
                    "sep": 10000.0,
                    "oct": 10000.0,
                    "nov": 10000.0,
                    "dec": 15000.0,
                    "notes": "Operating expenses"
                },
                {
                    "account_id": 5002,
                    "cost_center_id": 1,
                    "jan": 5000.0,
                    "feb": 5000.0,
                    "mar": 5000.0,
                    "apr": 5000.0,
                    "may": 5000.0,
                    "jun": 5000.0,
                    "jul": 5000.0,
                    "aug": 5000.0,
                    "sep": 5000.0,
                    "oct": 5000.0,
                    "nov": 5000.0,
                    "dec": 5000.0,
                    "notes": "Marketing budget"
                }
            ]
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "FY2025 Budget"
        assert data["status"] == "draft"

        _clear_overrides()

    def test_create_budget_no_lines(self, auth_headers, mock_supabase):
        """Test creating a budget with no budget lines"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=11, company_id=company_id)
        mock_budget["name"] = "FY2026 Empty Budget"

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_budget])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        budget_data = {
            "fiscal_year": 2026,
            "name": "FY2026 Empty Budget",
            "lines": []
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "FY2026 Empty Budget"

        _clear_overrides()

    def test_create_budget_insert_fails(self, auth_headers, mock_supabase):
        """Test creating budget when insert returns no data"""
        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        budget_data = {
            "fiscal_year": 2025,
            "name": "Failed Budget",
            "lines": []
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        assert response.status_code == 500
        assert "Failed to create budget" in response.json()["detail"]

        _clear_overrides()

    def test_create_budget_no_supabase(self, auth_headers):
        """Test creating budget without supabase returns 500"""
        _override_user_and_supabase(supabase_client=None)

        budget_data = {
            "fiscal_year": 2025,
            "name": "No Client Budget",
            "lines": []
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        assert response.status_code == 500
        assert "Supabase client not available" in response.json()["detail"]

        _clear_overrides()

    def test_create_budget_missing_fiscal_year(self, auth_headers):
        """Test creating budget without required fiscal_year field"""
        _override_user_and_supabase()

        budget_data = {
            "name": "No Year Budget",
            "lines": []
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        assert response.status_code == 422

        _clear_overrides()

    def test_create_budget_missing_name(self, auth_headers):
        """Test creating budget without required name field"""
        _override_user_and_supabase()

        budget_data = {
            "fiscal_year": 2025,
            "lines": []
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        assert response.status_code == 422

        _clear_overrides()

    def test_create_budget_with_branch_id(self, auth_headers, mock_supabase):
        """Test creating a budget with a branch assignment"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=12, company_id=company_id)
        mock_budget["branch_id"] = 5

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_budget])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        budget_data = {
            "fiscal_year": 2025,
            "name": "Branch Budget",
            "branch_id": 5,
            "lines": []
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["branch_id"] == 5

        _clear_overrides()


# ---------------------------------------------------------------------------
# TestBudgetVsActual - budget vs actual comparison
# ---------------------------------------------------------------------------

class TestBudgetVsActual:
    """Test budget vs actual comparison endpoint"""

    def test_get_budget_vs_actual_success(self, auth_headers, mock_supabase):
        """Test getting budget vs actual comparison"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=3, company_id=company_id)
        mock_line = create_mock_budget_line(budget_id=3)

        mock_budget_query = MagicMock()
        mock_budget_query.select.return_value = mock_budget_query
        mock_budget_query.eq.return_value = mock_budget_query
        mock_budget_query.execute.return_value = MagicMock(data=[mock_budget])

        mock_lines_query = MagicMock()
        mock_lines_query.select.return_value = mock_lines_query
        mock_lines_query.eq.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=[mock_line])

        mock_supabase.table.side_effect = [mock_budget_query, mock_lines_query]

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/budgets/3/vs-actual", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["budget_id"] == 3
        assert data["budget_name"] == "FY2025 Operating Budget"
        assert data["fiscal_year"] == 2025
        assert "lines" in data
        assert len(data["lines"]) == 1
        assert "summary" in data
        assert data["summary"]["total_budget"] == 128000.0
        assert data["summary"]["total_actual"] == 0
        assert data["summary"]["utilization_percent"] == 0

        _clear_overrides()

    def test_get_budget_vs_actual_not_found(self, auth_headers, mock_supabase):
        """Test budget vs actual for non-existent budget"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/budgets/999/vs-actual", headers=auth_headers)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

        _clear_overrides()

    def test_get_budget_vs_actual_no_lines(self, auth_headers, mock_supabase):
        """Test budget vs actual for budget with no lines"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=4, company_id=company_id)

        mock_budget_query = MagicMock()
        mock_budget_query.select.return_value = mock_budget_query
        mock_budget_query.eq.return_value = mock_budget_query
        mock_budget_query.execute.return_value = MagicMock(data=[mock_budget])

        mock_lines_query = MagicMock()
        mock_lines_query.select.return_value = mock_lines_query
        mock_lines_query.eq.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_budget_query, mock_lines_query]

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/budgets/4/vs-actual", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["budget_id"] == 4
        assert data["lines"] == []
        assert data["summary"]["total_budget"] == 0

        _clear_overrides()

    def test_get_budget_vs_actual_multiple_lines(self, auth_headers, mock_supabase):
        """Test budget vs actual with multiple budget lines"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=5, company_id=company_id)
        mock_line_1 = create_mock_budget_line(line_id=1, budget_id=5)
        mock_line_2 = create_mock_budget_line(line_id=2, budget_id=5)
        mock_line_2["total"] = 60000.0

        mock_budget_query = MagicMock()
        mock_budget_query.select.return_value = mock_budget_query
        mock_budget_query.eq.return_value = mock_budget_query
        mock_budget_query.execute.return_value = MagicMock(data=[mock_budget])

        mock_lines_query = MagicMock()
        mock_lines_query.select.return_value = mock_lines_query
        mock_lines_query.eq.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=[mock_line_1, mock_line_2])

        mock_supabase.table.side_effect = [mock_budget_query, mock_lines_query]

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/budgets/5/vs-actual", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data["lines"]) == 2
        # Total should be sum of both lines
        assert data["summary"]["total_budget"] == 128000.0 + 60000.0

        _clear_overrides()

    def test_get_budget_vs_actual_no_supabase(self, auth_headers):
        """Test budget vs actual without supabase returns 500"""
        _override_user_and_supabase(supabase_client=None)

        response = client.get("/api/budgets/1/vs-actual", headers=auth_headers)

        assert response.status_code == 500

        _clear_overrides()


# ---------------------------------------------------------------------------
# TestBudgetValidation - budget input validation
# ---------------------------------------------------------------------------

class TestBudgetValidation:
    """Test budget input validation edge cases"""

    def test_budget_line_all_zeros(self, auth_headers, mock_supabase):
        """Test creating budget with all monthly values at zero"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=13, company_id=company_id)

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_budget])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        budget_data = {
            "fiscal_year": 2025,
            "name": "Zero Budget",
            "lines": [
                {
                    "account_id": 5001,
                    "jan": 0,
                    "feb": 0,
                    "mar": 0,
                    "apr": 0,
                    "may": 0,
                    "jun": 0,
                    "jul": 0,
                    "aug": 0,
                    "sep": 0,
                    "oct": 0,
                    "nov": 0,
                    "dec": 0
                }
            ]
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        # Should succeed - zero values are valid
        assert response.status_code == 200

        _clear_overrides()

    def test_budget_line_negative_value(self, auth_headers, mock_supabase):
        """Test creating budget line with negative monthly value"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=14, company_id=company_id)

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_budget])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        budget_data = {
            "fiscal_year": 2025,
            "name": "Negative Budget",
            "lines": [
                {
                    "account_id": 5001,
                    "jan": -5000.0,
                    "feb": 0,
                    "mar": 0,
                    "apr": 0,
                    "may": 0,
                    "jun": 0,
                    "jul": 0,
                    "aug": 0,
                    "sep": 0,
                    "oct": 0,
                    "nov": 0,
                    "dec": 0
                }
            ]
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        # The router does not validate negative values, so it should succeed
        assert response.status_code == 200

        _clear_overrides()

    def test_budget_line_large_values(self, auth_headers, mock_supabase):
        """Test creating budget line with very large monthly values"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=15, company_id=company_id)

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_budget])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        budget_data = {
            "fiscal_year": 2025,
            "name": "Large Budget",
            "lines": [
                {
                    "account_id": 5001,
                    "jan": 9999999.99,
                    "feb": 9999999.99,
                    "mar": 9999999.99,
                    "apr": 9999999.99,
                    "may": 9999999.99,
                    "jun": 9999999.99,
                    "jul": 9999999.99,
                    "aug": 9999999.99,
                    "sep": 9999999.99,
                    "oct": 9999999.99,
                    "nov": 9999999.99,
                    "dec": 9999999.99
                }
            ]
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        assert response.status_code == 200

        _clear_overrides()

    def test_budget_line_with_notes(self, auth_headers, mock_supabase):
        """Test creating budget line with notes field"""
        company_id = str(uuid4())
        mock_budget = create_mock_budget(budget_id=16, company_id=company_id)

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_budget])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        budget_data = {
            "fiscal_year": 2025,
            "name": "Noted Budget",
            "lines": [
                {
                    "account_id": 5001,
                    "jan": 1000.0,
                    "feb": 1000.0,
                    "mar": 1000.0,
                    "apr": 1000.0,
                    "may": 1000.0,
                    "jun": 1000.0,
                    "jul": 1000.0,
                    "aug": 1000.0,
                    "sep": 1000.0,
                    "oct": 1000.0,
                    "nov": 1000.0,
                    "dec": 1000.0,
                    "notes": "This is a test note for the budget line"
                }
            ]
        }

        response = client.post("/api/budgets", json=budget_data, headers=auth_headers)

        assert response.status_code == 200

        _clear_overrides()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
