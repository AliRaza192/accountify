import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from decimal import Decimal
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

def _product_response(product_id=None, sale_price="500.00", stock_qty=100):
    pid = str(product_id) if product_id else str(uuid4())
    return {
        "id": pid,
        "name": "POS Item A",
        "code": "POS-001",
        "sale_price": sale_price,
        "unit": "pcs",
        "track_inventory": True,
        "company_id": "test-company-id",
        "is_deleted": False,
    }


def _inventory_response(product_id=None, quantity=100):
    return {
        "id": str(uuid4()),
        "product_id": str(product_id) if product_id else str(uuid4()),
        "quantity": quantity,
        "company_id": "test-company-id",
        "is_deleted": False,
    }


def _invoice_response(invoice_id=None, total="590.00"):
    iid = str(invoice_id) if invoice_id else str(uuid4())
    return {
        "id": iid,
        "invoice_number": "INV-20250407-0001",
        "customer_id": None,
        "date": "2025-04-07T10:00:00Z",
        "due_date": "2025-04-07T10:00:00Z",
        "subtotal": "500.00",
        "tax_total": "90.00",
        "discount": "0",
        "total": total,
        "amount_paid": total,
        "balance_due": "0",
        "status": "confirmed",
        "payment_method": "cash",
        "notes": None,
        "company_id": "test-company-id",
    }


def _shift_response(shift_id=None, status="open"):
    sid = str(shift_id) if shift_id else str(uuid4())
    uid = str(uuid4())
    return {
        "id": sid,
        "shift_number": "SHIFT-20250407-001",
        "opened_at": "2025-04-07T09:00:00Z",
        "closed_at": None,
        "opening_cash": "5000.00",
        "expected_cash": "5000.00",
        "actual_cash": "5000.00",
        "difference": "0",
        "total_sales": 0,
        "total_amount": "0",
        "status": status,
        "cashier_id": uid,
        "cashier_name": "Test User",
    }


def _held_transaction_response(hold_id=None):
    hid = str(hold_id) if hold_id else str(uuid4())
    return {
        "id": hid,
        "hold_number": "HOLD-20250407-001",
        "company_id": "test-company-id",
        "held_by": "test-user-id",
        "items": [{"product_id": str(uuid4()), "quantity": 2, "rate": "500.00"}],
        "customer_id": None,
        "customer_name": None,
        "discount": 0,
        "notes": "Customer went to check another item",
        "hold_date": "20250407",
        "status": "held",
        "held_at": "2025-04-07T10:30:00Z",
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
        email="cashier@example.com",
        full_name="Test User",
        role="cashier",
        company_id="test-company-id",
        company_name="Test Company",
    )


@pytest.fixture
def override_pos_deps(mock_current_user, mock_supabase):
    from app.routers import pos
    from app import database
    from unittest.mock import patch

    async def mock_get_current_user():
        return mock_current_user

    app.dependency_overrides[pos.get_current_user] = mock_get_current_user

    # Patch the supabase reference in the pos module
    with patch.object(pos, 'supabase', mock_supabase):
        yield mock_current_user

    app.dependency_overrides.clear()


# ===================================================================
# POS Sale
# ===================================================================

