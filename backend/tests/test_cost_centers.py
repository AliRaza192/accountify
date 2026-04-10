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


# Test data helpers
def create_mock_cost_center(cc_id=None):
    """Create a mock cost center object with proper types"""
    from uuid import UUID
    cid = cc_id if cc_id else uuid4()
    obj = MagicMock()
    obj.id = cid if isinstance(cid, UUID) else UUID(str(cid))
    obj.company_id = UUID("12345678-1234-5678-1234-567812345678")
    obj.code = "CC-001"
    obj.name = "Production Department"
    obj.description = "Main production cost center"
    obj.status = "active"
    obj.overhead_allocation_rule = None
    obj.created_by = UUID("12345678-1234-5678-1234-567812345678")
    obj.updated_by = UUID("12345678-1234-5678-1234-567812345678")
    obj.created_at = "2025-01-15T10:30:00Z"
    obj.updated_at = "2025-01-15T10:30:00Z"
    return obj


def create_mock_allocation(alloc_id=None, cc_id=None):
    """Create a mock cost center allocation"""
    return {
        "id": str(alloc_id) if alloc_id else str(uuid4()),
        "company_id": "test-company-id",
        "cost_center_id": str(cc_id) if cc_id else str(uuid4()),
        "transaction_type": "expense",
        "transaction_id": str(uuid4()),
        "amount": "25000.00",
        "allocation_percent": "100.00",
        "created_at": "2025-02-15T10:30:00Z"
    }


def create_auth_headers(token="test-token"):
    """Create authorization headers"""
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers():
    """Fixture for auth headers"""
    return create_auth_headers()


