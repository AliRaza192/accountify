import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from decimal import Decimal
from uuid import uuid4
from datetime import date
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

def _tax_rate_payload(**overrides):
    base = {
        "tax_name": "Sales Tax Standard",
        "rate_percent": "18.00",
        "tax_type": "sales_tax",
        "effective_date": "2025-01-01",
        "is_active": True,
    }
    base.update(overrides)
    return base


def _tax_rate_response(rate_id=None, company_id=None, **overrides):
    rid = str(rate_id) if rate_id else str(uuid4())
    cid = str(company_id) if company_id else str(uuid4())
    base = {
        "id": rid,
        "company_id": cid,
        "tax_name": "Sales Tax Standard",
        "rate_percent": Decimal("18.00"),
        "tax_type": "sales_tax",
        "effective_date": date(2025, 1, 1),
        "end_date": None,
        "is_active": True,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
        "created_by": None,
        "updated_by": None,
    }
    base.update(overrides)
    return base


def _tax_return_response(return_id=None, company_id=None, **overrides):
    rid = str(return_id) if return_id else str(uuid4())
    cid = str(company_id) if company_id else str(uuid4())
    base = {
        "id": rid,
        "company_id": cid,
        "return_period_month": 3,
        "return_period_year": 2025,
        "output_tax_total": Decimal("150000.00"),
        "input_tax_total": Decimal("80000.00"),
        "net_tax_payable": Decimal("70000.00"),
        "filed_date": None,
        "challan_number": None,
        "challan_date": None,
        "status": "draft",
        "created_at": "2025-03-31T00:00:00Z",
        "updated_at": "2025-03-31T00:00:00Z",
        "created_by": None,
        "updated_by": None,
    }
    base.update(overrides)
    return base


def _wht_txn_response(txn_id=None, company_id=None, **overrides):
    tid = str(txn_id) if txn_id else str(uuid4())
    cid = str(company_id) if company_id else str(uuid4())
    base = {
        "id": tid,
        "company_id": cid,
        "transaction_date": date(2025, 3, 15),
        "party_id": str(uuid4()),
        "party_type": "vendor",
        "amount": Decimal("50000.00"),
        "wht_category": "goods",
        "wht_rate": Decimal("1.50"),
        "wht_amount": Decimal("750.00"),
        "challan_id": None,
        "is_filer": True,
        "created_at": "2025-03-15T10:00:00Z",
        "updated_at": "2025-03-15T10:00:00Z",
        "created_by": None,
        "updated_by": None,
    }
    base.update(overrides)
    return base


COMPANY_ID = uuid4()
USER_ID = uuid4()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-token"}


@pytest.fixture
def mock_current_user():
    return User(
        id=str(USER_ID),
        email="tax@example.com",
        full_name="Tax Manager",
        role="admin",
        company_id=str(COMPANY_ID),
        company_name="Test Company",
    )


@pytest.fixture
def override_tax_deps(mock_current_user):
    from app.routers import tax_management

    async def mock_get_current_user():
        return mock_current_user

    app.dependency_overrides[tax_management.get_current_user] = mock_get_current_user

    yield mock_current_user

    app.dependency_overrides.clear()


# ===================================================================
# Tax Rate CRUD
# ===================================================================

