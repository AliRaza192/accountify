import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from uuid import uuid4
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

def _inventory_item_response(item_id=None, quantity=100, **overrides):
    iid = str(item_id) if item_id else str(uuid4())
    base = {
        "id": iid,
        "product_id": str(uuid4()),
        "product_name": "Widget A",
        "product_code": "WGT-001",
        "warehouse_id": None,
        "warehouse_name": None,
        "quantity": quantity,
        "reorder_level": 50,
        "unit": "pcs",
        "company_id": str(uuid4()),
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "is_deleted": False,
    }
    base.update(overrides)
    return base


def _product_response(product_id=None):
    pid = str(product_id) if product_id else str(uuid4())
    return {
        "id": pid,
        "name": "Widget A",
        "code": "WGT-001",
        "unit": "pcs",
        "sale_price": "500.00",
        "reorder_level": 50,
        "track_inventory": True,
        "company_id": "test-company-id",
        "is_deleted": False,
    }


def _warehouse_response(warehouse_id=None):
    wid = str(warehouse_id) if warehouse_id else str(uuid4())
    return {
        "id": wid,
        "name": "Main Warehouse",
        "company_id": "test-company-id",
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
        email="warehouse@example.com",
        full_name="Warehouse Manager",
        role="admin",
        company_id="test-company-id",
        company_name="Test Company",
    )


@pytest.fixture
def override_inventory_deps(mock_current_user, mock_supabase):
    from app.routers import inventory
    from app.routers import auth

    async def mock_get_current_user():
        return mock_current_user

    def mock_get_supabase_client():
        return mock_supabase

    app.dependency_overrides[inventory.get_current_user] = mock_get_current_user
    app.dependency_overrides[auth.get_supabase_client] = mock_get_supabase_client

    yield mock_current_user

    app.dependency_overrides.clear()


# ===================================================================
# Stock Adjustments
# ===================================================================