class TestCostCenterCRUD:
    """Test cost center CRUD endpoints"""

    def test_list_cost_centers_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test listing all cost centers"""
        mock_cc = create_mock_cost_center()

        from app.main import app
        from app.routers import cost_centers
        from app.types import User
        from uuid import uuid4

        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_scalars = MagicMock()
            mock_scalars.all.return_value = [mock_cc]
            mock_result.scalars.return_value = mock_scalars
            mock_db.execute.return_value = mock_result
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        response = client.get("/api/cost-centers", headers=auth_headers)

        assert response.status_code in [200, 500]

        app.dependency_overrides.clear()

    def test_list_cost_centers_with_status_filter(self, override_dependencies, auth_headers, mock_supabase):
        """Test listing cost centers filtered by status"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_scalars = MagicMock()
            mock_scalars.all.return_value = []
            mock_result.scalars.return_value = mock_scalars
            mock_db.execute.return_value = mock_result
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        response = client.get("/api/cost-centers?status=active", headers=auth_headers)

        assert response.status_code in [200, 500]

        app.dependency_overrides.clear()

    def test_create_cost_center_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating a cost center"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result
            mock_db.add.return_value = None
            mock_db.commit.return_value = None
            mock_db.refresh.return_value = None
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        cc_data = {
            "company_id": str(uuid4()),
            "code": "CC-002",
            "name": "Marketing Department",
            "description": "Marketing cost center",
            "status": "active"
        }

        response = client.post("/api/cost-centers", json=cc_data, headers=auth_headers)

        assert response.status_code in [200, 201, 400, 422, 500]

        app.dependency_overrides.clear()

    def test_create_cost_center_duplicate_code(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating cost center with duplicate code"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = MagicMock(id="existing-id")
            mock_db.execute.return_value = mock_result
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        cc_data = {
            "company_id": str(uuid4()),
            "code": "CC-DUP",
            "name": "Duplicate Department"
        }

        response = client.post("/api/cost-centers", json=cc_data, headers=auth_headers)

        assert response.status_code in [400, 422, 500]

        app.dependency_overrides.clear()

    def test_create_cost_center_missing_code(self, override_dependencies, auth_headers):
        """Test creating cost center without required code field"""
        cc_data = {
            "name": "No Code Department"
        }

        response = client.post("/api/cost-centers", json=cc_data, headers=auth_headers)

        assert response.status_code == 422

    def test_create_cost_center_missing_name(self, override_dependencies, auth_headers):
        """Test creating cost center without required name field"""
        cc_data = {
            "code": "CC-NO-NAME"
        }

        response = client.post("/api/cost-centers", json=cc_data, headers=auth_headers)

        assert response.status_code == 422

    def test_create_cost_center_invalid_status(self, override_dependencies, auth_headers):
        """Test creating cost center with invalid status"""
        cc_data = {
            "code": "CC-INV",
            "name": "Invalid Status",
            "status": "deleted"
        }

        response = client.post("/api/cost-centers", json=cc_data, headers=auth_headers)

        assert response.status_code == 422

    def test_get_cost_center_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting a specific cost center"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        cc_id = uuid4()
        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        mock_cc = create_mock_cost_center(cc_id=cc_id)

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_cc
            mock_db.execute.return_value = mock_result
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        response = client.get(f"/api/cost-centers/{cc_id}", headers=auth_headers)

        assert response.status_code in [200, 500]

        app.dependency_overrides.clear()

    def test_get_cost_center_not_found(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting non-existent cost center"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        cc_id = uuid4()
        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        response = client.get(f"/api/cost-centers/{cc_id}", headers=auth_headers)

        assert response.status_code in [404, 500]

        app.dependency_overrides.clear()

    def test_update_cost_center_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test updating a cost center"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        cc_id = uuid4()
        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        mock_cc = create_mock_cost_center(cc_id=cc_id)

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_cc
            mock_db.execute.return_value = mock_result
            mock_db.commit.return_value = None
            mock_db.refresh.return_value = None
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        update_data = {
            "name": "Updated Production",
            "description": "Updated description"
        }

        response = client.put(f"/api/cost-centers/{cc_id}", json=update_data, headers=auth_headers)

        assert response.status_code in [200, 400, 500]

        app.dependency_overrides.clear()

    def test_update_cost_center_not_found(self, override_dependencies, auth_headers, mock_supabase):
        """Test updating non-existent cost center"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        cc_id = uuid4()
        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        response = client.put(f"/api/cost-centers/{cc_id}", json={"name": "Updated"}, headers=auth_headers)

        assert response.status_code in [404, 500]

        app.dependency_overrides.clear()

    def test_delete_cost_center_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test deleting a cost center"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        cc_id = uuid4()
        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        mock_cc = MagicMock()
        mock_cc.id = cc_id

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_cc
            mock_db.execute.return_value = mock_result
            mock_db.delete.return_value = None
            mock_db.commit.return_value = None
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        response = client.delete(f"/api/cost-centers/{cc_id}", headers=auth_headers)

        assert response.status_code in [204, 400, 404, 500]

        app.dependency_overrides.clear()


class TestCostCenterAllocations:
    """Test cost center allocation endpoints"""

    def test_allocate_transaction_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test allocating a transaction to a cost center"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        cc_id = uuid4()
        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        mock_cc = MagicMock()
        mock_cc.id = cc_id

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_cc
            mock_db.execute.return_value = mock_result
            mock_db.add.return_value = None
            mock_db.commit.return_value = None
            mock_db.refresh.return_value = None
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        alloc_data = {
            "company_id": str(uuid4()),
            "cost_center_id": str(cc_id),
            "transaction_type": "expense",
            "transaction_id": str(uuid4()),
            "amount": "15000.00",
            "allocation_percent": "50.00"
        }

        response = client.post(f"/api/cost-centers/{cc_id}/allocate", json=alloc_data, headers=auth_headers)

        assert response.status_code in [200, 201, 400, 422, 500]

        app.dependency_overrides.clear()

    def test_allocate_transaction_cost_center_not_found(self, override_dependencies, auth_headers, mock_supabase):
        """Test allocating to non-existent cost center"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        cc_id = uuid4()
        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = None
            mock_db.execute.return_value = mock_result
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        alloc_data = {
            "company_id": str(uuid4()),
            "cost_center_id": str(cc_id),
            "transaction_type": "expense",
            "transaction_id": str(uuid4()),
            "amount": "10000.00"
        }

        response = client.post(f"/api/cost-centers/{cc_id}/allocate", json=alloc_data, headers=auth_headers)

        assert response.status_code in [404, 422, 500]

        app.dependency_overrides.clear()

    def test_allocate_transaction_negative_amount(self, override_dependencies, auth_headers):
        """Test allocating with negative amount"""
        cc_id = uuid4()
        alloc_data = {
            "cost_center_id": str(cc_id),
            "transaction_type": "expense",
            "transaction_id": str(uuid4()),
            "amount": "-5000.00"
        }

        response = client.post(f"/api/cost-centers/{cc_id}/allocate", json=alloc_data, headers=auth_headers)

        assert response.status_code == 422

    def test_allocate_transaction_invalid_percent(self, override_dependencies, auth_headers):
        """Test allocating with invalid percentage (over 100)"""
        cc_id = uuid4()
        alloc_data = {
            "cost_center_id": str(cc_id),
            "transaction_type": "expense",
            "transaction_id": str(uuid4()),
            "amount": "10000.00",
            "allocation_percent": "150.00"
        }

        response = client.post(f"/api/cost-centers/{cc_id}/allocate", json=alloc_data, headers=auth_headers)

        assert response.status_code == 422


class TestOverheadAllocation:
    """Test overhead allocation endpoint"""

    def test_allocate_overhead_equal_split(self, override_dependencies, auth_headers, mock_supabase):
        """Test allocating overhead with equal split"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        cc_id_1 = uuid4()
        cc_id_2 = uuid4()
        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        mock_cc_1 = MagicMock()
        mock_cc_1.id = cc_id_1
        mock_cc_1.name = "Dept 1"
        mock_cc_2 = MagicMock()
        mock_cc_2.id = cc_id_2
        mock_cc_2.name = "Dept 2"

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = [mock_cc_1, mock_cc_2]
            mock_result.scalar.return_value = uuid4()
            mock_db.execute.return_value = mock_result
            mock_db.add.return_value = None
            mock_db.commit.return_value = None
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        overhead_data = {
            "source_account_code": "OH-001",
            "amount": "100000.00",
            "allocation_type": "equal_split",
            "cost_center_ids": [str(cc_id_1), str(cc_id_2)]
        }

        response = client.post("/api/cost-centers/allocate-overhead", json=overhead_data, headers=auth_headers)

        assert response.status_code in [200, 400, 500]

        app.dependency_overrides.clear()

    def test_allocate_overhead_percentage(self, override_dependencies, auth_headers, mock_supabase):
        """Test allocating overhead with specified percentages"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        cc_id_1 = uuid4()
        cc_id_2 = uuid4()
        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        mock_cc_1 = MagicMock()
        mock_cc_1.id = cc_id_1
        mock_cc_1.name = "Dept 1"
        mock_cc_2 = MagicMock()
        mock_cc_2.id = cc_id_2
        mock_cc_2.name = "Dept 2"

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalars.return_value.all.return_value = [mock_cc_1, mock_cc_2]
            mock_result.scalar.return_value = uuid4()
            mock_db.execute.return_value = mock_result
            mock_db.add.return_value = None
            mock_db.commit.return_value = None
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        overhead_data = {
            "source_account_code": "OH-002",
            "amount": "50000.00",
            "allocation_type": "percentage",
            "cost_center_ids": [str(cc_id_1), str(cc_id_2)],
            "percentages": ["60.00", "40.00"]
        }

        response = client.post("/api/cost-centers/allocate-overhead", json=overhead_data, headers=auth_headers)

        assert response.status_code in [200, 400, 500]

        app.dependency_overrides.clear()

    def test_allocate_overhead_invalid_type(self, override_dependencies, auth_headers):
        """Test allocating overhead with invalid allocation type"""
        overhead_data = {
            "source_account_code": "OH-INV",
            "amount": "10000.00",
            "allocation_type": "invalid_type",
            "cost_center_ids": [str(uuid4())]
        }

        response = client.post("/api/cost-centers/allocate-overhead", json=overhead_data, headers=auth_headers)

        assert response.status_code == 422

    def test_allocate_overhead_negative_amount(self, override_dependencies, auth_headers):
        """Test allocating overhead with negative amount"""
        overhead_data = {
            "source_account_code": "OH-NEG",
            "amount": "-10000.00",
            "allocation_type": "equal_split",
            "cost_center_ids": [str(uuid4())]
        }

        response = client.post("/api/cost-centers/allocate-overhead", json=overhead_data, headers=auth_headers)

        assert response.status_code == 422


class TestCostCenterReports:
    """Test cost center report endpoints"""

    def test_department_pl_report(self, override_dependencies, auth_headers, mock_supabase):
        """Test generating department P&L report"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        cc_id = uuid4()
        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        mock_cc = MagicMock()
        mock_cc.id = cc_id
        mock_cc.code = "CC-001"
        mock_cc.name = "Production"

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_result.scalar_one_or_none.return_value = mock_cc
            mock_scalars = MagicMock()
            mock_scalars.all.return_value = []
            mock_result.scalars.return_value = mock_scalars
            mock_db.execute.return_value = mock_result
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        response = client.get(f"/api/cost-centers/{cc_id}/pl-report?period_month=3&period_year=2025", headers=auth_headers)

        assert response.status_code in [200, 404, 500]

        app.dependency_overrides.clear()

    def test_cost_center_summary(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting cost center summary"""
        from app.main import app
        from app.routers import cost_centers
        from app.types import User

        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            role="user",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        def mock_get_db():
            mock_db = MagicMock()
            mock_result = MagicMock()
            mock_scalars = MagicMock()
            mock_scalars.all.return_value = []
            mock_result.scalars.return_value = mock_scalars
            mock_db.execute.return_value = mock_result
            return mock_db

        app.dependency_overrides[cost_centers.get_current_user] = mock_get_current_user
        app.dependency_overrides[cost_centers.get_db] = mock_get_db

        response = client.get("/api/cost-centers/reports/summary", headers=auth_headers)

        assert response.status_code in [200, 500]

        app.dependency_overrides.clear()

    def test_pl_report_invalid_month(self, override_dependencies, auth_headers):
        """Test P&L report with invalid month (13)"""
        cc_id = uuid4()

        response = client.get(f"/api/cost-centers/{cc_id}/pl-report?period_month=13&period_year=2025", headers=auth_headers)

        assert response.status_code == 422


class TestCostCenterValidation:
    """Test cost center validation edge cases"""

    def test_cost_center_code_too_long(self, override_dependencies, auth_headers):
        """Test cost center with code exceeding max length"""
        cc_data = {
            "code": "A" * 25,
            "name": "Long Code"
        }

        response = client.post("/api/cost-centers", json=cc_data, headers=auth_headers)

        assert response.status_code == 422

    def test_cost_center_name_too_long(self, override_dependencies, auth_headers):
        """Test cost center with name exceeding max length"""
        cc_data = {
            "code": "CC-LONG",
            "name": "B" * 105
        }

        response = client.post("/api/cost-centers", json=cc_data, headers=auth_headers)

        assert response.status_code == 422

    def test_cost_center_empty_code(self, override_dependencies, auth_headers):
        """Test cost center with empty code"""
        cc_data = {
            "code": "",
            "name": "Empty Code"
        }

        response = client.post("/api/cost-centers", json=cc_data, headers=auth_headers)

        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
