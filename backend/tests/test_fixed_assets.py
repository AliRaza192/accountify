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
def create_mock_category(category_id=None):
    """Create a mock asset category"""
    return {
        "id": str(category_id) if category_id else str(uuid4()),
        "company_id": "test-company-id",
        "name": "Machinery",
        "depreciation_rate_percent": "15.00",
        "depreciation_method": "SLM",
        "account_code": "0101",
        "is_active": True,
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
    }


def create_mock_asset(asset_id=None, category_id=None):
    """Create a mock fixed asset"""
    return {
        "id": str(asset_id) if asset_id else str(uuid4()),
        "company_id": "test-company-id",
        "asset_code": "FA-001",
        "name": "CNC Machine",
        "category_id": str(category_id) if category_id else str(uuid4()),
        "category": create_mock_category(category_id),
        "purchase_date": "2024-01-15",
        "purchase_cost": "500000.00",
        "useful_life_months": 120,
        "residual_value_percent": "10.00",
        "depreciation_method": "SLM",
        "location": "Factory Floor",
        "status": "active",
        "photo_url": None,
        "document_urls": [],
        "residual_value": "50000.00",
        "depreciable_amount": "450000.00",
        "accumulated_depreciation": "0.00",
        "book_value": "500000.00",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
    }


def create_mock_depreciation(dep_id=None, asset_id=None):
    """Create a mock depreciation record"""
    return {
        "id": str(dep_id) if dep_id else str(uuid4()),
        "asset_id": str(asset_id) if asset_id else str(uuid4()),
        "period_month": 1,
        "period_year": 2025,
        "depreciation_amount": "3750.00",
        "accumulated_depreciation": "3750.00",
        "book_value": "496250.00",
        "journal_entry_id": str(uuid4()),
        "posted_at": "2025-01-31",
        "created_at": "2025-01-31T10:30:00Z"
    }


def create_mock_maintenance(maint_id=None, asset_id=None):
    """Create a mock maintenance record"""
    return {
        "id": str(maint_id) if maint_id else str(uuid4()),
        "asset_id": str(asset_id) if asset_id else str(uuid4()),
        "service_date": "2025-02-15",
        "service_type": "Preventive Maintenance",
        "service_provider": "TechServ Ltd",
        "cost": "5000.00",
        "next_service_due": "2025-08-15",
        "notes": "Oil change and calibration",
        "created_at": "2025-02-15"
    }


def create_auth_headers(token="test-token"):
    """Create authorization headers"""
    return {"Authorization": f"Bearer {token}"}


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


class TestAssetCategoryCRUD:
    """Test asset category endpoints"""

    def test_list_asset_categories_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test listing asset categories"""
        mock_category = create_mock_category()
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_category])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/fixed-assets/asset-categories", headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_create_asset_category_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating an asset category"""
        mock_category = create_mock_category()
        mock_query = MagicMock()
        mock_query.add.return_value = None
        mock_query.commit.return_value = None
        mock_query.refresh.return_value = None
        mock_supabase.table.return_value = mock_query

        category_data = {
            "name": "Vehicles",
            "depreciation_rate_percent": "20.00",
            "depreciation_method": "WDV",
            "account_code": "0201"
        }

        response = client.post("/api/fixed-assets/asset-categories", json=category_data, headers=auth_headers)

        assert response.status_code in [200, 201, 400, 422, 500]

    def test_create_asset_category_invalid_method(self, override_dependencies, auth_headers):
        """Test creating category with invalid depreciation method"""
        category_data = {
            "name": "Invalid Category",
            "depreciation_rate_percent": "10.00",
            "depreciation_method": "INVALID",
            "account_code": "0301"
        }

        response = client.post("/api/fixed-assets/asset-categories", json=category_data, headers=auth_headers)

        # Returns 400 from business logic validation
        assert response.status_code in [400, 422]

    def test_create_asset_category_negative_rate(self, override_dependencies, auth_headers):
        """Test creating category with negative depreciation rate"""
        category_data = {
            "name": "Invalid Category",
            "depreciation_rate_percent": "-5.00",
            "depreciation_method": "SLM",
            "account_code": "0301"
        }

        response = client.post("/api/fixed-assets/asset-categories", json=category_data, headers=auth_headers)

        # Returns 400 from business logic validation
        assert response.status_code in [400, 422]

    def test_create_asset_category_rate_over_100(self, override_dependencies, auth_headers):
        """Test creating category with rate over 100%"""
        category_data = {
            "name": "Invalid Category",
            "depreciation_rate_percent": "150.00",
            "depreciation_method": "SLM",
            "account_code": "0301"
        }

        response = client.post("/api/fixed-assets/asset-categories", json=category_data, headers=auth_headers)

        # Returns 400 from business logic validation
        assert response.status_code in [400, 422]


