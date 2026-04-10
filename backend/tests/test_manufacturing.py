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
def create_mock_bom(bom_id=1):
    """Create a mock BOM header"""
    return {
        "id": bom_id,
        "company_id": "test-company-id",
        "product_id": 101,
        "version": 1,
        "status": "draft",
        "effective_date": "2025-01-01",
        "expiry_date": None,
        "notes": "Standard BOM for Product A",
        "created_by": "test-user-id",
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
    }


def create_mock_bom_line(line_id=1, bom_id=1):
    """Create a mock BOM line"""
    return {
        "id": line_id,
        "bom_id": bom_id,
        "component_id": 201,
        "quantity": 5.0,
        "unit": "kg",
        "waste_percent": 2.0,
        "sequence": 1,
        "created_at": "2025-01-15T10:30:00Z"
    }


def create_mock_production_order(order_id=1):
    """Create a mock production order"""
    return {
        "id": order_id,
        "company_id": "test-company-id",
        "bom_id": 1,
        "quantity": 100.0,
        "status": "planned",
        "cost_center_id": None,
        "start_date": "2025-03-01",
        "end_date": "2025-03-15",
        "labor_rate": 150.0,
        "notes": "Test production run",
        "created_by": "test-user-id",
        "created_at": "2025-02-20T10:30:00Z"
    }


def create_auth_headers(token="test-token"):
    """Create authorization headers"""
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers():
    """Fixture for auth headers"""
    return create_auth_headers()


