"""
Tests for BI & Analytics Dashboard API
Endpoints: Dashboard KPI, Revenue Trends, Expense Trends, Financial Ratios,
           Top Customers, Top Products, Export
"""

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

COMPANY_ID = uuid4()
USER_ID = uuid4()


def _auth_headers():
    return {"Authorization": "Bearer test-token"}


def _mock_db():
    s = MagicMock()
    s.execute.return_value = MagicMock()
    s.execute.return_value.scalar.return_value = None
    s.execute.return_value.fetchall.return_value = []
    s.execute.return_value.__iter__ = lambda self: iter([])
    return s


def _override(db_session=None, company_id=None):
    from app.routers import bi_dashboard

    # Clear first
    app.dependency_overrides.clear()

    cid = str(company_id) if company_id else str(COMPANY_ID)
    mock_user = User(
        id=str(USER_ID),
        email="test@example.com",
        full_name="Test User",
        company_id=cid,
        company_name="Test Company"
    )

    async def mock_user_dep():
        return mock_user

    def mock_db_dep():
        return db_session

    app.dependency_overrides[bi_dashboard.get_current_user] = mock_user_dep
    if db_session is not None:
        app.dependency_overrides[bi_dashboard.get_db] = mock_db_dep


def _clear():
    pass


# ─── Dashboard KPI ──────────────────────────────────────────────────────────