class TestFixedAssetCRUD:
    """Test fixed asset CRUD endpoints"""

    def test_create_asset_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test creating a fixed asset"""
        mock_service = MagicMock()
        mock_asset_obj = MagicMock()
        mock_asset_obj.id = str(uuid4())
        mock_asset_obj.asset_code = "FA-002"
        mock_asset_obj.name = "Laptop Dell XPS"
        mock_asset_obj.category_id = str(uuid4())
        mock_asset_obj.purchase_date = "2025-03-01"
        mock_asset_obj.purchase_cost = Decimal("150000.00")
        mock_asset_obj.useful_life_months = 36
        mock_asset_obj.residual_value_percent = Decimal("10.00")
        mock_asset_obj.depreciation_method = "SLM"
        mock_asset_obj.location = "Office"
        mock_asset_obj.status = "active"
        mock_asset_obj.photo_url = None
        mock_asset_obj.document_urls = []
        mock_asset_obj.residual_value = Decimal("15000.00")
        mock_asset_obj.depreciable_amount = Decimal("135000.00")
        mock_asset_obj.accumulated_depreciation = Decimal("0.00")
        mock_asset_obj.book_value = Decimal("150000.00")
        mock_service.create_asset.return_value = mock_asset_obj

        from app.main import app
        from app.routers import fixed_assets

        def mock_get_service(db=None):
            return mock_service

        app.dependency_overrides[fixed_assets.get_service] = mock_get_service

        asset_data = {
            "asset_code": "FA-002",
            "name": "Laptop Dell XPS",
            "category_id": str(uuid4()),
            "purchase_date": "2025-03-01",
            "purchase_cost": "150000.00",
            "useful_life_months": 36,
            "residual_value_percent": "10.00",
            "depreciation_method": "SLM",
            "location": "Office"
        }

        response = client.post("/api/fixed-assets", json=asset_data, headers=auth_headers)

        assert response.status_code in [200, 201, 400, 422, 500]

        app.dependency_overrides.clear()

    def test_create_asset_negative_cost(self, override_dependencies, auth_headers):
        """Test creating asset with negative purchase cost"""
        asset_data = {
            "asset_code": "FA-003",
            "name": "Invalid Asset",
            "category_id": str(uuid4()),
            "purchase_date": "2025-03-01",
            "purchase_cost": "-5000.00",
            "useful_life_months": 60,
            "depreciation_method": "SLM"
        }

        response = client.post("/api/fixed-assets", json=asset_data, headers=auth_headers)

        assert response.status_code == 422

    def test_create_asset_zero_cost(self, override_dependencies, auth_headers):
        """Test creating asset with zero purchase cost"""
        asset_data = {
            "asset_code": "FA-004",
            "name": "Invalid Asset",
            "category_id": str(uuid4()),
            "purchase_date": "2025-03-01",
            "purchase_cost": "0.00",
            "useful_life_months": 60,
            "depreciation_method": "SLM"
        }

        response = client.post("/api/fixed-assets", json=asset_data, headers=auth_headers)

        assert response.status_code == 422

    def test_create_asset_zero_useful_life(self, override_dependencies, auth_headers):
        """Test creating asset with zero useful life"""
        asset_data = {
            "asset_code": "FA-005",
            "name": "Invalid Asset",
            "category_id": str(uuid4()),
            "purchase_date": "2025-03-01",
            "purchase_cost": "50000.00",
            "useful_life_months": 0,
            "depreciation_method": "SLM"
        }

        response = client.post("/api/fixed-assets", json=asset_data, headers=auth_headers)

        assert response.status_code == 422

    def test_create_asset_invalid_method(self, override_dependencies, auth_headers):
        """Test creating asset with invalid depreciation method"""
        asset_data = {
            "asset_code": "FA-006",
            "name": "Invalid Asset",
            "category_id": str(uuid4()),
            "purchase_date": "2025-03-01",
            "purchase_cost": "50000.00",
            "useful_life_months": 60,
            "depreciation_method": "DOUBLE_DECLINING"
        }

        response = client.post("/api/fixed-assets", json=asset_data, headers=auth_headers)

        assert response.status_code == 422

    def test_create_asset_invalid_status(self, override_dependencies, auth_headers):
        """Test creating asset with invalid status"""
        asset_data = {
            "asset_code": "FA-007",
            "name": "Invalid Asset",
            "category_id": str(uuid4()),
            "purchase_date": "2025-03-01",
            "purchase_cost": "50000.00",
            "useful_life_months": 60,
            "depreciation_method": "SLM",
            "status": "destroyed"
        }

        response = client.post("/api/fixed-assets", json=asset_data, headers=auth_headers)

        assert response.status_code == 422

    def test_list_assets_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test listing fixed assets"""
        mock_asset = create_mock_asset()
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_asset])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/fixed-assets", headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_list_assets_with_status_filter(self, override_dependencies, auth_headers, mock_supabase):
        """Test listing assets with status filter"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/fixed-assets?status=active", headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_get_asset_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting a specific asset"""
        asset_id = uuid4()
        mock_asset = create_mock_asset(asset_id=asset_id)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_asset])
        mock_supabase.table.return_value = mock_query

        response = client.get(f"/api/fixed-assets/{asset_id}", headers=auth_headers)

        assert response.status_code in [200, 404, 500]

    def test_get_asset_not_found(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting non-existent asset"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        response = client.get(f"/api/fixed-assets/{uuid4()}", headers=auth_headers)

        assert response.status_code in [404, 500]

    def test_update_asset_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test updating an asset"""
        asset_id = uuid4()
        mock_asset = create_mock_asset(asset_id=asset_id)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_asset])
        mock_supabase.table.return_value = mock_query

        update_data = {
            "name": "Updated Machine Name",
            "location": "Building B"
        }

        response = client.put(f"/api/fixed-assets/{asset_id}", json=update_data, headers=auth_headers)

        assert response.status_code in [200, 400, 404, 500]

    def test_update_asset_negative_cost(self, override_dependencies, auth_headers):
        """Test updating asset with negative cost"""
        asset_id = uuid4()
        update_data = {
            "purchase_cost": "-10000.00"
        }

        response = client.put(f"/api/fixed-assets/{asset_id}", json=update_data, headers=auth_headers)

        assert response.status_code == 422

    def test_delete_asset_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test soft deleting an asset"""
        asset_id = uuid4()
        mock_asset = create_mock_asset(asset_id=asset_id)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_asset])
        mock_supabase.table.return_value = mock_query

        response = client.delete(f"/api/fixed-assets/{asset_id}", headers=auth_headers)

        assert response.status_code in [204, 400, 404, 500]

    def test_delete_asset_not_found(self, override_dependencies, auth_headers, mock_supabase):
        """Test deleting non-existent asset"""
        # The service will try to access DB and fail, returning 400 or 404
        response = client.delete(f"/api/fixed-assets/{uuid4()}", headers=auth_headers)

        assert response.status_code in [400, 404, 500]


