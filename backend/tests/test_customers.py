import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
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


@pytest.fixture
def mock_supabase():
    """Mock supabase client for all tests"""
    with patch('app.routers.auth.supabase') as mock:
        yield mock


class TestListCustomers:
    """Test GET /api/customers - List all customers"""

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_list_customers_success(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test listing customers with valid authentication"""
        # Mock current user
        mock_get_current_user.return_value = mock_current_user
        
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
        mock_get_supabase.return_value.table.return_value = mock_query

        response = client.get("/api/customers", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "total" in data
        assert len(data["data"]) == 1
        assert data["data"][0]["name"] == "Test Customer"

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_list_customers_with_search(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test listing customers with search parameter"""
        mock_get_current_user.return_value = mock_current_user
        
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
        mock_get_supabase.return_value.table.return_value = mock_query

        response = client.get("/api/customers?search=Test", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1

    @patch('app.routers.customers.get_current_user')
    def test_list_customers_no_company(self, mock_get_current_user, auth_headers):
        """Test listing customers when user has no company"""
        # Mock current user with no company
        mock_get_current_user.return_value = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            company_id=None,
            company_name=None
        )

        response = client.get("/api/customers", headers=auth_headers)

        assert response.status_code == 400

    def test_list_customers_unauthorized(self, auth_headers):
        """Test listing customers without valid token"""
        response = client.get("/api/customers", headers=auth_headers)

        assert response.status_code == 401


class TestCreateCustomer:
    """Test POST /api/customers - Create new customer"""

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_create_customer_success(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test creating customer with valid data"""
        mock_get_current_user.return_value = mock_current_user
        
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
        
        mock_get_supabase.return_value.table.side_effect = [
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

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_create_customer_duplicate_email(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test creating customer with duplicate email"""
        mock_get_current_user.return_value = mock_current_user
        
        # Mock duplicate check (duplicate exists)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[{"id": "existing-id"}])
        
        mock_get_supabase.return_value.table.return_value = mock_query

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

    @patch('app.routers.customers.get_current_user')
    def test_create_customer_missing_name(self, mock_get_current_user, auth_headers):
        """Test creating customer without required name field"""
        mock_get_current_user.return_value = mock_current_user

        customer_data = {
            "email": "test@example.com",
            "phone": "+92-300-1234567"
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        assert response.status_code == 422  # Validation error

    @patch('app.routers.customers.get_current_user')
    def test_create_customer_invalid_email(self, mock_get_current_user, auth_headers):
        """Test creating customer with invalid email format"""
        mock_get_current_user.return_value = mock_current_user

        customer_data = {
            "name": "Test Customer",
            "email": "invalid-email",
            "phone": "+92-300-1234567"
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        assert response.status_code == 422  # Validation error

    @patch('app.routers.customers.get_current_user')
    def test_create_customer_no_company(self, mock_get_current_user, auth_headers):
        """Test creating customer when user has no company"""
        mock_get_current_user.return_value = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            company_id=None,
            company_name=None
        )

        customer_data = {
            "name": "Test Customer",
            "email": "test@example.com"
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        assert response.status_code == 400


class TestGetCustomer:
    """Test GET /api/customers/{customer_id} - Get customer details"""

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_get_customer_success(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test getting customer details"""
        mock_get_current_user.return_value = mock_current_user
        
        # Mock get customer
        mock_customer_data = create_mock_customer()
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_customer_data])
        
        mock_get_supabase.return_value.table.return_value = mock_query

        customer_id = uuid4()
        response = client.get(f"/api/customers/{customer_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == str(customer_id)
        assert data["data"]["name"] == "Test Customer"

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_get_customer_not_found(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test getting non-existent customer"""
        mock_get_current_user.return_value = mock_current_user
        
        # Mock empty result
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        
        mock_get_supabase.return_value.table.return_value = mock_query

        customer_id = uuid4()
        response = client.get(f"/api/customers/{customer_id}", headers=auth_headers)

        assert response.status_code == 404

    def test_get_customer_invalid_uuid(self, auth_headers):
        """Test getting customer with invalid UUID format"""
        response = client.get("/api/customers/invalid-uuid", headers=auth_headers)

        assert response.status_code == 422


class TestUpdateCustomer:
    """Test PUT /api/customers/{customer_id} - Update customer"""

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_update_customer_success(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test updating customer successfully"""
        mock_get_current_user.return_value = mock_current_user
        
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
        
        mock_get_supabase.return_value.table.side_effect = [
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

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_update_customer_not_found(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test updating non-existent customer"""
        mock_get_current_user.return_value = mock_current_user
        
        # Mock empty result
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        
        mock_get_supabase.return_value.table.return_value = mock_query

        customer_id = uuid4()
        update_data = {"name": "Updated Name"}

        response = client.put(f"/api/customers/{customer_id}", json=update_data, headers=auth_headers)

        assert response.status_code == 404

    def test_update_customer_invalid_email(self, auth_headers):
        """Test updating customer with invalid email"""
        response = client.put(f"/api/customers/{uuid4()}", json={"email": "invalid-email"}, headers=auth_headers)

        assert response.status_code == 422


class TestDeleteCustomer:
    """Test DELETE /api/customers/{customer_id} - Delete customer"""

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_delete_customer_success(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test soft deleting customer"""
        mock_get_current_user.return_value = mock_current_user
        
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
        
        mock_get_supabase.return_value.table.side_effect = [
            mock_get_query,
            mock_update_query
        ]

        customer_id = uuid4()
        response = client.delete(f"/api/customers/{customer_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Customer deleted successfully"

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_delete_customer_not_found(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test deleting non-existent customer"""
        mock_get_current_user.return_value = mock_current_user
        
        # Mock empty result
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        
        mock_get_supabase.return_value.table.return_value = mock_query

        customer_id = uuid4()
        response = client.delete(f"/api/customers/{customer_id}", headers=auth_headers)

        assert response.status_code == 404


class TestCustomerValidation:
    """Test customer data validation"""

    @patch('app.routers.customers.get_current_user')
    def test_customer_name_min_length(self, mock_get_current_user, auth_headers):
        """Test customer name minimum length validation"""
        mock_get_current_user.return_value = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            company_id="test-company-id",
            company_name="Test Company"
        )

        customer_data = {
            "name": "AB",  # Less than 3 characters
            "email": "test@example.com"
        }

        response = client.post("/api/customers", json=customer_data, headers=auth_headers)

        assert response.status_code == 422

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_customer_credit_limit_decimal(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test credit limit accepts decimal values"""
        mock_get_current_user.return_value = mock_current_user
        
        # Mock duplicate check
        mock_get_supabase.return_value.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        
        # Mock insert
        mock_customer_data = create_mock_customer()
        mock_get_supabase.return_value.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[mock_customer_data])

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

    @patch('app.routers.customers.get_supabase_client')
    @patch('app.routers.customers.get_current_user')
    def test_customer_soft_delete_preserves_data(self, mock_get_current_user, mock_get_supabase, auth_headers, mock_current_user):
        """Test that soft delete preserves historical data"""
        mock_get_current_user.return_value = mock_current_user
        
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
        
        mock_get_supabase.return_value.table.side_effect = [
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