class TestDashboardKPI:

    def test_dashboard_kpi_success(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.scalar.return_value = Decimal("0")
        _override(db)

        resp = client.get(
            "/api/bi/dashboard?start_date=2025-01-01&end_date=2025-12-31",
            headers=_auth_headers()
        )
        assert resp.status_code == 200
        data = resp.json()
        for key in ["total_revenue", "total_expenses", "net_profit",
                     "gross_margin_percent", "net_profit_percent",
                     "current_ratio", "quick_ratio", "dso"]:
            assert key in data
        _clear()

    def test_dashboard_kpi_missing_start_date(self):
        _override()
        resp = client.get("/api/bi/dashboard?end_date=2025-12-31", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_dashboard_kpi_missing_end_date(self):
        _override()
        resp = client.get("/api/bi/dashboard?start_date=2025-01-01", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_dashboard_kpi_invalid_date_format(self):
        _override()
        resp = client.get("/api/bi/dashboard?start_date=bad&end_date=2025-12-31", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_dashboard_kpi_date_range_filter(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.scalar.return_value = Decimal("50000.00")
        _override(db)

        resp = client.get(
            "/api/bi/dashboard?start_date=2025-06-01&end_date=2025-06-30",
            headers=_auth_headers()
        )
        assert resp.status_code == 200
        _clear()

    def test_dashboard_kpi_user_no_company(self, mock_supabase):
        from app.routers import bi_dashboard
        app.dependency_overrides.clear()
        mock_user = User(
            id=str(USER_ID),
            email="test@example.com",
            full_name="Test User",
            company_id=None,
            company_name=None
        )
        app.dependency_overrides[bi_dashboard.get_current_user] = lambda: mock_user

        resp = client.get(
            "/api/bi/dashboard?start_date=2025-01-01&end_date=2025-12-31",
            headers=_auth_headers()
        )
        assert resp.status_code == 400
        assert "company" in resp.json()["detail"].lower()
        _clear()


# ─── Revenue Trends ─────────────────────────────────────────────────────────

class TestRevenueTrends:

    def test_revenue_trends_success(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        db.execute.return_value.scalar.return_value = 0
        _override(db)

        resp = client.get("/api/bi/revenue-trends", headers=_auth_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "data" in data
        assert "message" in data
        _clear()

    def test_revenue_trends_default_months(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        db.execute.return_value.scalar.return_value = 0
        _override(db)

        resp = client.get("/api/bi/revenue-trends", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_revenue_trends_custom_months(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        db.execute.return_value.scalar.return_value = 0
        _override(db)

        resp = client.get("/api/bi/revenue-trends?months=6", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_revenue_trends_months_min(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        db.execute.return_value.scalar.return_value = 0
        _override(db)

        resp = client.get("/api/bi/revenue-trends?months=1", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_revenue_trends_months_max(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        db.execute.return_value.scalar.return_value = 0
        _override(db)

        resp = client.get("/api/bi/revenue-trends?months=60", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_revenue_trends_months_too_low(self):
        _override()
        resp = client.get("/api/bi/revenue-trends?months=0", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_revenue_trends_months_too_high(self):
        _override()
        resp = client.get("/api/bi/revenue-trends?months=61", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()


# ─── Expense Trends ─────────────────────────────────────────────────────────

class TestExpenseTrends:

    def test_expense_trends_success(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        db.execute.return_value.scalar.return_value = 0
        _override(db)

        resp = client.get("/api/bi/expense-trends", headers=_auth_headers())
        assert resp.status_code == 200
        data = resp.json()
        for key in ["trends", "by_category", "total_expenses"]:
            assert key in data
        _clear()

    def test_expense_trends_default_months(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        db.execute.return_value.scalar.return_value = 0
        _override(db)

        resp = client.get("/api/bi/expense-trends", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_expense_trends_custom_months(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        db.execute.return_value.scalar.return_value = 0
        _override(db)

        resp = client.get("/api/bi/expense-trends?months=24", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_expense_trends_empty_data(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        db.execute.return_value.scalar.return_value = 0
        _override(db)

        resp = client.get("/api/bi/expense-trends", headers=_auth_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["trends"], list)
        assert isinstance(data["by_category"], list)
        _clear()

    def test_expense_trends_months_out_of_range(self):
        _override()
        resp = client.get("/api/bi/expense-trends?months=100", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()


# ─── BI Financial Ratios ────────────────────────────────────────────────────

class TestBIFinancialRatios:

    def test_bi_ratios_success(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.scalar.return_value = Decimal("0")
        _override(db)

        resp = client.get(
            "/api/bi/ratios?start_date=2025-01-01&end_date=2025-12-31",
            headers=_auth_headers()
        )
        assert resp.status_code == 200
        data = resp.json()
        for key in ["current_ratio", "quick_ratio", "cash_ratio",
                     "gross_profit_margin", "net_profit_margin",
                     "return_on_assets", "return_on_equity",
                     "dso", "dpo", "debt_to_equity", "debt_ratio",
                     "total_revenue", "total_expenses", "net_profit",
                     "total_assets", "total_liabilities", "total_equity"]:
            assert key in data
        _clear()

    def test_bi_ratios_missing_start_date(self):
        _override()
        resp = client.get("/api/bi/ratios?end_date=2025-12-31", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_bi_ratios_missing_end_date(self):
        _override()
        resp = client.get("/api/bi/ratios?start_date=2025-01-01", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_bi_ratios_empty_data_returns_defaults(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.scalar.return_value = Decimal("0")
        _override(db)

        resp = client.get(
            "/api/bi/ratios?start_date=2025-01-01&end_date=2025-12-31",
            headers=_auth_headers()
        )
        assert resp.status_code == 200
        data = resp.json()
        # BI ratios return Decimal values which serialize as strings like "0.00"
        assert float(data["current_ratio"]) == 0.0
        assert float(data["quick_ratio"]) == 0.0
        assert float(data["net_profit"]) == 0.0
        _clear()

    def test_bi_ratios_date_range_filter(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.scalar.return_value = Decimal("100000.00")
        _override(db)

        resp = client.get(
            "/api/bi/ratios?start_date=2025-01-01&end_date=2025-03-31",
            headers=_auth_headers()
        )
        assert resp.status_code == 200
        _clear()


# ─── Top Customers ──────────────────────────────────────────────────────────

class TestTopCustomers:

    def test_top_customers_success(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get("/api/bi/top-customers", headers=_auth_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "data" in data
        assert "message" in data
        _clear()

    def test_top_customers_default_limit(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get("/api/bi/top-customers", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_top_customers_custom_limit(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get("/api/bi/top-customers?limit=5", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_top_customers_limit_min(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get("/api/bi/top-customers?limit=1", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_top_customers_limit_max(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get("/api/bi/top-customers?limit=100", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_top_customers_limit_too_low(self):
        _override()
        resp = client.get("/api/bi/top-customers?limit=0", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_top_customers_limit_too_high(self):
        _override()
        resp = client.get("/api/bi/top-customers?limit=101", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()


# ─── Top Products ───────────────────────────────────────────────────────────

class TestTopProducts:

    def test_top_products_success(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get("/api/bi/top-products", headers=_auth_headers())
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "data" in data
        _clear()

    def test_top_products_default_limit(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get("/api/bi/top-products", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_top_products_custom_limit(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get("/api/bi/top-products?limit=20", headers=_auth_headers())
        assert resp.status_code == 200
        _clear()

    def test_top_products_limit_out_of_range(self):
        _override()
        resp = client.get("/api/bi/top-products?limit=200", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_top_products_empty_data(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get("/api/bi/top-products", headers=_auth_headers())
        assert resp.status_code == 200
        assert resp.json()["data"] == []
        _clear()


# ─── Export ─────────────────────────────────────────────────────────────────

class TestExportDashboard:

    def test_export_success(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.scalar.return_value = Decimal("0")
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get(
            "/api/bi/export?start_date=2025-01-01&end_date=2025-12-31",
            headers=_auth_headers()
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "success" in data
        assert "message" in data
        _clear()

    def test_export_missing_start_date(self):
        _override()
        resp = client.get("/api/bi/export?end_date=2025-12-31", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_export_MISSING_end_date(self):
        _override()
        resp = client.get("/api/bi/export?start_date=2025-01-01", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_export_invalid_date_format(self):
        _override()
        resp = client.get("/api/bi/export?start_date=bad&end_date=2025-12-31", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_export_user_no_company(self, mock_supabase):
        from app.routers import bi_dashboard
        app.dependency_overrides.clear()
        mock_user = User(
            id=str(USER_ID),
            email="test@example.com",
            full_name="Test User",
            company_id=None,
            company_name=None
        )
        app.dependency_overrides[bi_dashboard.get_current_user] = lambda: mock_user

        resp = client.get(
            "/api/bi/export?start_date=2025-01-01&end_date=2025-12-31",
            headers=_auth_headers()
        )
        assert resp.status_code == 400
        _clear()


# ─── Date Range Filters ─────────────────────────────────────────────────────

class TestBIDateRangeFilters:

    def test_dashboard_quarter_range(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.scalar.return_value = Decimal("25000.00")
        _override(db)

        resp = client.get(
            "/api/bi/dashboard?start_date=2025-01-01&end_date=2025-03-31",
            headers=_auth_headers()
        )
        assert resp.status_code == 200
        _clear()

    def test_ratios_full_year(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.scalar.return_value = Decimal("1000000.00")
        _override(db)

        resp = client.get(
            "/api/bi/ratios?start_date=2025-01-01&end_date=2025-12-31",
            headers=_auth_headers()
        )
        assert resp.status_code == 200
        _clear()

    def test_export_single_day(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.scalar.return_value = Decimal("0")
        db.execute.return_value.fetchall.return_value = []
        _override(db)

        resp = client.get(
            "/api/bi/export?start_date=2025-06-15&end_date=2025-06-15",
            headers=_auth_headers()
        )
        assert resp.status_code == 200
        _clear()

    def test_dashboard_reversed_dates(self, mock_supabase):
        db = _mock_db()
        db.execute.return_value.scalar.return_value = Decimal("0")
        _override(db)

        resp = client.get(
            "/api/bi/dashboard?start_date=2025-12-31&end_date=2025-01-01",
            headers=_auth_headers()
        )
        assert resp.status_code == 200
        _clear()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