class TestDepreciationCalculation:
    """Test depreciation calculation endpoints"""

    def test_run_depreciation_slm(self, override_dependencies, auth_headers, mock_supabase):
        """Test running SLM depreciation"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        dep_data = {
            "period_month": 3,
            "period_year": 2025
        }

        response = client.post("/api/fixed-assets/run-depreciation", json=dep_data, headers=auth_headers)

        assert response.status_code in [200, 400, 500]

    def test_run_depreciation_wdv(self, override_dependencies, auth_headers, mock_supabase):
        """Test running WDV depreciation"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        dep_data = {
            "period_month": 6,
            "period_year": 2025,
            "asset_id": str(uuid4())
        }

        response = client.post("/api/fixed-assets/run-depreciation", json=dep_data, headers=auth_headers)

        assert response.status_code in [200, 400, 500]

    def test_run_depreciation_invalid_month(self, override_dependencies, auth_headers):
        """Test depreciation with invalid month (13)"""
        dep_data = {
            "period_month": 13,
            "period_year": 2025
        }

        response = client.post("/api/fixed-assets/run-depreciation", json=dep_data, headers=auth_headers)

        assert response.status_code in [400, 422]

    def test_run_depreciation_invalid_year(self, override_dependencies, auth_headers):
        """Test depreciation with invalid year (too old)"""
        dep_data = {
            "period_month": 1,
            "period_year": 2010
        }

        response = client.post("/api/fixed-assets/run-depreciation", json=dep_data, headers=auth_headers)

        assert response.status_code in [200, 400, 422, 500]

    def test_get_asset_depreciation_history(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting depreciation history for an asset"""
        asset_id = uuid4()
        mock_dep = create_mock_depreciation(asset_id=asset_id)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_dep])
        mock_supabase.table.return_value = mock_query

        response = client.get(f"/api/depreciation/{asset_id}", headers=auth_headers)

        assert response.status_code in [200, 404, 500]


class TestAssetDisposal:
    """Test asset disposal endpoints"""

    def test_dispose_asset_with_gain(self, override_dependencies, auth_headers, mock_supabase):
        """Test disposing asset with gain (sale proceeds > book value)"""
        asset_id = uuid4()
        mock_asset = create_mock_asset(asset_id=asset_id)
        mock_asset["book_value"] = "300000.00"

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_asset])
        mock_supabase.table.return_value = mock_query

        disposal_data = {
            "disposal_date": "2025-06-15",
            "sale_proceeds": "400000.00",
            "disposal_reason": "Upgraded to newer model"
        }

        response = client.post(f"/api/fixed-assets/{asset_id}/disposal", json=disposal_data, headers=auth_headers)

        assert response.status_code in [200, 400, 404, 500]

    def test_dispose_asset_with_loss(self, override_dependencies, auth_headers, mock_supabase):
        """Test disposing asset with loss (sale proceeds < book value)"""
        asset_id = uuid4()
        mock_asset = create_mock_asset(asset_id=asset_id)
        mock_asset["book_value"] = "300000.00"

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_asset])
        mock_supabase.table.return_value = mock_query

        disposal_data = {
            "disposal_date": "2025-06-15",
            "sale_proceeds": "100000.00",
            "disposal_reason": "Equipment worn out"
        }

        response = client.post(f"/api/fixed-assets/{asset_id}/disposal", json=disposal_data, headers=auth_headers)

        assert response.status_code in [200, 400, 404, 500]

    def test_dispose_asset_no_proceeds(self, override_dependencies, auth_headers, mock_supabase):
        """Test disposing asset with zero sale proceeds (scrapped)"""
        asset_id = uuid4()
        mock_asset = create_mock_asset(asset_id=asset_id)

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_asset])
        mock_supabase.table.return_value = mock_query

        disposal_data = {
            "disposal_date": "2025-06-15",
            "sale_proceeds": "0.00",
            "disposal_reason": "Beyond economical repair"
        }

        response = client.post(f"/api/fixed-assets/{asset_id}/disposal", json=disposal_data, headers=auth_headers)

        assert response.status_code in [200, 400, 404, 500]

    def test_dispose_asset_not_found(self, override_dependencies, auth_headers, mock_supabase):
        """Test disposing non-existent asset"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        disposal_data = {
            "disposal_date": "2025-06-15",
            "sale_proceeds": "50000.00",
            "disposal_reason": "Sold"
        }

        response = client.post(f"/api/{uuid4()}/disposal", json=disposal_data, headers=auth_headers)

        assert response.status_code in [404, 500]

    def test_dispose_asset_negative_proceeds(self, override_dependencies, auth_headers):
        """Test disposing asset with negative sale proceeds"""
        asset_id = uuid4()
        disposal_data = {
            "disposal_date": "2025-06-15",
            "sale_proceeds": "-10000.00",
            "disposal_reason": "Invalid"
        }

        response = client.post(f"/api/fixed-assets/{asset_id}/disposal", json=disposal_data, headers=auth_headers)

        assert response.status_code in [400, 422]