class TestStockAdjustments:
    """Test stock adjustment endpoints"""

    def test_stock_increase_adjustment(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test adding positive stock via adjustment"""
        product_id = uuid4()
        inv_id = uuid4()

        # Product lookup
        mock_prod = MagicMock()
        mock_prod.select.return_value = mock_prod
        mock_prod.eq.return_value = mock_prod
        mock_prod.execute.return_value = MagicMock(data=[_product_response(product_id)])

        # Existing inventory lookup
        mock_inv = MagicMock()
        mock_inv.select.return_value = mock_inv
        mock_inv.eq.return_value = mock_inv
        mock_inv.is_.return_value = mock_inv
        mock_inv.execute.return_value = MagicMock(data=[_inventory_item_response(quantity=100)])

        # Update inventory
        mock_update = MagicMock()
        mock_update.update.return_value = mock_update
        mock_update.eq.return_value = mock_update
        mock_update.execute.return_value = MagicMock(data=[])

        # Record stock adjustment
        mock_adj = MagicMock()
        mock_adj.insert.return_value = mock_adj
        mock_adj.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_prod, mock_inv, mock_update, mock_adj]

        response = client.post(
            "/api/inventory/adjustment",
            json={
                "product_id": str(product_id),
                "quantity": 50,
                "reason": "Found extra stock in storage",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["quantity_change"] == 50

    def test_stock_decrease_adjustment(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test reducing stock via adjustment (damage/loss)"""
        product_id = uuid4()

        mock_prod = MagicMock()
        mock_prod.select.return_value = mock_prod
        mock_prod.eq.return_value = mock_prod
        mock_prod.execute.return_value = MagicMock(data=[_product_response(product_id)])

        mock_inv = MagicMock()
        mock_inv.select.return_value = mock_inv
        mock_inv.eq.return_value = mock_inv
        mock_inv.is_.return_value = mock_inv
        mock_inv.execute.return_value = MagicMock(data=[_inventory_item_response(quantity=100)])

        mock_update = MagicMock()
        mock_update.update.return_value = mock_update
        mock_update.eq.return_value = mock_update
        mock_update.execute.return_value = MagicMock(data=[])

        mock_adj = MagicMock()
        mock_adj.insert.return_value = mock_adj
        mock_adj.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_prod, mock_inv, mock_update, mock_adj]

        response = client.post(
            "/api/inventory/adjustment",
            json={
                "product_id": str(product_id),
                "quantity": -30,
                "reason": "Damaged goods - water leak",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["data"]["quantity_change"] == -30

    def test_stock_adjustment_insufficient_stock(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test decreasing stock below zero returns 400"""
        product_id = uuid4()

        mock_prod = MagicMock()
        mock_prod.select.return_value = mock_prod
        mock_prod.eq.return_value = mock_prod
        mock_prod.execute.return_value = MagicMock(data=[_product_response(product_id)])

        mock_inv = MagicMock()
        mock_inv.select.return_value = mock_inv
        mock_inv.eq.return_value = mock_inv
        mock_inv.is_.return_value = mock_inv
        mock_inv.execute.return_value = MagicMock(data=[_inventory_item_response(quantity=10)])

        mock_supabase.table.side_effect = [mock_prod, mock_inv]

        response = client.post(
            "/api/inventory/adjustment",
            json={
                "product_id": str(product_id),
                "quantity": -50,
                "reason": "Test",
            },
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "Insufficient stock" in response.json()["detail"]

    def test_stock_adjustment_product_not_found(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test adjusting stock for non-existent product returns 404"""
        product_id = uuid4()

        mock_prod = MagicMock()
        mock_prod.select.return_value = mock_prod
        mock_prod.eq.return_value = mock_prod
        mock_prod.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_prod

        response = client.post(
            "/api/inventory/adjustment",
            json={
                "product_id": str(product_id),
                "quantity": 10,
                "reason": "Test",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_stock_adjustment_no_company(self, auth_headers, mock_supabase):
        """Test stock adjustment when user has no company returns 400"""
        from app.routers import inventory
        from app.types import User

        async def mock_no_company():
            return User(id="u1", email="a@b.com", full_name="A", company_id=None, company_name=None)

        app.dependency_overrides[inventory.get_current_user] = mock_no_company

        response = client.post(
            "/api/inventory/adjustment",
            json={"product_id": str(uuid4()), "quantity": 10, "reason": "Test"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        app.dependency_overrides.clear()

    def test_new_inventory_creation_on_positive_adjustment(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test that adjusting stock for a product with no existing record creates inventory"""
        product_id = uuid4()

        mock_prod = MagicMock()
        mock_prod.select.return_value = mock_prod
        mock_prod.eq.return_value = mock_prod
        mock_prod.execute.return_value = MagicMock(data=[_product_response(product_id)])

        # No existing inventory
        mock_inv_check = MagicMock()
        mock_inv_check.select.return_value = mock_inv_check
        mock_inv_check.eq.return_value = mock_inv_check
        mock_inv_check.is_.return_value = mock_inv_check
        mock_inv_check.execute.return_value = MagicMock(data=[])

        # Insert new inventory
        inv_id = uuid4()
        mock_inv_insert = MagicMock()
        mock_inv_insert.insert.return_value = mock_inv_insert
        mock_inv_insert.execute.return_value = MagicMock(data=[{"id": str(inv_id)}])

        # Record adjustment
        mock_adj = MagicMock()
        mock_adj.insert.return_value = mock_adj
        mock_adj.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_prod, mock_inv_check, mock_inv_insert, mock_adj]

        response = client.post(
            "/api/inventory/adjustment",
            json={
                "product_id": str(product_id),
                "quantity": 200,
                "reason": "Initial stock entry",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_negative_inventory_creation_blocked(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test creating inventory with negative quantity when no record exists returns 400"""
        product_id = uuid4()

        mock_prod = MagicMock()
        mock_prod.select.return_value = mock_prod
        mock_prod.eq.return_value = mock_prod
        mock_prod.execute.return_value = MagicMock(data=[_product_response(product_id)])

        mock_inv = MagicMock()
        mock_inv.select.return_value = mock_inv
        mock_inv.eq.return_value = mock_inv
        mock_inv.is_.return_value = mock_inv
        mock_inv.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_prod, mock_inv]

        response = client.post(
            "/api/inventory/adjustment",
            json={
                "product_id": str(product_id),
                "quantity": -10,
                "reason": "Should fail",
            },
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "Cannot create negative inventory" in response.json()["detail"]


# ===================================================================
# Low Stock Alerts
# ===================================================================

class TestLowStockAlerts:
    """Test low stock alert endpoints"""

    def test_low_stock_items_detected(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test that items below reorder level are flagged"""
        low_item = _inventory_item_response(quantity=20, reorder_level=50)
        ok_item = _inventory_item_response(item_id=uuid4(), quantity=200, reorder_level=50)

        mock_inv = MagicMock()
        mock_inv.select.return_value = mock_inv
        mock_inv.eq.return_value = mock_inv
        mock_inv.is_.return_value = mock_inv
        mock_inv.execute.return_value = MagicMock(data=[
            {**low_item, "products": {"name": "Widget A", "code": "WGT-001", "unit": "pcs", "reorder_level": 50}, "warehouses": None},
            {**ok_item, "products": {"name": "Widget B", "code": "WGT-002", "unit": "pcs", "reorder_level": 50}, "warehouses": None},
        ])

        mock_supabase.table.return_value = mock_inv

        response = client.get("/api/inventory/low-stock", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 1
        assert data["data"][0]["shortage"] == 30
        assert data["data"][0]["quantity"] == 20

    def test_low_stock_empty(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test low stock returns empty list when all items above reorder level"""
        mock_inv = MagicMock()
        mock_inv.select.return_value = mock_inv
        mock_inv.eq.return_value = mock_inv
        mock_inv.is_.return_value = mock_inv
        mock_inv.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_inv

        response = client.get("/api/inventory/low-stock", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 0

    def test_low_stock_no_company(self, auth_headers):
        """Test low stock endpoint when user has no company returns 400"""
        from app.routers import inventory
        from app.types import User

        async def mock_no_company():
            return User(id="u1", email="a@b.com", full_name="A", company_id=None, company_name=None)

        app.dependency_overrides[inventory.get_current_user] = mock_no_company
        response = client.get("/api/inventory/low-stock", headers=auth_headers)
        assert response.status_code == 400
        app.dependency_overrides.clear()


# ===================================================================
# Stock Transfers
# ===================================================================

class TestStockTransfers:
    """Test stock transfer endpoints"""

    def test_transfer_stock_success(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test transferring stock between warehouses"""
        product_id = uuid4()
        from_wh = uuid4()
        to_wh = uuid4()

        # Source inventory
        mock_from = MagicMock()
        mock_from.select.return_value = mock_from
        mock_from.eq.return_value = mock_from
        mock_from.execute.return_value = MagicMock(data=[
            {"id": "inv-src", "quantity": 100, "product_id": str(product_id), "warehouse_id": str(from_wh)}
        ])

        # Update source (reduce)
        mock_upd_src = MagicMock()
        mock_upd_src.update.return_value = mock_upd_src
        mock_upd_src.eq.return_value = mock_upd_src
        mock_upd_src.execute.return_value = MagicMock(data=[])

        # Destination inventory exists
        mock_to = MagicMock()
        mock_to.select.return_value = mock_to
        mock_to.eq.return_value = mock_to
        mock_to.execute.return_value = MagicMock(data=[
            {"id": "inv-dst", "quantity": 50}
        ])

        # Update destination (increase)
        mock_upd_dst = MagicMock()
        mock_upd_dst.update.return_value = mock_upd_dst
        mock_upd_dst.eq.return_value = mock_upd_dst
        mock_upd_dst.execute.return_value = MagicMock(data=[])

        # Record transfer
        mock_xfer = MagicMock()
        mock_xfer.insert.return_value = mock_xfer
        mock_xfer.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_from, mock_upd_src, mock_to, mock_upd_dst, mock_xfer]

        response = client.post(
            "/api/inventory/transfer",
            json={
                "product_id": str(product_id),
                "quantity": 30,
                "from_warehouse_id": str(from_wh),
                "to_warehouse_id": str(to_wh),
                "reason": "Replenish Karachi warehouse",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        assert "completed" in response.json()["message"]

    def test_transfer_same_warehouse_blocked(self, override_inventory_deps, auth_headers):
        """Test transferring stock to the same warehouse returns 400"""
        wh = uuid4()
        response = client.post(
            "/api/inventory/transfer",
            json={
                "product_id": str(uuid4()),
                "quantity": 10,
                "from_warehouse_id": str(wh),
                "to_warehouse_id": str(wh),
                "reason": "Should fail",
            },
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "different" in response.json()["detail"]

    def test_transfer_insufficient_source_stock(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test transferring more than available stock returns 400"""
        product_id = uuid4()
        from_wh = uuid4()
        to_wh = uuid4()

        mock_from = MagicMock()
        mock_from.select.return_value = mock_from
        mock_from.eq.return_value = mock_from
        mock_from.execute.return_value = MagicMock(data=[
            {"id": "inv-src", "quantity": 5, "product_id": str(product_id), "warehouse_id": str(from_wh)}
        ])

        mock_supabase.table.return_value = mock_from

        response = client.post(
            "/api/inventory/transfer",
            json={
                "product_id": str(product_id),
                "quantity": 50,
                "from_warehouse_id": str(from_wh),
                "to_warehouse_id": str(to_wh),
                "reason": "Should fail",
            },
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "Insufficient stock" in response.json()["detail"]

    def test_transfer_product_not_in_source(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test transferring product that does not exist in source warehouse returns 404"""
        product_id = uuid4()
        from_wh = uuid4()
        to_wh = uuid4()

        mock_from = MagicMock()
        mock_from.select.return_value = mock_from
        mock_from.eq.return_value = mock_from
        mock_from.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_from

        response = client.post(
            "/api/inventory/transfer",
            json={
                "product_id": str(product_id),
                "quantity": 10,
                "from_warehouse_id": str(from_wh),
                "to_warehouse_id": str(to_wh),
                "reason": "Should fail",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_transfer_creates_destination_inventory(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test transferring to a warehouse where product doesn't exist creates new inventory"""
        product_id = uuid4()
        from_wh = uuid4()
        to_wh = uuid4()

        mock_from = MagicMock()
        mock_from.select.return_value = mock_from
        mock_from.eq.return_value = mock_from
        mock_from.execute.return_value = MagicMock(data=[
            {"id": "inv-src", "quantity": 100, "product_id": str(product_id), "warehouse_id": str(from_wh)}
        ])

        mock_upd_src = MagicMock()
        mock_upd_src.update.return_value = mock_upd_src
        mock_upd_src.eq.return_value = mock_upd_src
        mock_upd_src.execute.return_value = MagicMock(data=[])

        # No existing inventory at destination
        mock_to = MagicMock()
        mock_to.select.return_value = mock_to
        mock_to.eq.return_value = mock_to
        mock_to.execute.return_value = MagicMock(data=[])

        # Insert new inventory at destination
        mock_ins = MagicMock()
        mock_ins.insert.return_value = mock_ins
        mock_ins.execute.return_value = MagicMock(data=[])

        mock_xfer = MagicMock()
        mock_xfer.insert.return_value = mock_xfer
        mock_xfer.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_from, mock_upd_src, mock_to, mock_ins, mock_xfer]

        response = client.post(
            "/api/inventory/transfer",
            json={
                "product_id": str(product_id),
                "quantity": 25,
                "from_warehouse_id": str(from_wh),
                "to_warehouse_id": str(to_wh),
                "reason": "New warehouse stocking",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200


# ===================================================================
# List Inventory
# ===================================================================

class TestListInventory:
    """Test inventory listing"""

    def test_list_inventory_success(self, override_inventory_deps, auth_headers, mock_supabase):
        """Test listing all inventory items"""
        item = _inventory_item_response(quantity=100)
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[
            {**item, "products": {"name": "Widget A", "code": "WGT-001", "unit": "pcs", "reorder_level": 50}, "warehouses": None}
        ])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/inventory/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total"] == 1
        assert data["data"][0]["quantity"] == 100

    def test_list_inventory_no_company(self, auth_headers):
        """Test listing inventory when user has no company returns 400"""
        from app.routers import inventory
        from app.types import User

        async def mock_no_company():
            return User(id="u1", email="a@b.com", full_name="A", company_id=None, company_name=None)

        app.dependency_overrides[inventory.get_current_user] = mock_no_company
        response = client.get("/api/inventory/", headers=auth_headers)
        assert response.status_code == 400
        app.dependency_overrides.clear()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