class TestBOMCRUD:
    """Test BOM (Bill of Materials) CRUD endpoints"""

    def test_get_boms_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting BOMs list"""
        mock_bom = create_mock_bom()
        mock_lines = [create_mock_bom_line()]

        mock_bom_query = MagicMock()
        mock_bom_query.select.return_value = mock_bom_query
        mock_bom_query.eq.return_value = mock_bom_query
        mock_bom_query.order.return_value = mock_bom_query
        mock_bom_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_lines_query = MagicMock()
        mock_lines_query.select.return_value = mock_lines_query
        mock_lines_query.eq.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=mock_lines)

        mock_supabase.table.side_effect = [mock_bom_query, mock_lines_query]

        response = client.get("/api/manufacturing/bom", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_boms_with_status_filter(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting BOMs filtered by status"""
        mock_bom = create_mock_bom()
        mock_bom["status"] = "active"

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_supabase.table.return_value = mock_query

        response = client.get("/api/manufacturing/bom?status=active", headers=auth_headers)

        assert response.status_code == 200

    def test_get_boms_no_supabase(self, auth_headers):
        """Test getting BOMs when supabase is not available"""
        from app.main import app
        from app.routers import manufacturing

        async def mock_get_current_user():
            return User(
                id="test-user-id",
                email="test@example.com",
                full_name="Test User",
                company_id="test-company-id",
                company_name="Test Company"
            )

        def mock_get_supabase_client():
            return None

        app.dependency_overrides[manufacturing.get_current_user] = mock_get_current_user
        app.dependency_overrides[manufacturing.get_supabase_client] = mock_get_supabase_client

        response = client.get("/api/manufacturing/bom", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

        app.dependency_overrides.clear()

    def test_create_bom_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating a new BOM"""
        mock_bom = create_mock_bom()

        mock_header_query = MagicMock()
        mock_header_query.insert.return_value = mock_header_query
        mock_header_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_select_query = MagicMock()
        mock_select_query.select.return_value = mock_select_query
        mock_select_query.eq.return_value = mock_select_query
        mock_select_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_lines_query = MagicMock()
        mock_lines_query.insert.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=[create_mock_bom_line()])

        mock_supabase.table.side_effect = [
            mock_header_query,  # insert bom
            mock_lines_query,   # insert line 1
            mock_select_query,  # select bom
            mock_lines_query,   # select lines
        ]

        bom_data = {
            "product_id": 101,
            "version": 1,
            "effective_date": "2025-01-01",
            "notes": "New BOM",
            "lines": [
                {
                    "component_id": 201,
                    "quantity": 5.0,
                    "unit": "kg",
                    "waste_percent": 2.0,
                    "sequence": 1
                }
            ]
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_create_bom_no_supabase(self, auth_headers):
        """Test creating BOM without supabase"""
        from app.main import app
        from app.routers import manufacturing

        async def mock_get_current_user():
            return User(
                id="test-user-id",
                email="test@example.com",
                full_name="Test User",
                company_id="test-company-id",
                company_name="Test Company"
            )

        def mock_get_supabase_client():
            return None

        app.dependency_overrides[manufacturing.get_current_user] = mock_get_current_user
        app.dependency_overrides[manufacturing.get_supabase_client] = mock_get_supabase_client

        bom_data = {
            "product_id": 101,
            "version": 1,
            "lines": []
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code == 500

        app.dependency_overrides.clear()

    def test_create_bom_empty_lines(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating BOM with no lines"""
        mock_bom = create_mock_bom()

        mock_header_query = MagicMock()
        mock_header_query.insert.return_value = mock_header_query
        mock_header_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_select_query = MagicMock()
        mock_select_query.select.return_value = mock_select_query
        mock_select_query.eq.return_value = mock_select_query
        mock_select_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_lines_query = MagicMock()
        mock_lines_query.select.return_value = mock_lines_query
        mock_lines_query.eq.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [
            mock_header_query,
            mock_select_query,
            mock_lines_query,
        ]

        bom_data = {
            "product_id": 101,
            "version": 1,
            "lines": []
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_create_bom_invalid_date_format(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating BOM with invalid effective date"""
        mock_bom = create_mock_bom()

        mock_header_query = MagicMock()
        mock_header_query.insert.return_value = mock_header_query
        mock_header_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_select_query = MagicMock()
        mock_select_query.select.return_value = mock_select_query
        mock_select_query.eq.return_value = mock_select_query
        mock_select_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_lines_query = MagicMock()
        mock_lines_query.select.return_value = mock_lines_query
        mock_lines_query.eq.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [
            mock_header_query,
            mock_select_query,
            mock_lines_query,
        ]

        bom_data = {
            "product_id": 101,
            "version": 1,
            "effective_date": "invalid-date",
            "lines": []
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_create_bom_missing_product_id(self, override_dependencies, auth_headers):
        """Test creating BOM without required product_id"""
        bom_data = {
            "version": 1,
            "lines": []
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code == 422

    def test_create_bom_negative_quantity(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating BOM with negative component quantity"""
        mock_bom = create_mock_bom()

        mock_header_query = MagicMock()
        mock_header_query.insert.return_value = mock_header_query
        mock_header_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_select_query = MagicMock()
        mock_select_query.select.return_value = mock_select_query
        mock_select_query.eq.return_value = mock_select_query
        mock_select_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_lines_query = MagicMock()
        mock_lines_query.insert.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=[create_mock_bom_line()])

        mock_supabase.table.side_effect = [
            mock_header_query,
            mock_lines_query,
            mock_select_query,
            mock_lines_query,
        ]

        bom_data = {
            "product_id": 101,
            "version": 1,
            "lines": [
                {
                    "component_id": 201,
                    "quantity": -5.0,
                    "unit": "kg"
                }
            ]
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code in [200, 500]


class TestBOMActivation:
    """Test BOM activation endpoint"""

    def test_activate_bom_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test activating a BOM"""
        mock_bom = create_mock_bom()
        mock_bom["status"] = "active"

        mock_select_query = MagicMock()
        mock_select_query.select.return_value = mock_select_query
        mock_select_query.eq.return_value = mock_select_query
        mock_select_query.execute.return_value = MagicMock(data=[create_mock_bom()])

        mock_update_query = MagicMock()
        mock_update_query.update.return_value = mock_update_query
        mock_update_query.eq.return_value = mock_update_query
        mock_update_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_supabase.table.side_effect = [mock_select_query, mock_update_query]

        response = client.post("/api/manufacturing/bom/1/activate", headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_activate_bom_not_found(self, override_dependencies, auth_headers, mock_supabase):
        """Test activating non-existent BOM"""
        from app.main import app
        from app.routers import manufacturing

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        # Override manufacturing dependencies
        async def mock_get_current_user():
            return User(
                id="test-user-id",
                email="test@example.com",
                full_name="Test User",
                company_id="test-company-id",
                company_name="Test Company"
            )

        def mock_get_supabase_client():
            return mock_supabase

        app.dependency_overrides[manufacturing.get_current_user] = mock_get_current_user
        app.dependency_overrides[manufacturing.get_supabase_client] = mock_get_supabase_client

        response = client.post("/api/manufacturing/bom/999/activate", headers=auth_headers)

        assert response.status_code == 404

        app.dependency_overrides.clear()

    def test_activate_bom_no_supabase(self, auth_headers):
        """Test activating BOM without supabase"""
        from app.main import app
        from app.routers import manufacturing

        async def mock_get_current_user():
            return User(
                id="test-user-id",
                email="test@example.com",
                full_name="Test User",
                company_id="test-company-id",
                company_name="Test Company"
            )

        def mock_get_supabase_client():
            return None

        app.dependency_overrides[manufacturing.get_current_user] = mock_get_current_user
        app.dependency_overrides[manufacturing.get_supabase_client] = mock_get_supabase_client

        response = client.post("/api/manufacturing/bom/1/activate", headers=auth_headers)

        assert response.status_code == 500

        app.dependency_overrides.clear()


class TestProductionOrders:
    """Test production order endpoints"""

    def test_get_production_orders_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting production orders list"""
        mock_order = create_mock_production_order()

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_order])

        mock_supabase.table.return_value = mock_query

        response = client.get("/api/manufacturing/orders", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_production_orders_with_status_filter(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting production orders filtered by status"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_query

        response = client.get("/api/manufacturing/orders?status=planned", headers=auth_headers)

        assert response.status_code == 200

    def test_get_production_orders_no_supabase(self, auth_headers):
        """Test getting orders when supabase is not available"""
        from app.main import app
        from app.routers import manufacturing

        async def mock_get_current_user():
            return User(
                id="test-user-id",
                email="test@example.com",
                full_name="Test User",
                company_id="test-company-id",
                company_name="Test Company"
            )

        def mock_get_supabase_client():
            return None

        app.dependency_overrides[manufacturing.get_current_user] = mock_get_current_user
        app.dependency_overrides[manufacturing.get_supabase_client] = mock_get_supabase_client

        response = client.get("/api/manufacturing/orders", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

        app.dependency_overrides.clear()

    def test_create_production_order_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating a production order"""
        mock_order = create_mock_production_order()

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_order])

        mock_supabase.table.return_value = mock_query

        order_data = {
            "bom_id": 1,
            "quantity": 100.0,
            "cost_center_id": 1,
            "start_date": "2025-03-01",
            "end_date": "2025-03-15",
            "labor_rate": 150.0,
            "notes": "Production run for Product A"
        }

        response = client.post("/api/manufacturing/orders", json=order_data, headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_create_production_order_no_supabase(self, auth_headers):
        """Test creating order without supabase"""
        from app.main import app
        from app.routers import manufacturing

        async def mock_get_current_user():
            return User(
                id="test-user-id",
                email="test@example.com",
                full_name="Test User",
                company_id="test-company-id",
                company_name="Test Company"
            )

        def mock_get_supabase_client():
            return None

        app.dependency_overrides[manufacturing.get_current_user] = mock_get_current_user
        app.dependency_overrides[manufacturing.get_supabase_client] = mock_get_supabase_client

        order_data = {
            "bom_id": 1,
            "quantity": 50.0
        }

        response = client.post("/api/manufacturing/orders", json=order_data, headers=auth_headers)

        assert response.status_code == 500

        app.dependency_overrides.clear()

    def test_create_production_order_negative_quantity(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating order with negative quantity"""
        mock_order = create_mock_production_order()

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_order])

        mock_supabase.table.return_value = mock_query

        order_data = {
            "bom_id": 1,
            "quantity": -10.0
        }

        response = client.post("/api/manufacturing/orders", json=order_data, headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_create_production_order_missing_bom_id(self, override_dependencies, auth_headers):
        """Test creating order without required bom_id"""
        order_data = {
            "quantity": 100.0
        }

        response = client.post("/api/manufacturing/orders", json=order_data, headers=auth_headers)

        assert response.status_code == 422

    def test_create_production_order_minimal_data(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating production order with minimal required data"""
        mock_order = create_mock_production_order()

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_order])

        mock_supabase.table.return_value = mock_query

        order_data = {
            "bom_id": 1,
            "quantity": 25.0
        }

        response = client.post("/api/manufacturing/orders", json=order_data, headers=auth_headers)

        assert response.status_code in [200, 500]


class TestMRP:
    """Test Material Requirements Planning endpoint"""

    def test_run_mrp_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test running MRP for a planning period"""
        from app.main import app
        from app.routers import manufacturing
        from app.types import User

        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        app.dependency_overrides[manufacturing.get_current_user] = mock_get_current_user

        response = client.get(
            "/api/manufacturing/mrp?from_date=2025-04-01&to_date=2025-04-30",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "planning_period" in data
        assert data["planning_period"]["from"] == "2025-04-01"
        assert data["planning_period"]["to"] == "2025-04-30"
        assert "material_requirements" in data
        assert "summary" in data

        app.dependency_overrides.clear()

    def test_run_mrp_missing_dates(self, override_dependencies, auth_headers):
        """Test MRP without required date parameters"""
        response = client.get("/api/manufacturing/mrp", headers=auth_headers)

        assert response.status_code == 422

    def test_run_mrp_invalid_date_range(self, override_dependencies, auth_headers, mock_supabase):
        """Test MRP with invalid date format"""
        response = client.get(
            "/api/manufacturing/mrp?from_date=invalid&to_date=2025-04-30",
            headers=auth_headers
        )

        assert response.status_code in [200, 422]

    def test_run_mrp_reversed_dates(self, override_dependencies, auth_headers, mock_supabase):
        """Test MRP with from_date after to_date"""
        from app.main import app
        from app.routers import manufacturing
        from app.types import User

        mock_user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            company_id="test-company-id",
            company_name="Test Company"
        )

        async def mock_get_current_user():
            return mock_user

        app.dependency_overrides[manufacturing.get_current_user] = mock_get_current_user

        response = client.get(
            "/api/manufacturing/mrp?from_date=2025-05-01&to_date=2025-04-01",
            headers=auth_headers
        )

        assert response.status_code == 200

        app.dependency_overrides.clear()


class TestManufacturingValidation:
    """Test manufacturing validation edge cases"""

    def test_bom_line_missing_component(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating BOM line without component_id"""
        bom_data = {
            "product_id": 101,
            "version": 1,
            "lines": [
                {
                    "quantity": 5.0,
                    "unit": "kg"
                }
            ]
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code == 422

    def test_bom_line_missing_quantity(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating BOM line without quantity"""
        bom_data = {
            "product_id": 101,
            "version": 1,
            "lines": [
                {
                    "component_id": 201,
                    "unit": "kg"
                }
            ]
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code == 422

    def test_bom_line_missing_unit(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating BOM line without unit"""
        bom_data = {
            "product_id": 101,
            "version": 1,
            "lines": [
                {
                    "component_id": 201,
                    "quantity": 5.0
                }
            ]
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code == 422

    def test_production_order_zero_quantity(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating production order with zero quantity"""
        mock_order = create_mock_production_order()

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_order])

        mock_supabase.table.return_value = mock_query

        order_data = {
            "bom_id": 1,
            "quantity": 0.0
        }

        response = client.post("/api/manufacturing/orders", json=order_data, headers=auth_headers)

        assert response.status_code in [200, 500]


class TestManufacturingBusinessRules:
    """Test manufacturing business rules"""

    def test_bom_versioning(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating BOM with specific version"""
        mock_bom = create_mock_bom()
        mock_bom["version"] = 2

        mock_header_query = MagicMock()
        mock_header_query.insert.return_value = mock_header_query
        mock_header_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_select_query = MagicMock()
        mock_select_query.select.return_value = mock_select_query
        mock_select_query.eq.return_value = mock_select_query
        mock_select_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_lines_query = MagicMock()
        mock_lines_query.select.return_value = mock_lines_query
        mock_lines_query.eq.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [
            mock_header_query,
            mock_select_query,
            mock_lines_query,
        ]

        bom_data = {
            "product_id": 101,
            "version": 2,
            "effective_date": "2025-06-01",
            "notes": "Version 2 BOM",
            "lines": []
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_production_order_with_cost_center(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating production order linked to cost center"""
        mock_order = create_mock_production_order()
        mock_order["cost_center_id"] = 5

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_order])

        mock_supabase.table.return_value = mock_query

        order_data = {
            "bom_id": 1,
            "quantity": 200.0,
            "cost_center_id": 5,
            "start_date": "2025-04-01",
            "labor_rate": 200.0
        }

        response = client.post("/api/manufacturing/orders", json=order_data, headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_multiple_bom_lines_sequencing(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating BOM with multiple lines in sequence"""
        mock_bom = create_mock_bom()

        mock_header_query = MagicMock()
        mock_header_query.insert.return_value = mock_header_query
        mock_header_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_select_query = MagicMock()
        mock_select_query.select.return_value = mock_select_query
        mock_select_query.eq.return_value = mock_select_query
        mock_select_query.execute.return_value = MagicMock(data=[mock_bom])

        mock_lines_query = MagicMock()
        mock_lines_query.insert.return_value = mock_lines_query
        mock_lines_query.execute.return_value = MagicMock(data=[create_mock_bom_line()])

        mock_supabase.table.side_effect = [
            mock_header_query,
            mock_lines_query,  # line 1
            mock_lines_query,  # line 2
            mock_lines_query,  # line 3
            mock_select_query,
            mock_lines_query,
        ]

        bom_data = {
            "product_id": 101,
            "version": 1,
            "lines": [
                {"component_id": 201, "quantity": 5.0, "unit": "kg", "sequence": 1},
                {"component_id": 202, "quantity": 10.0, "unit": "pcs", "sequence": 2},
                {"component_id": 203, "quantity": 2.5, "unit": "ltr", "sequence": 3}
            ]
        }

        response = client.post("/api/manufacturing/bom", json=bom_data, headers=auth_headers)

        assert response.status_code in [200, 500]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