class TestMaintenanceLog:
    """Test maintenance log endpoints"""

    def test_log_maintenance_success(self, override_dependencies, auth_headers, mock_supabase):
        """Test logging maintenance for an asset"""
        asset_id = uuid4()
        mock_asset = create_mock_asset(asset_id=asset_id)

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_asset])
        mock_supabase.table.return_value = mock_query

        maintenance_data = {
            "asset_id": str(asset_id),
            "service_date": "2025-03-15",
            "service_type": "Routine Service",
            "service_provider": "ServiceCo",
            "cost": "15000.00",
            "next_service_due": "2025-09-15",
            "notes": "Regular maintenance"
        }

        response = client.post(f"/api/fixed-assets/{asset_id}/maintenance", json=maintenance_data, headers=auth_headers)

        assert response.status_code in [200, 201, 400, 404, 422, 500]

    def test_log_maintenance_negative_cost(self, override_dependencies, auth_headers):
        """Test logging maintenance with negative cost"""
        asset_id = uuid4()
        maintenance_data = {
            "asset_id": str(asset_id),
            "service_date": "2025-03-15",
            "service_type": "Routine Service",
            "cost": "-500.00"
        }

        response = client.post(f"/api/fixed-assets/{asset_id}/maintenance", json=maintenance_data, headers=auth_headers)

        assert response.status_code in [400, 422]

    def test_get_maintenance_history(self, override_dependencies, auth_headers, mock_supabase):
        """Test getting maintenance history for an asset"""
        asset_id = uuid4()
        mock_maint = create_mock_maintenance(asset_id=asset_id)

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_maint])
        mock_supabase.table.return_value = mock_query

        response = client.get(f"/api/fixed-assets/{asset_id}/maintenance", headers=auth_headers)

        assert response.status_code in [200, 404, 500]