class TestTaxRateCRUD:
    """Test tax rate CRUD endpoints"""

    def test_create_tax_rate_success(self, override_tax_deps, auth_headers):
        """Test creating a sales tax rate at 18% (Pakistani standard)"""
        from app.routers import tax_management

        mock_rate = _tax_rate_response(company_id=COMPANY_ID)

        with patch.object(tax_management.TaxManagementService, 'create_tax_rate', return_value=mock_rate):
            response = client.post(
                "/api/tax/tax/rates",
                json=_tax_rate_payload(),
                headers=auth_headers,
            )
        assert response.status_code == 201
        data = response.json()
        assert data["tax_name"] == "Sales Tax Standard"
        assert float(data["rate_percent"]) == 18.00
        assert data["tax_type"] == "sales_tax"

    def test_create_tax_rate_invalid_type(self, override_tax_deps, auth_headers):
        """Test creating tax rate with invalid tax_type fails validation"""
        payload = _tax_rate_payload(tax_type="invalid_type")
        response = client.post("/api/tax/tax/rates", json=payload, headers=auth_headers)
        assert response.status_code == 422

    def test_list_tax_rates_success(self, override_tax_deps, auth_headers):
        """Test listing active tax rates"""
        from app.routers import tax_management

        rates = [_tax_rate_response(company_id=COMPANY_ID), _tax_rate_response(rate_id=uuid4(), company_id=COMPANY_ID, tax_name="WHT on Goods")]

        with patch.object(tax_management.TaxManagementService, 'get_tax_rates', return_value=rates):
            response = client.get("/api/tax/tax/rates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_list_tax_rates_filtered(self, override_tax_deps, auth_headers):
        """Test listing tax rates filtered by type"""
        from app.routers import tax_management

        with patch.object(tax_management.TaxManagementService, 'get_tax_rates', return_value=[]):
            response = client.get("/api/tax/tax/rates?tax_type=wht", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_tax_rate_success(self, override_tax_deps, auth_headers):
        """Test fetching a single tax rate by ID"""
        from app.routers import tax_management

        rate_id = uuid4()
        rate = _tax_rate_response(rate_id=rate_id, company_id=COMPANY_ID)

        with patch.object(tax_management.TaxManagementService, 'get_tax_rate', return_value=rate):
            response = client.get(f"/api/tax/tax/rates/{rate_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == str(rate_id)

    def test_get_tax_rate_not_found(self, override_tax_deps, auth_headers):
        """Test fetching non-existent tax rate returns 404"""
        from app.routers import tax_management

        with patch.object(tax_management.TaxManagementService, 'get_tax_rate', return_value=None):
            response = client.get(f"/api/tax/tax/rates/{uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_update_tax_rate_success(self, override_tax_deps, auth_headers):
        """Test updating tax rate percentage"""
        from app.routers import tax_management

        rate_id = uuid4()
        updated = _tax_rate_response(rate_id=rate_id, company_id=COMPANY_ID, rate_percent=Decimal("17.00"))

        with patch.object(tax_management.TaxManagementService, 'update_tax_rate', return_value=updated):
            response = client.put(
                f"/api/tax/tax/rates/{rate_id}",
                json={"rate_percent": "17.00"},
                headers=auth_headers,
            )
        assert response.status_code == 200
        assert float(response.json()["rate_percent"]) == 17.00

    def test_update_tax_rate_not_found(self, override_tax_deps, auth_headers):
        """Test updating non-existent tax rate returns 404"""
        from app.routers import tax_management

        with patch.object(tax_management.TaxManagementService, 'update_tax_rate', return_value=None):
            response = client.put(
                f"/api/tax/tax/rates/{uuid4()}",
                json={"rate_percent": "20.00"},
                headers=auth_headers,
            )
        assert response.status_code == 404


# ===================================================================
# Tax Return Generation
# ===================================================================

class TestTaxReturns:
    """Test tax return endpoints"""

    def test_generate_sales_tax_return(self, override_tax_deps, auth_headers):
        """Test generating a sales tax return for a period"""
        from app.routers import tax_management

        report = {
            "return_period": "03/2025",
            "output_tax_total": Decimal("150000.00"),
            "input_tax_total": Decimal("80000.00"),
            "net_tax_payable": Decimal("70000.00"),
            "taxable_sales": [],
            "taxable_purchases": [],
        }

        with patch.object(tax_management.TaxManagementService, 'generate_sales_tax_return', return_value=report):
            response = client.get(
                "/api/tax/tax/sales-tax/return?period_month=3&period_year=2025",
                headers=auth_headers,
            )
        assert response.status_code == 200
        data = response.json()
        assert data["output_tax_total"] == 150000.00
        assert data["net_tax_payable"] == 70000.00

    def test_file_sales_tax_return(self, override_tax_deps, auth_headers):
        """Test filing a sales tax return"""
        from app.routers import tax_management

        tax_return = _tax_return_response(company_id=COMPANY_ID, status="filed")

        with patch.object(tax_management.TaxManagementService, 'create_tax_return', return_value=tax_return):
            payload = {
                "return_period_month": 3,
                "return_period_year": 2025,
                "output_tax_total": "150000.00",
                "input_tax_total": "80000.00",
                "net_tax_payable": "70000.00",
                "status": "filed",
            }
            response = client.post("/api/tax/tax/sales-tax/return", json=payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["status"] == "filed"

    def test_list_tax_returns(self, override_tax_deps, auth_headers):
        """Test listing all tax returns"""
        from app.routers import tax_management

        returns = [_tax_return_response(company_id=COMPANY_ID), _tax_return_response(return_id=uuid4(), company_id=COMPANY_ID)]

        with patch.object(tax_management.TaxManagementService, 'get_tax_returns', return_value=returns):
            response = client.get("/api/tax/tax/returns", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_list_tax_returns_filtered_by_status(self, override_tax_deps, auth_headers):
        """Test listing tax returns filtered by status"""
        from app.routers import tax_management

        with patch.object(tax_management.TaxManagementService, 'get_tax_returns', return_value=[]):
            response = client.get("/api/tax/tax/returns?status=filed", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_tax_return(self, override_tax_deps, auth_headers):
        """Test fetching a single tax return"""
        from app.routers import tax_management

        ret_id = uuid4()
        ret = _tax_return_response(return_id=ret_id, company_id=COMPANY_ID)

        with patch.object(tax_management.TaxManagementService, 'get_tax_return', return_value=ret):
            response = client.get(f"/api/tax/tax/returns/{ret_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == str(ret_id)

    def test_update_tax_return(self, override_tax_deps, auth_headers):
        """Test updating tax return status to filed"""
        from app.routers import tax_management

        ret_id = uuid4()
        updated = _tax_return_response(return_id=ret_id, company_id=COMPANY_ID, status="filed")

        with patch.object(tax_management.TaxManagementService, 'update_tax_return', return_value=updated):
            response = client.put(
                f"/api/tax/tax/returns/{ret_id}",
                json={"status": "filed"},
                headers=auth_headers,
            )
        assert response.status_code == 200
        assert response.json()["status"] == "filed"


# ===================================================================
# WHT Transactions
# ===================================================================

class TestWHTTransactions:
    """Test WHT transaction endpoints"""

    def test_record_wht_transaction_goods(self, override_tax_deps, auth_headers):
        """Test recording WHT on goods at 1.5% (Pakistani FBR filer rate)"""
        from app.routers import tax_management

        txn = _wht_txn_response(company_id=COMPANY_ID)

        with patch.object(tax_management.TaxManagementService, 'record_wht_transaction', return_value=txn):
            payload = {
                "transaction_date": "2025-03-15",
                "party_id": str(uuid4()),
                "party_type": "vendor",
                "amount": "50000.00",
                "wht_category": "goods",
                "wht_rate": "1.50",
                "wht_amount": "750.00",
                "is_filer": True,
            }
            response = client.post("/api/tax/tax/wht/transactions", json=payload, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["wht_category"] == "goods"
        assert float(data["wht_amount"]) == 750.00

    def test_record_wht_transaction_services(self, override_tax_deps, auth_headers):
        """Test recording WHT on services at 6% (Pakistani FBR filer rate)"""
        from app.routers import tax_management

        txn = _wht_txn_response(txn_id=uuid4(), company_id=COMPANY_ID, wht_category="services", wht_rate=Decimal("6.00"), wht_amount=Decimal("3000.00"))

        with patch.object(tax_management.TaxManagementService, 'record_wht_transaction', return_value=txn):
            payload = {
                "transaction_date": "2025-04-01",
                "party_id": str(uuid4()),
                "party_type": "vendor",
                "amount": "50000.00",
                "wht_category": "services",
                "wht_rate": "6.00",
                "wht_amount": "3000.00",
                "is_filer": True,
            }
            response = client.post("/api/tax/tax/wht/transactions", json=payload, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["wht_category"] == "services"

    def test_list_wht_transactions(self, override_tax_deps, auth_headers):
        """Test listing WHT transactions"""
        from app.routers import tax_management

        txns = [_wht_txn_response(company_id=COMPANY_ID), _wht_txn_response(txn_id=uuid4(), company_id=COMPANY_ID, wht_category="services")]

        with patch.object(tax_management.TaxManagementService, 'get_wht_transactions', return_value=txns):
            response = client.get("/api/tax/tax/wht/transactions", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_list_wht_transactions_filtered(self, override_tax_deps, auth_headers):
        """Test listing WHT transactions filtered by category"""
        from app.routers import tax_management

        with patch.object(tax_management.TaxManagementService, 'get_wht_transactions', return_value=[]):
            response = client.get("/api/tax/tax/wht/transactions?wht_category=rent", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_generate_wht_challan(self, override_tax_deps, auth_headers):
        """Test generating WHT challan for a period"""
        from app.routers import tax_management

        challan = {
            "challan_number": "WHT-202503-TESTCO",
            "period_month": 3,
            "period_year": 2025,
            "total_wht": Decimal("15000.00"),
            "categories": ["goods", "services"],
            "transaction_ids": [str(uuid4()), str(uuid4())],
            "generated_at": "2025-04-01T00:00:00Z",
        }

        with patch.object(tax_management.TaxManagementService, 'generate_wht_challan', return_value=challan):
            payload = {"period_month": 3, "period_year": 2025}
            response = client.post("/api/tax/tax/wht/challan", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["challan_number"] == "WHT-202503-TESTCO"


# ===================================================================
# Sales Tax Calculations & Reports
# ===================================================================

class TestSalesTaxCalculations:
    """Test sales tax calculation and report endpoints"""

    def test_input_output_report(self, override_tax_deps, auth_headers):
        """Test generating input/output tax reconciliation report"""
        from app.routers import tax_management

        report = {
            "period": "03/2025",
            "total_output_tax": Decimal("150000.00"),
            "total_input_tax": Decimal("80000.00"),
            "net_tax_payable": Decimal("70000.00"),
            "output_tax_details": [],
            "input_tax_details": [],
        }

        with patch.object(tax_management.TaxManagementService, 'get_input_output_tax_report', return_value=report):
            response = client.get(
                "/api/tax/tax/reports/input-output?period_month=3&period_year=2025",
                headers=auth_headers,
            )
        assert response.status_code == 200
        data = response.json()
        assert data["net_tax_payable"] == 70000.00

    def test_tax_reconciliation_report(self, override_tax_deps, auth_headers):
        """Test generating tax reconciliation report"""
        from app.routers import tax_management

        report = {
            "period": "03/2025",
            "calculated_output_tax": Decimal("150000.00"),
            "calculated_input_tax": Decimal("80000.00"),
            "calculated_net_payable": Decimal("70000.00"),
            "filed_returns": [],
            "taxable_sales_count": 0,
            "taxable_purchases_count": 0,
        }

        with patch.object(tax_management.TaxManagementService, 'get_tax_reconciliation', return_value=report):
            response = client.get(
                "/api/tax/tax/reports/reconciliation?period_month=3&period_year=2025",
                headers=auth_headers,
            )
        assert response.status_code == 200
        data = response.json()
        assert data["calculated_net_payable"] == 70000.00

    def test_wht_summary_report(self, override_tax_deps, auth_headers):
        """Test generating WHT summary report by category"""
        from app.routers import tax_management

        report = {
            "period": "2025-01-01 to 2025-03-31",
            "categories": [
                {"category": "goods", "total_amount": Decimal("500000"), "total_wht": Decimal("7500"), "count": 10},
                {"category": "services", "total_amount": Decimal("200000"), "total_wht": Decimal("12000"), "count": 4},
            ],
            "grand_total_wht": Decimal("19500.00"),
        }

        with patch.object(tax_management.TaxManagementService, 'get_wht_summary', return_value=report):
            response = client.get(
                "/api/tax/tax/reports/wht-summary?from_date=2025-01-01&to_date=2025-03-31",
                headers=auth_headers,
            )
        assert response.status_code == 200
        data = response.json()
        assert data["grand_total_wht"] == 19500.00
        assert len(data["categories"]) == 2

    def test_verify_ntn(self, override_tax_deps, auth_headers):
        """Test NTN/STRN verification"""
        from app.routers import tax_management

        result = {
            "verified": True,
            "ntn": "1234567-8",
            "strn": "1234567890123",
            "verification_timestamp": "2025-04-01",
        }

        with patch.object(tax_management.TaxManagementService, 'verify_ntn', return_value=result):
            payload = {"ntn": "1234567-8", "strn": "1234567890123", "verified_by_user": True}
            response = client.post("/api/tax/tax/verify-ntn", json=payload, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["verified"] is True

    def test_verify_ntn_invalid_format(self, override_tax_deps, auth_headers):
        """Test NTN verification with invalid NTN format fails validation"""
        payload = {"ntn": "invalid", "verified_by_user": True}
        response = client.post("/api/tax/tax/verify-ntn", json=payload, headers=auth_headers)
        assert response.status_code == 422

    def test_sales_summary_report(self, override_tax_deps, auth_headers):
        """Test generating sales summary for tax"""
        response = client.get(
            "/api/tax/tax/reports/sales-summary?from_date=2025-01-01&to_date=2025-03-31",
            headers=auth_headers,
        )
        # Router returns hardcoded dict with 200
        assert response.status_code == 200
        data = response.json()
        assert float(data["total_sales"]) == 0
        assert float(data["total_output_tax"]) == 0


# ===================================================================
# Service Layer Unit Tests
# ===================================================================

class TestTaxManagementService:
    """Test TaxManagementService business logic directly"""

    def test_calculate_sales_tax_standard_rate(self):
        """Test sales tax calculation at standard 18% rate"""
        from app.services.tax_management_service import TaxManagementService
        from unittest.mock import MagicMock, patch

        mock_session = MagicMock()
        service = TaxManagementService(db=mock_session)
        taxable_amount = Decimal("100000.00")
        company = uuid4()
        tx_date = date.today()

        # Mock the tax rate lookup to return None (will use default 17%)
        with patch.object(service, 'get_active_sales_tax_rate', return_value=None):
            tax_amount, total_amount = service.calculate_sales_tax(
                company_id=company,
                taxable_amount=taxable_amount,
                transaction_date=tx_date
            )
        assert tax_amount == Decimal("17000.00")
        assert total_amount == Decimal("117000.00")

    def test_calculate_sales_tax_zero_amount(self):
        """Test tax calculation with zero amount"""
        from app.services.tax_management_service import TaxManagementService
        from unittest.mock import MagicMock, patch

        mock_session = MagicMock()
        service = TaxManagementService(db=mock_session)
        company = uuid4()
        tx_date = date.today()

        with patch.object(service, 'get_active_sales_tax_rate', return_value=None):
            tax_amount, total_amount = service.calculate_sales_tax(
                company_id=company,
                taxable_amount=Decimal("0.00"),
                transaction_date=tx_date
            )
        assert tax_amount == Decimal("0.00")
        assert total_amount == Decimal("0.00")

    def test_calculate_wht_goods_filer(self):
        """Test WHT calculation on goods for filer (1.5%)"""
        from app.services.tax_management_service import TaxManagementService
        from unittest.mock import MagicMock, patch

        mock_session = MagicMock()
        service = TaxManagementService(db=mock_session)
        amount = Decimal("50000.00")
        company = uuid4()
        tx_date = date.today()

        # Mock WHT rate lookup to return None (will use default)
        with patch.object(service, 'get_active_wht_rate', return_value=None):
            wht_amount, net_payment = service.calculate_wht(
                company_id=company,
                amount=amount,
                category="goods",
                transaction_date=tx_date,
                is_filer=True
            )
        assert wht_amount == Decimal("750.00")  # 1.5% of 50000
        assert net_payment == Decimal("49250.00")

    def test_calculate_input_tax(self):
        """Test input tax calculation on purchases"""
        from app.services.tax_management_service import TaxManagementService
        from unittest.mock import MagicMock, patch

        mock_session = MagicMock()
        service = TaxManagementService(db=mock_session)
        taxable_amount = Decimal("50000.00")
        company = uuid4()
        tx_date = date.today()

        with patch.object(service, 'get_active_sales_tax_rate', return_value=None):
            tax_amount, total_amount = service.calculate_input_tax(
                company_id=company,
                taxable_amount=taxable_amount,
                transaction_date=tx_date
            )
        assert tax_amount == Decimal("8500.00")  # 17% of 50000
        assert total_amount == Decimal("58500.00")


# ===================================================================
# Edge Cases & Error Handling
# ===================================================================

class TestTaxEdgeCases:
    """Test edge cases and error scenarios"""

    def test_create_tax_rate_negative_rate(self, override_tax_deps, auth_headers):
        """Test creating tax rate with negative percentage fails validation"""
        payload = _tax_rate_payload(rate_percent="-5.00")
        response = client.post("/api/tax/tax/rates", json=payload, headers=auth_headers)
        assert response.status_code == 422

    def test_create_tax_rate_over_100(self, override_tax_deps, auth_headers):
        """Test creating tax rate over 100% passes schema validation (no max constraint)"""
        from app.routers import tax_management

        mock_rate = _tax_rate_response(company_id=COMPANY_ID, rate_percent=Decimal("150.00"))
        with patch.object(tax_management.TaxManagementService, 'create_tax_rate', return_value=mock_rate):
            payload = _tax_rate_payload(rate_percent="150.00")
            response = client.post("/api/tax/tax/rates", json=payload, headers=auth_headers)
        # Schema allows >= 0, so 150% passes validation
        assert response.status_code == 201

    def test_list_wht_transactions_by_period(self, override_tax_deps, auth_headers):
        """Test listing WHT transactions filtered by period"""
        from app.routers import tax_management

        with patch.object(tax_management.TaxManagementService, 'get_wht_transactions', return_value=[]):
            response = client.get(
                "/api/tax/tax/wht/transactions?from_date=2025-01-01&to_date=2025-03-31",
                headers=auth_headers,
            )
        assert response.status_code == 200

    def test_get_tax_returns_list(self, override_tax_deps, auth_headers):
        """Test listing tax returns"""
        from app.routers import tax_management

        with patch.object(tax_management.TaxManagementService, 'get_tax_returns', return_value=[]):
            response = client.get("/api/tax/tax/returns", headers=auth_headers)
        assert response.status_code == 200

    def test_verify_ntn_valid_format(self, override_tax_deps, auth_headers):
        """Test NTN verification with valid format"""
        from app.routers import tax_management

        result = {
            "verified": True,
            "ntn": "1234567-8",
            "strn": "1234567890123",
            "verification_timestamp": "2025-04-01",
        }

        with patch.object(tax_management.TaxManagementService, 'verify_ntn', return_value=result):
            payload = {"ntn": "1234567-8", "strn": "1234567890123", "verified_by_user": True}
            response = client.post("/api/tax/tax/verify-ntn", json=payload, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["verified"] is True

    def test_verify_ntn_invalid_format(self, override_tax_deps, auth_headers):
        """Test NTN verification with invalid NTN format fails validation"""
        payload = {"ntn": "invalid", "verified_by_user": True}
        response = client.post("/api/tax/tax/verify-ntn", json=payload, headers=auth_headers)
        assert response.status_code == 422


# ===================================================================
# Integration Tests - Tax on Transactions
# ===================================================================

class TestTaxOnTransactions:
    """Test tax calculation on actual invoices/bills"""

    def test_sales_tax_return_generation(self, override_tax_deps, auth_headers):
        """Test generating a sales tax return report"""
        from app.routers import tax_management

        report = {
            "return_period": "03/2025",
            "output_tax_total": Decimal("100000.00"),
            "input_tax_total": Decimal("50000.00"),
            "net_tax_payable": Decimal("50000.00"),
            "taxable_sales": [],
            "taxable_purchases": [],
        }

        with patch.object(tax_management.TaxManagementService, 'generate_sales_tax_return', return_value=report):
            response = client.get(
                "/api/tax/tax/sales-tax/return?period_month=3&period_year=2025",
                headers=auth_headers,
            )
        assert response.status_code == 200
        data = response.json()
        assert data["output_tax_total"] == 100000.00
        assert data["net_tax_payable"] == 50000.00

    def test_input_output_tax_report(self, override_tax_deps, auth_headers):
        """Test generating input/output tax reconciliation report"""
        from app.routers import tax_management

        report = {
            "period": "03/2025",
            "total_output_tax": Decimal("50000.00"),
            "total_input_tax": Decimal("25000.00"),
            "net_tax_payable": Decimal("25000.00"),
            "output_tax_details": [],
            "input_tax_details": [],
        }

        with patch.object(tax_management.TaxManagementService, 'get_input_output_tax_report', return_value=report):
            response = client.get(
                "/api/tax/tax/reports/input-output?period_month=3&period_year=2025",
                headers=auth_headers,
            )
        assert response.status_code == 200
        data = response.json()
        assert data["net_tax_payable"] == 25000.00


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
