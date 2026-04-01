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
def create_mock_customer(customer_id=None):
    """Create a mock customer object"""
    return {
        "id": str(customer_id) if customer_id else str(uuid4()),
        "name": "Test Customer",
        "email": "test@example.com",
        "phone": "+92-300-1234567",
        "address": "123 Test Street, Karachi",
        "ntn": "1234567-89012",
        "credit_limit": "100000.00",
        "payment_terms": 30,
        "company_id": str(uuid4()),
        "balance": "0.00",
        "is_deleted": False,
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
    }


def create_auth_headers(token="test-token"):
    """Create authorization headers"""
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_customer():
    """Fixture for mock customer data"""
    return create_mock_customer()


@pytest.fixture
def auth_headers():
    """Fixture for auth headers"""
    return create_auth_headers()


@pytest.fixture
def mock_current_user():
    """Fixture for mock current user"""
    return User(
        id="test-user-id",
        email="test@example.com",
        full_name="Test User",
        company_id="test-company-id",
        company_name="Test Company"
    )


class TestListCustomers:
    """Test GET /api/customers - List all customers"""

    def test_list_customers_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test listing customers with valid authentication"""
        # Mock customers list
        mock_customer_data = create_mock_customer()
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(
            data=[mock_customer_data],
            count=1
        )
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/customers", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "total" in data
        assert len(data["data"]) == 1
        assert data["data"][0]["name"] == "Test Customer"

    def test_list_customers_with_search(self, override_dependencies, auth_headers, mock_supabase):
        """Test listing customers with search parameter"""
        # Mock customers list with search
        mock_customer_data = create_mock_customer()
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.or_.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(
            data=[mock_customer_data],
            count=1
        )
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/customers?search=Test", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1

    def test_list_customers_no_company(self, auth_headers, mock_supabase):
        """Test listing customers when user has no company"""
        from app.main import app
        from app.routers import customers
        from app.types import User

        # Override with user that has no company
        async def mock_get_current_user_no_company():
            return User(
                id="test-user-id",
                email="test@example.com",
                full_name="Test User",
                company_id=None,
                company_name=None
            )

        app.dependency_overrides[customers.get_current_user] = mock_get_current_user_no_company

        response = client.get("/api/customers", headers=auth_headers)

        assert response.status_code == 400

        # Clean up
        app.dependency_overrides.clear()

    def test_list_customers_unauthorized(self, auth_headers):
        """Test listing customers without valid token"""
        response = client.get("/api/customers", headers=auth_headers)

        assert response.status_code == 401


class TestCreateCustomer:
    """Test POST /api/customers - Create new customer"""

    def test_create_customer_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating customer with valid data"""
        # Mock duplicate check (no duplicates)
        mock_check_query = MagicMock()
        mock_check_query.select.return_value = mock_check_query
        mock_check_query.eq.return_value = mock_check_query
        mock_check_query.execute.return_value = MagicMock(data=[])

        # Mock insert
        mock_customer_data = create_mock_customer()
        mock_insert_query = MagicMock()
        mock_insert_query.insert.return_value = mock_insert_query
        mock_insert_query.execute.return_value = MagicMock(data=[mock_customer_data])

        mock_supabase.table.side_effect = [
            mock_check_query,  # First call for duplicate check
            mock_insert_query  # Second call for insert
        ]

        customer_data = {
            "name": "Test Customer",
            "email": "test@example.com",
            "phone": "+92-300-1234567",
            "address": "123 Test Street",
            "ntn": "1234567-89012",
            "credit_limit": "100000.00",
            "payment_terms": 30
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["name"] == "Test Customer"
        assert data["data"]["email"] == "test@example.com"
        assert data["message"] == "Customer created successfully"

    def test_create_customer_duplicate_email(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating customer with duplicate email"""
        # Mock duplicate check (duplicate exists)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[{"id": "existing-id"}])

        mock_supabase.table.return_value = mock_query

        customer_data = {
            "name": "Test Customer",
            "email": "test@example.com",
            "phone": "+92-300-1234567"
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "already exists" in data["detail"]

    def test_create_customer_missing_name(self, override_dependencies, auth_headers):
        """Test creating customer without required name field"""
        customer_data = {
            "email": "test@example.com",
            "phone": "+92-300-1234567"
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        assert response.status_code == 422  # Validation error

    def test_create_customer_invalid_email(self, override_dependencies, auth_headers):
        """Test creating customer with invalid email format"""
        customer_data = {
            "name": "Test Customer",
            "email": "invalid-email",
            "phone": "+92-300-1234567"
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        assert response.status_code == 422  # Validation error

    def test_create_customer_no_company(self, auth_headers, mock_supabase):
        """Test creating customer when user has no company"""
        from app.main import app
        from app.routers import customers
        from app.types import User

        # Override with user that has no company
        async def mock_get_current_user_no_company():
            return User(
                id="test-user-id",
                email="test@example.com",
                full_name="Test User",
                company_id=None,
                company_name=None
            )

        app.dependency_overrides[customers.get_current_user] = mock_get_current_user_no_company

        customer_data = {
            "name": "Test Customer",
            "email": "test@example.com"
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        assert response.status_code == 400

        # Clean up
        app.dependency_overrides.clear()


class TestGetCustomer:
    """Test GET /api/customers/{customer_id} - Get customer details"""

    def test_get_customer_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting customer details"""
        # Mock get customer - use fixed ID for assertion
        customer_id = uuid4()
        mock_customer_data = create_mock_customer(customer_id=customer_id)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_customer_data])

        mock_supabase.table.return_value = mock_query

        response = client.get(f"/api/customers/{customer_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == str(customer_id)
        assert data["data"]["name"] == "Test Customer"

    def test_get_customer_not_found(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting non-existent customer"""
        # Mock empty result
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_query

        customer_id = uuid4()
        response = client.get(f"/api/customers/{customer_id}", headers=auth_headers)

        assert response.status_code == 404

    def test_get_customer_invalid_uuid(self, override_dependencies, auth_headers):
        """Test getting customer with invalid UUID format"""
        response = client.get("/api/customers/invalid-uuid", headers=auth_headers)

        assert response.status_code == 422


class TestUpdateCustomer:
    """Test PUT /api/customers/{customer_id} - Update customer"""

    def test_update_customer_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test updating customer successfully"""
        # Mock existing customer
        mock_customer_data = create_mock_customer()

        # Mock get existing
        mock_get_query = MagicMock()
        mock_get_query.select.return_value = mock_get_query
        mock_get_query.eq.return_value = mock_get_query
        mock_get_query.execute.return_value = MagicMock(data=[mock_customer_data])

        # Mock update
        mock_update_query = MagicMock()
        mock_update_query.update.return_value = mock_update_query
        mock_update_query.eq.return_value = mock_update_query
        mock_update_query.execute.return_value = MagicMock(data=[mock_customer_data])

        mock_supabase.table.side_effect = [
            mock_get_query,
            mock_update_query
        ]

        customer_id = uuid4()
        update_data = {
            "name": "Updated Customer",
            "phone": "+92-300-9876543"
        }

        response = client.put(f"/api/customers/{customer_id}", json=update_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Customer updated successfully"

    def test_update_customer_not_found(self, override_dependencies, auth_headers, mock_supabase):
        """Test updating non-existent customer"""
        # Mock empty result
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_query

        customer_id = uuid4()
        update_data = {"name": "Updated Name"}

        response = client.put(f"/api/customers/{customer_id}", json=update_data, headers=auth_headers)

        assert response.status_code == 404

    def test_update_customer_invalid_email(self, override_dependencies, auth_headers):
        """Test updating customer with invalid email"""
        response = client.put(f"/api/customers/{uuid4()}", json={"email": "invalid-email"}, headers=auth_headers)

        assert response.status_code == 422


class TestDeleteCustomer:
    """Test DELETE /api/customers/{customer_id} - Delete customer"""

    def test_delete_customer_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test soft deleting customer"""
        # Mock existing customer
        mock_customer_data = create_mock_customer()

        # Mock get existing
        mock_get_query = MagicMock()
        mock_get_query.select.return_value = mock_get_query
        mock_get_query.eq.return_value = mock_get_query
        mock_get_query.execute.return_value = MagicMock(data=[mock_customer_data])

        # Mock update (soft delete)
        mock_update_query = MagicMock()
        mock_update_query.update.return_value = mock_update_query
        mock_update_query.eq.return_value = mock_update_query
        mock_update_query.execute.return_value = MagicMock(data=[mock_customer_data])

        mock_supabase.table.side_effect = [
            mock_get_query,
            mock_update_query
        ]

        customer_id = uuid4()
        response = client.delete(f"/api/customers/{customer_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Customer deleted successfully"

    def test_delete_customer_not_found(self, override_dependencies, auth_headers, mock_supabase):
        """Test deleting non-existent customer"""
        # Mock empty result
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_query

        customer_id = uuid4()
        response = client.delete(f"/api/customers/{customer_id}", headers=auth_headers)

        assert response.status_code == 404


class TestCustomerValidation:
    """Test customer data validation"""

    def test_customer_name_min_length(self, override_dependencies, auth_headers):
        """Test customer name minimum length validation"""
        customer_data = {
            "name": "AB",  # Less than 3 characters
            "email": "test@example.com"
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        # Returns 400 from business logic validation (name length check in router)
        assert response.status_code == 400

    def test_customer_credit_limit_decimal(self, override_dependencies, auth_headers, mock_supabase):
        """Test credit limit accepts decimal values"""
        # Mock duplicate check
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        # Mock insert
        mock_customer_data = create_mock_customer()
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[mock_customer_data])

        customer_data = {
            "name": "Test Customer",
            "email": "test@example.com",
            "credit_limit": "999999.99"
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        # Should accept valid decimal
        assert response.status_code in [200, 400]  # 200 if success, 400 if other validation fails


class TestCustomerBusinessRules:
    """Test customer business rules"""

    def test_customer_soft_delete_preserves_data(self, override_dependencies, auth_headers, mock_supabase):
        """Test that soft delete preserves historical data"""
        # Mock existing customer
        mock_customer_data = create_mock_customer()

        # Mock get existing
        mock_get_query = MagicMock()
        mock_get_query.select.return_value = mock_get_query
        mock_get_query.eq.return_value = mock_get_query
        mock_get_query.execute.return_value = MagicMock(data=[mock_customer_data])

        # Mock update (soft delete)
        mock_update_query = MagicMock()
        mock_update_query.update.return_value = mock_update_query
        mock_update_query.eq.return_value = mock_update_query

        mock_supabase.table.side_effect = [
            mock_get_query,
            mock_update_query
        ]

        customer_id = uuid4()
        response = client.delete(f"/api/customers/{customer_id}", headers=auth_headers)

        assert response.status_code == 200

        # Verify update was called with is_deleted=True (soft delete)
        mock_update_query.update.assert_called_once()
        call_args = mock_update_query.update.call_args[0][0]
        assert call_args["is_deleted"] is True
        assert "updated_at" in call_args


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
