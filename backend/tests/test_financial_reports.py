"""
Tests for Advanced Financial Reports API
Endpoints: Cash Flow, Equity Statement, Financial Ratios, Funds Flow
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
    s.execute.return_value.scalar.return_value = Decimal("0")
    s.execute.return_value.fetchall.return_value = []
    return s


def _override(db_session=None):
    from app.routers import financial_reports

    # Clear first
    app.dependency_overrides.clear()

    mock_user = User(
        id=str(USER_ID),
        email="test@example.com",
        full_name="Test User",
        company_id=str(COMPANY_ID),
        company_name="Test Company"
    )

    async def mock_user_dep():
        return mock_user

    def mock_db_dep():
        return db_session

    app.dependency_overrides[financial_reports.get_current_user] = mock_user_dep
    if db_session is not None:
        app.dependency_overrides[financial_reports.get_db] = mock_db_dep


def _clear():
    pass


# ─── Cash Flow Statement ────────────────────────────────────────────────────

class TestCashFlowStatement:

    def test_cash_flow_success(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/cash-flow?fiscal_year=2025", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        assert data["fiscal_year"] == 2025
        for key in ["operating_activities", "operating_cash_flow", "investing_activities",
                     "financing_activities", "net_change_in_cash", "opening_cash_balance",
                     "closing_cash_balance", "balanced"]:
            assert key in data
        _clear()

    def test_cash_flow_missing_fiscal_year(self):
        _override()
        resp = client.get("/api/reports/advanced/cash-flow", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_cash_flow_invalid_fiscal_year(self):
        _override()
        resp = client.get("/api/reports/advanced/cash-flow?fiscal_year=1999", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_cash_flow_empty_data_returns_zeros(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/cash-flow?fiscal_year=2024", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        # Decimal values serialize as float in JSON
        assert float(data["operating_cash_flow"]) == 0.0
        assert float(data["net_change_in_cash"]) == 0.0
        assert float(data["opening_cash_balance"]) == 0.0
        assert float(data["closing_cash_balance"]) == 0.0
        _clear()

    def test_cash_flow_fiscal_year_boundary(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/cash-flow?fiscal_year=2000", headers=_auth_headers())

        assert resp.status_code == 200
        assert resp.json()["fiscal_year"] == 2000
        _clear()


# ─── Equity Statement ───────────────────────────────────────────────────────

class TestEquityStatement:

    def test_equity_statement_success(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/equity?fiscal_year=2025", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        assert data["fiscal_year"] == 2025
        for key in ["opening_equity", "additions", "deductions", "closing_equity", "balanced"]:
            assert key in data
        assert data["balanced"] is True
        _clear()

    def test_equity_statement_missing_fiscal_year(self):
        _override()
        resp = client.get("/api/reports/advanced/equity", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_equity_statement_empty_data(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/equity?fiscal_year=2025", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        assert float(data["opening_equity"]) == 0.0
        assert float(data["closing_equity"]) == 0.0
        assert float(data["additions"]["net_profit_for_year"]) == 0.0
        assert float(data["deductions"]["dividends_paid"]) == 0.0
        _clear()


# ─── Financial Ratios ───────────────────────────────────────────────────────

class TestFinancialRatios:

    def test_financial_ratios_success(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/ratios?fiscal_year=2025", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        assert data["fiscal_year"] == 2025
        for key in ["liquidity_ratios", "profitability_ratios", "efficiency_ratios",
                     "solvency_ratios", "summary"]:
            assert key in data
        _clear()

    def test_financial_ratios_missing_fiscal_year(self):
        _override()
        resp = client.get("/api/reports/advanced/ratios", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_financial_ratios_empty_data_returns_defaults(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/ratios?fiscal_year=2025", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        assert data["liquidity_ratios"]["current_ratio"] == 0
        assert data["liquidity_ratios"]["quick_ratio"] == 0
        assert data["profitability_ratios"]["gross_margin_pct"] == 0
        assert data["profitability_ratios"]["net_margin_pct"] == 0
        assert data["efficiency_ratios"]["inventory_turnover"] == 0
        _clear()

    def test_financial_ratios_interpretation_fields(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/ratios?fiscal_year=2025", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        assert "interpretation" in data["liquidity_ratios"]
        assert "current" in data["liquidity_ratios"]["interpretation"]
        assert "quick" in data["liquidity_ratios"]["interpretation"]
        assert "interpretation" in data["solvency_ratios"]
        _clear()

    def test_financial_ratios_fiscal_year_boundary(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/ratios?fiscal_year=2000", headers=_auth_headers())

        assert resp.status_code == 200
        assert resp.json()["fiscal_year"] == 2000
        _clear()


# ─── Funds Flow Statement ───────────────────────────────────────────────────

class TestFundsFlowStatement:

    def test_funds_flow_success(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/funds-flow?fiscal_year=2025", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        assert data["fiscal_year"] == 2025
        for key in ["sources_of_funds", "applications_of_funds", "net_change_in_working_capital"]:
            assert key in data
        _clear()

    def test_funds_flow_missing_fiscal_year(self):
        _override()
        resp = client.get("/api/reports/advanced/funds-flow", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_funds_flow_empty_data_returns_zeros(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/funds-flow?fiscal_year=2025", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        assert float(data["sources_of_funds"]["total_sources"]) == 0.0
        assert float(data["applications_of_funds"]["total_applications"]) == 0.0
        assert float(data["net_change_in_working_capital"]) == 0.0
        _clear()

    def test_funds_flow_sources_structure(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/funds-flow?fiscal_year=2025", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        src = data["sources_of_funds"]
        for key in ["funds_from_operations", "additional_capital", "long_term_loans", "total_sources"]:
            assert key in src
        _clear()

    def test_funds_flow_applications_structure(self, mock_supabase):
        db = _mock_db()
        _override(db)

        resp = client.get("/api/reports/advanced/funds-flow?fiscal_year=2025", headers=_auth_headers())

        assert resp.status_code == 200
        data = resp.json()
        app_data = data["applications_of_funds"]
        for key in ["capital_expenditures", "loan_repayments", "dividends_paid", "total_applications"]:
            assert key in app_data
        _clear()


# ─── Validation ─────────────────────────────────────────────────────────────

class TestFinancialReportsValidation:

    def test_cash_flow_string_fiscal_year(self):
        _override()
        resp = client.get("/api/reports/advanced/cash-flow?fiscal_year=abc", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_equity_string_fiscal_year(self):
        _override()
        resp = client.get("/api/reports/advanced/equity?fiscal_year=abc", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_ratios_negative_fiscal_year(self):
        _override()
        resp = client.get("/api/reports/advanced/ratios?fiscal_year=-1", headers=_auth_headers())
        assert resp.status_code == 422
        _clear()

    def test_all_reports_same_fiscal_year_consistency(self, mock_supabase):
        db = _mock_db()
        _override(db)

        fy = 2025
        endpoints = [
            "/api/reports/advanced/cash-flow",
            "/api/reports/advanced/equity",
            "/api/reports/advanced/ratios",
            "/api/reports/advanced/funds-flow",
        ]
        for ep in endpoints:
            resp = client.get(f"{ep}?fiscal_year={fy}", headers=_auth_headers())
            assert resp.status_code == 200
            assert resp.json()["fiscal_year"] == fy

        _clear()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