class TestPOSSale:
    """Test POS sale processing"""

    def test_process_pos_sale_cash_success(self, override_pos_deps, auth_headers, mock_supabase):
        """Test processing a cash POS sale with single item"""
        product_id = uuid4()

        def _make_mock(data=None, count=0):
            m = MagicMock()
            m.select.return_value = m
            m.eq.return_value = m
            m.gte.return_value = m
            m.lte.return_value = m
            m.order.return_value = m
            m.insert.return_value = m
            m.update.return_value = m
            m.delete.return_value = m
            m.execute.return_value = MagicMock(data=data or [], count=count)
            return m

        # 1. product lookup
        mock_prod = _make_mock(data=[_product_response(product_id, sale_price="1000.00")])
        # 2. stock check
        mock_inv = _make_mock(data=[_inventory_response(product_id, quantity=50)])
        # 3. invoice count
        mock_count = _make_mock(count=0)
        # 4. create invoice
        invoice_id = uuid4()
        mock_inv_create = _make_mock(data=[_invoice_response(invoice_id, total="1180.00")])
        # 5. invoice items
        mock_inv_items = _make_mock(data=[])
        # 6. inventory select for quantity (nested in update)
        mock_inv_qty = _make_mock(data=[{"quantity": 50}])
        # 7. inventory update
        mock_upd_inv = _make_mock(data=[])
        # 8. cash account
        mock_cash_acc = _make_mock(data=[{"id": "acc-cash"}])
        # 9. sales account
        mock_sales_acc = _make_mock(data=[{"id": "acc-sales"}])
        # 10. journal
        mock_journal = _make_mock(data=[{"id": "j1"}])
        # 11-12. journal lines (2 calls)
        mock_jl1 = _make_mock(data=[])
        mock_jl2 = _make_mock(data=[])
        # 13. customer lookup for receipt
        mock_cust = _make_mock(data=[{"name": "Walk-in Customer"}])

        mock_supabase.table.side_effect = [
            mock_prod, mock_inv, mock_count, mock_inv_create, mock_inv_items,
            mock_upd_inv, mock_inv_qty,  # outer update first, inner select second
            mock_cash_acc, mock_sales_acc, mock_journal, mock_jl1, mock_jl2,
            mock_cust,
        ]

        response = client.post(
            "/api/pos/sale",
            json={
                "items": [
                    {
                        "product_id": str(product_id),
                        "quantity": 1,
                        "rate": "1000.00",
                        "tax_rate": "18",
                    }
                ],
                "discount": "0",
                "payment_method": "cash",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Sale processed successfully"
        assert float(data["receipt"]["subtotal"]) == 1000.00

    def test_process_pos_sale_card_payment(self, override_pos_deps, auth_headers, mock_supabase):
        """Test processing a POS sale with card payment"""
        product_id = uuid4()

        def _make_mock(data=None, count=0):
            m = MagicMock()
            m.select.return_value = m
            m.eq.return_value = m
            m.gte.return_value = m
            m.lte.return_value = m
            m.order.return_value = m
            m.insert.return_value = m
            m.update.return_value = m
            m.delete.return_value = m
            m.execute.return_value = MagicMock(data=data or [], count=count)
            return m

        mock_prod = _make_mock(data=[_product_response(product_id, sale_price="2000.00")])
        mock_inv = _make_mock(data=[_inventory_response(product_id, quantity=20)])
        mock_count = _make_mock(count=5)
        invoice_id = uuid4()
        mock_inv_create = _make_mock(data=[_invoice_response(invoice_id, total="2360.00")])
        mock_inv_items = _make_mock(data=[])
        mock_inv_qty = _make_mock(data=[{"quantity": 20}])
        mock_upd_inv = _make_mock(data=[])
        mock_cash_acc = _make_mock(data=[{"id": "acc-cash"}])
        mock_sales_acc = _make_mock(data=[{"id": "acc-sales"}])
        mock_journal = _make_mock(data=[{"id": "j1"}])
        mock_jl1 = _make_mock(data=[])
        mock_jl2 = _make_mock(data=[])
        mock_cust = _make_mock(data=[])

        mock_supabase.table.side_effect = [
            mock_prod, mock_inv, mock_count, mock_inv_create, mock_inv_items,
            mock_upd_inv, mock_inv_qty,  # outer update first, inner select second
            mock_cash_acc, mock_sales_acc, mock_journal, mock_jl1, mock_jl2,
            mock_cust,
        ]

        response = client.post(
            "/api/pos/sale",
            json={
                "items": [{"product_id": str(product_id), "quantity": 1, "rate": "2000.00", "tax_rate": "18"}],
                "discount": "0",
                "payment_method": "card",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["receipt"]["payment_method"] == "card"

    def test_process_pos_sale_with_customer(self, override_pos_deps, auth_headers, mock_supabase):
        """Test POS sale with linked customer"""
        product_id = uuid4()
        customer_id = uuid4()

        def _make_mock(data=None, count=0):
            m = MagicMock()
            m.select.return_value = m
            m.eq.return_value = m
            m.gte.return_value = m
            m.lte.return_value = m
            m.order.return_value = m
            m.insert.return_value = m
            m.update.return_value = m
            m.delete.return_value = m
            m.execute.return_value = MagicMock(data=data or [], count=count)
            return m

        mock_prod = _make_mock(data=[_product_response(product_id)])
        mock_inv = _make_mock(data=[_inventory_response(product_id, quantity=30)])
        mock_count = _make_mock(count=0)
        invoice_id = uuid4()
        mock_inv_create = _make_mock(data=[_invoice_response(invoice_id)])
        mock_inv_items = _make_mock(data=[])
        mock_inv_qty = _make_mock(data=[{"quantity": 30}])
        mock_upd_inv = _make_mock(data=[])
        mock_cash_acc = _make_mock(data=[{"id": "acc-cash"}])
        mock_sales_acc = _make_mock(data=[{"id": "acc-sales"}])
        mock_journal = _make_mock(data=[{"id": "j1"}])
        mock_jl1 = _make_mock(data=[])
        mock_jl2 = _make_mock(data=[])
        mock_cust = _make_mock(data=[{"name": "Regular Customer"}])

        mock_supabase.table.side_effect = [
            mock_prod, mock_inv, mock_count, mock_inv_create, mock_inv_items,
            mock_upd_inv, mock_inv_qty,  # outer update first, inner select second
            mock_cash_acc, mock_sales_acc, mock_journal, mock_jl1, mock_jl2,
            mock_cust,
        ]

        response = client.post(
            "/api/pos/sale",
            json={
                "customer_id": str(customer_id),
                "items": [{"product_id": str(product_id), "quantity": 1, "tax_rate": "18"}],
                "discount": "50",
                "payment_method": "cash",
                "notes": "Regular customer",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert float(data["receipt"]["discount"]) == 50.00

    def test_process_pos_sale_insufficient_stock(self, override_pos_deps, auth_headers, mock_supabase):
        """Test POS sale fails when stock is insufficient"""
        product_id = uuid4()

        mock_prod = MagicMock()
        mock_prod.select.return_value = mock_prod
        mock_prod.eq.return_value = mock_prod
        mock_prod.execute.return_value = MagicMock(data=[_product_response(product_id)])

        mock_inv = MagicMock()
        mock_inv.select.return_value = mock_inv
        mock_inv.eq.return_value = mock_inv
        mock_inv.execute.return_value = MagicMock(data=[_inventory_response(product_id, quantity=2)])

        mock_supabase.table.side_effect = [mock_prod, mock_inv]

        response = client.post(
            "/api/pos/sale",
            json={
                "items": [{"product_id": str(product_id), "quantity": 10, "tax_rate": "18"}],
                "payment_method": "cash",
            },
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "Insufficient stock" in response.json()["detail"]

    def test_process_pos_sale_product_not_found(self, override_pos_deps, auth_headers, mock_supabase):
        """Test POS sale with non-existent product returns 404"""
        product_id = uuid4()

        mock_prod = MagicMock()
        mock_prod.select.return_value = mock_prod
        mock_prod.eq.return_value = mock_prod
        mock_prod.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_prod

        response = client.post(
            "/api/pos/sale",
            json={
                "items": [{"product_id": str(product_id), "quantity": 1, "tax_rate": "18"}],
                "payment_method": "cash",
            },
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_process_pos_sale_no_company(self, auth_headers):
        """Test POS sale when user has no company returns 400"""
        from app.routers import pos
        from app.types import User

        async def mock_no_company():
            return User(id="u1", email="a@b.com", full_name="A", company_id=None, company_name=None)

        app.dependency_overrides[pos.get_current_user] = mock_no_company

        response = client.post(
            "/api/pos/sale",
            json={"items": [{"product_id": str(uuid4()), "quantity": 1, "tax_rate": "18"}], "payment_method": "cash"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        app.dependency_overrides.clear()


# ===================================================================
# Shift Management
# ===================================================================

class TestShiftManagement:
    """Test POS shift open/close/list endpoints"""

    def test_open_shift_success(self, override_pos_deps, auth_headers, mock_supabase):
        """Test opening a new POS shift"""
        # Check no open shift
        mock_check = MagicMock()
        mock_check.select.return_value = mock_check
        mock_check.eq.return_value = mock_check
        mock_check.execute.return_value = MagicMock(data=[])

        # Count shifts
        mock_count = MagicMock()
        mock_count.select.return_value = mock_count
        mock_count.eq.return_value = mock_count
        mock_count.execute.return_value = MagicMock(count=0)

        # Create shift
        shift_id = uuid4()
        mock_create = MagicMock()
        mock_create.insert.return_value = mock_create
        mock_create.execute.return_value = MagicMock(data=[_shift_response(shift_id)])

        mock_supabase.table.side_effect = [mock_check, mock_count, mock_create]

        response = client.post(
            "/api/pos/shift/open",
            json={"opening_cash": "5000.00", "notes": "Morning shift"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "open"
        assert float(data["opening_cash"]) == 5000.00

    def test_open_shift_already_open(self, override_pos_deps, auth_headers, mock_supabase):
        """Test opening shift when one is already open returns 400"""
        mock_check = MagicMock()
        mock_check.select.return_value = mock_check
        mock_check.eq.return_value = mock_check
        mock_check.execute.return_value = MagicMock(data=[_shift_response(status="open")])

        mock_supabase.table.return_value = mock_check

        response = client.post(
            "/api/pos/shift/open",
            json={"opening_cash": "5000.00"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "already have an open shift" in response.json()["detail"]

    def test_close_shift_success(self, override_pos_deps, auth_headers, mock_supabase):
        """Test closing an open shift with cash count"""
        shift_id = uuid4()

        # Get shift
        mock_get = MagicMock()
        mock_get.select.return_value = mock_get
        mock_get.eq.return_value = mock_get
        mock_get.execute.return_value = MagicMock(data=[_shift_response(shift_id, status="open")])

        # Update shift
        mock_upd = MagicMock()
        mock_upd.update.return_value = mock_upd
        mock_upd.eq.return_value = mock_upd
        mock_upd.execute.return_value = MagicMock(data=[_shift_response(shift_id, status="closed")])

        mock_supabase.table.side_effect = [mock_get, mock_upd]

        response = client.post(
            f"/api/pos/shift/{shift_id}/close",
            json={"closing_cash": "7500.00", "notes": "Good day"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "closed"

    def test_close_shift_already_closed(self, override_pos_deps, auth_headers, mock_supabase):
        """Test closing an already-closed shift returns 400"""
        shift_id = uuid4()

        mock_get = MagicMock()
        mock_get.select.return_value = mock_get
        mock_get.eq.return_value = mock_get
        mock_get.execute.return_value = MagicMock(data=[_shift_response(shift_id, status="closed")])

        mock_supabase.table.return_value = mock_get

        response = client.post(
            f"/api/pos/shift/{shift_id}/close",
            json={"closing_cash": "7500.00"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert "already closed" in response.json()["detail"]

    def test_close_shift_not_found(self, override_pos_deps, auth_headers, mock_supabase):
        """Test closing non-existent shift returns 404"""
        mock_get = MagicMock()
        mock_get.select.return_value = mock_get
        mock_get.eq.return_value = mock_get
        mock_get.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_get

        response = client.post(
            f"/api/pos/shift/{uuid4()}/close",
            json={"closing_cash": "7500.00"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_list_shifts(self, override_pos_deps, auth_headers, mock_supabase):
        """Test listing POS shifts"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[_shift_response(status="closed")])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/pos/shifts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "closed"

    def test_list_shifts_with_date_filter(self, override_pos_deps, auth_headers, mock_supabase):
        """Test listing POS shifts filtered by date range"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        response = client.get(
            "/api/pos/shifts?from_date=2025-04-01&to_date=2025-04-07",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json() == []


# ===================================================================
# Hold/Resume Transactions
# ===================================================================

class TestHoldResumeTransactions:
    """Test hold and resume POS transaction endpoints"""

    def test_hold_transaction(self, override_pos_deps, auth_headers, mock_supabase):
        """Test holding a POS transaction for later"""
        # Count existing holds
        mock_count = MagicMock()
        mock_count.select.return_value = mock_count
        mock_count.eq.return_value = mock_count
        mock_count.execute.return_value = MagicMock(count=0)

        # Create hold
        hold_id = uuid4()
        mock_create = MagicMock()
        mock_create.insert.return_value = mock_create
        mock_create.execute.return_value = MagicMock(data=[_held_transaction_response(hold_id)])

        mock_supabase.table.side_effect = [mock_count, mock_create]

        response = client.post(
            "/api/pos/hold",
            json={
                "items": [
                    {"product_id": str(uuid4()), "quantity": 2, "rate": "500.00"},
                    {"product_id": str(uuid4()), "quantity": 1, "rate": "1200.00"},
                ],
                "customer_id": str(uuid4()),
                "customer_name": "Ahmed Ali",
                "discount": "100",
                "notes": "Customer went to check prices",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["hold_number"].startswith("HOLD-")

    def test_list_held_transactions(self, override_pos_deps, auth_headers, mock_supabase):
        """Test listing today's held transactions"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[_held_transaction_response()])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/pos/held", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "held"

    def test_resume_held_transaction(self, override_pos_deps, auth_headers, mock_supabase):
        """Test resuming a held transaction"""
        hold_id = uuid4()
        held_txn = _held_transaction_response(hold_id)

        mock_get = MagicMock()
        mock_get.select.return_value = mock_get
        mock_get.eq.return_value = mock_get
        mock_get.execute.return_value = MagicMock(data=[held_txn])

        mock_upd = MagicMock()
        mock_upd.update.return_value = mock_upd
        mock_upd.eq.return_value = mock_upd
        mock_upd.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_get, mock_upd]

        response = client.post(f"/api/pos/held/{hold_id}/resume", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "items" in data

    def test_resume_non_held_transaction(self, override_pos_deps, auth_headers, mock_supabase):
        """Test resuming a transaction that is not on hold returns 400"""
        hold_id = uuid4()
        held_txn = _held_transaction_response(hold_id)
        held_txn["status"] = "resumed"  # Already resumed

        mock_get = MagicMock()
        mock_get.select.return_value = mock_get
        mock_get.eq.return_value = mock_get
        mock_get.execute.return_value = MagicMock(data=[held_txn])

        mock_supabase.table.return_value = mock_get

        response = client.post(f"/api/pos/held/{hold_id}/resume", headers=auth_headers)
        assert response.status_code == 400
        assert "not on hold" in response.json()["detail"]

    def test_resume_held_transaction_not_found(self, override_pos_deps, auth_headers, mock_supabase):
        """Test resuming non-existent held transaction returns 404"""
        mock_get = MagicMock()
        mock_get.select.return_value = mock_get
        mock_get.eq.return_value = mock_get
        mock_get.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_get

        response = client.post(f"/api/pos/held/{uuid4()}/resume", headers=auth_headers)
        assert response.status_code == 404

    def test_delete_held_transaction(self, override_pos_deps, auth_headers, mock_supabase):
        """Test deleting a held transaction"""
        hold_id = uuid4()

        mock_get = MagicMock()
        mock_get.select.return_value = mock_get
        mock_get.eq.return_value = mock_get
        mock_get.execute.return_value = MagicMock(data=[_held_transaction_response(hold_id)])

        mock_delete = MagicMock()
        mock_delete.delete.return_value = mock_delete
        mock_delete.eq.return_value = mock_delete
        mock_delete.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_get, mock_delete]

        response = client.delete(f"/api/pos/held/{hold_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_delete_held_transaction_not_found(self, override_pos_deps, auth_headers, mock_supabase):
        """Test deleting non-existent held transaction returns 404"""
        mock_get = MagicMock()
        mock_get.select.return_value = mock_get
        mock_get.eq.return_value = mock_get
        mock_get.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_get

        response = client.delete(f"/api/pos/held/{uuid4()}", headers=auth_headers)
        assert response.status_code == 404


# ===================================================================
# Receipt Generation
# ===================================================================

class TestReceiptGeneration:
    """Test receipt data retrieval for printing"""

    def test_get_receipt_success(self, override_pos_deps, auth_headers, mock_supabase):
        """Test getting receipt data for a confirmed invoice"""
        invoice_id = uuid4()

        # Get invoice
        mock_inv = MagicMock()
        mock_inv.select.return_value = mock_inv
        mock_inv.eq.return_value = mock_inv
        mock_inv.execute.return_value = MagicMock(data=[_invoice_response(invoice_id)])

        # Get invoice items
        mock_items = MagicMock()
        mock_items.select.return_value = mock_items
        mock_items.eq.return_value = mock_items
        mock_items.execute.return_value = MagicMock(data=[
            {
                "id": str(uuid4()),
                "invoice_id": str(invoice_id),
                "product_id": str(uuid4()),
                "description": "POS Item A",
                "quantity": 1,
                "rate": "500.00",
                "tax_rate": "18",
                "amount": "500.00",
                "products": {"name": "POS Item A", "code": "POS-001"},
            }
        ])

        mock_supabase.table.side_effect = [mock_inv, mock_items]

        response = client.get(f"/api/pos/receipt/{invoice_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["invoice_number"] == "INV-20250407-0001"
        assert len(data["items"]) == 1
        assert data["items"][0]["product_name"] == "POS Item A"
        assert float(data["subtotal"]) == 500.00

    def test_get_receipt_not_found(self, override_pos_deps, auth_headers, mock_supabase):
        """Test getting receipt for non-existent invoice returns 404"""
        mock_inv = MagicMock()
        mock_inv.select.return_value = mock_inv
        mock_inv.eq.return_value = mock_inv
        mock_inv.execute.return_value = MagicMock(data=[])

        mock_supabase.table.return_value = mock_inv

        response = client.get(f"/api/pos/receipt/{uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_get_receipt_no_company(self, auth_headers):
        """Test getting receipt when user has no company returns 400"""
        from app.routers import pos
        from app.types import User

        async def mock_no_company():
            return User(id="u1", email="a@b.com", full_name="A", company_id=None, company_name=None)

        app.dependency_overrides[pos.get_current_user] = mock_no_company

        response = client.get(f"/api/pos/receipt/{uuid4()}", headers=auth_headers)
        assert response.status_code == 400
        app.dependency_overrides.clear()


# ===================================================================
# POS Reports
# ===================================================================

class TestPOSReports:
    """Test POS report endpoints"""

    def test_daily_summary(self, override_pos_deps, auth_headers, mock_supabase):
        """Test daily POS sales summary"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.gte.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[
            {"id": str(uuid4()), "total": "590.00", "payment_method": "cash", "status": "confirmed"},
            {"id": str(uuid4()), "total": "1180.00", "payment_method": "card", "status": "confirmed"},
        ])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/pos/reports/daily-summary?report_date=2025-04-07", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total_sales"] == 2
        assert data["total_amount"] == 1770.00
        assert "cash" in data["payment_methods"]
        assert "card" in data["payment_methods"]

    def test_daily_summary_no_company(self, auth_headers):
        """Test daily summary when user has no company returns 400"""
        from app.routers import pos
        from app.types import User

        async def mock_no_company():
            return User(id="u1", email="a@b.com", full_name="A", company_id=None, company_name=None)

        app.dependency_overrides[pos.get_current_user] = mock_no_company

        response = client.get("/api/pos/reports/daily-summary", headers=auth_headers)
        assert response.status_code == 400
        app.dependency_overrides.clear()

    def test_cashier_summary(self, override_pos_deps, auth_headers, mock_supabase):
        """Test cashier-wise POS summary"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.gte.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[
            {
                "cashier_name": "Test User",
                "cashier_id": "test-user-id",
                "total_sales": 5,
                "opening_cash": 5000.00,
                "expected_cash": 8000.00,
                "actual_cash": 7950.00,
                "difference": -50.00,
            }
        ])
        mock_supabase.table.return_value = mock_query

        response = client.get("/api/pos/reports/cashier-summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["cashiers"]) == 1
        assert data["cashiers"][0]["total_sales"] == 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