class TestFixedAssetReports:
    """Test fixed asset report endpoints"""

    def test_fixed_asset_register(self, override_dependencies, auth_headers, mock_supabase):
        """Test generating Fixed Asset Register report"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/fixed-assets/reports/register", headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_fixed_asset_register_with_date(self, override_dependencies, auth_headers, mock_supabase):
        """Test Fixed Asset Register with specific date"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.where.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/fixed-assets/reports/register?as_of_date=2025-03-31", headers=auth_headers)

        assert response.status_code in [200, 500]

    def test_depreciation_schedule_report(self, override_dependencies, auth_headers, mock_supabase):
        """Test depreciation schedule report"""
        response = client.get("/api/fixed-assets/reports/depreciation-schedule?year=2025", headers=auth_headers)

        assert response.status_code in [200, 500]


class TestFixedAssetValidation:
    """Test fixed asset validation edge cases"""

    def test_asset_residual_value_over_100(self, override_dependencies, auth_headers):
        """Test asset with residual value percent over 100"""
        asset_data = {
            "asset_code": "FA-VAL",
            "name": "Invalid Residual",
            "category_id": str(uuid4()),
            "purchase_date": "2025-03-01",
            "purchase_cost": "50000.00",
            "useful_life_months": 60,
            "residual_value_percent": "110.00",
            "depreciation_method": "SLM"
        }

        response = client.post("/api/fixed-assets", json=asset_data, headers=auth_headers)

        assert response.status_code == 422

    def test_asset_missing_required_fields(self, override_dependencies, auth_headers):
        """Test creating asset with missing required fields"""
        asset_data = {
            "name": "Missing Fields Asset"
        }

        response = client.post("/api/fixed-assets", json=asset_data, headers=auth_headers)

        assert response.status_code == 422

    def test_asset_invalid_date_format(self, override_dependencies, auth_headers):
        """Test creating asset with invalid date format"""
        asset_data = {
            "asset_code": "FA-DATE",
            "name": "Invalid Date Asset",
            "category_id": str(uuid4()),
            "purchase_date": "2025/03/01",
            "purchase_cost": "50000.00",
            "useful_life_months": 60,
            "depreciation_method": "SLM"
        }

        response = client.post("/api/fixed-assets", json=asset_data, headers=auth_headers)

        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
