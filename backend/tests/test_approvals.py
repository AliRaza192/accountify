"""
Tests for Approval Workflows API
Endpoints: workflows CRUD, approval requests, approve/reject actions
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
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


# ---------------------------------------------------------------------------
# Test data helpers
# ---------------------------------------------------------------------------

def create_mock_workflow(wf_id=1, company_id=None):
    """Create a mock approval workflow"""
    return {
        "id": wf_id,
        "company_id": company_id or str(uuid4()),
        "name": "Purchase Approval",
        "document_type": "purchase_order",
        "levels": 2,
        "is_active": True,
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
    }


def create_mock_approval_request(req_id=1, company_id=None):
    """Create a mock approval request"""
    return {
        "id": req_id,
        "company_id": company_id or str(uuid4()),
        "document_type": "purchase_order",
        "document_id": 100,
        "workflow_id": 1,
        "status": "pending",
        "current_level": 1,
        "requested_by": str(uuid4()),
        "requested_at": "2025-03-01T09:00:00Z",
        "completed_at": None,
        "completed_by": None
    }


def create_mock_approval_action(action_id=1, request_id=1):
    """Create a mock approval action"""
    return {
        "id": action_id,
        "request_id": request_id,
        "level": 1,
        "action": "approved",
        "actioned_by": str(uuid4()),
        "comments": "Looks good",
        "delegated_to": None,
        "actioned_at": "2025-03-02T10:00:00Z"
    }


def create_auth_headers(token="test-token"):
    """Create authorization headers"""
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def auth_headers():
    """Fixture for auth headers"""
    return create_auth_headers()


def _override_user_and_supabase(user=None, supabase_client=None):
    """Helper to override both get_current_user and get_supabase_client"""
    from app.routers import approvals

    if user is None:
        user = User(
            id="test-user-id",
            email="test@example.com",
            full_name="Test User",
            company_id="test-company-id",
            company_name="Test Company"
        )

    async def mock_get_current_user():
        return user

    def mock_get_supabase_client():
        return supabase_client

    app.dependency_overrides[approvals.get_current_user] = mock_get_current_user
    app.dependency_overrides[approvals.get_supabase_client] = mock_get_supabase_client


def _clear_overrides():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# TestWorkflowCRUD - list and create approval workflows
# ---------------------------------------------------------------------------

class TestWorkflowCRUD:
    """Test approval workflow endpoints"""

    def test_list_workflows_success(self, auth_headers, mock_supabase):
        """Test listing approval workflows with valid authentication"""
        company_id = str(uuid4())
        mock_wf = create_mock_workflow(wf_id=1, company_id=company_id)

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_wf])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/approvals/workflows", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["name"] == "Purchase Approval"

        _clear_overrides()

    def test_list_workflows_empty_result(self, auth_headers, mock_supabase):
        """Test listing workflows when none exist"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/approvals/workflows", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data == []

        _clear_overrides()

    def test_list_workflows_no_supabase(self, auth_headers):
        """Test listing workflows when supabase client is None"""
        _override_user_and_supabase(supabase_client=None)

        response = client.get("/api/approvals/workflows", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

        _clear_overrides()

    def test_create_workflow_success(self, auth_headers, mock_supabase):
        """Test creating an approval workflow"""
        company_id = str(uuid4())
        mock_wf = create_mock_workflow(wf_id=5, company_id=company_id)
        mock_wf["name"] = "Invoice Approval"
        mock_wf["document_type"] = "invoice"
        mock_wf["levels"] = 3
        mock_wf["is_active"] = True

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_wf])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        workflow_data = {
            "name": "Invoice Approval",
            "document_type": "invoice",
            "levels": 3,
            "is_active": True
        }

        response = client.post("/api/approvals/workflows", json=workflow_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Invoice Approval"
        assert data["document_type"] == "invoice"
        assert data["levels"] == 3

        _clear_overrides()

    def test_create_workflow_insert_fails(self, auth_headers, mock_supabase):
        """Test creating workflow when insert returns no data"""
        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        workflow_data = {
            "name": "Failed Workflow",
            "document_type": "bill",
            "levels": 1
        }

        response = client.post("/api/approvals/workflows", json=workflow_data, headers=auth_headers)

        assert response.status_code == 500
        assert "Failed to create workflow" in response.json()["detail"]

        _clear_overrides()

    def test_create_workflow_no_supabase(self, auth_headers):
        """Test creating workflow without supabase returns 500"""
        _override_user_and_supabase(supabase_client=None)

        workflow_data = {
            "name": "No Client Workflow",
            "document_type": "expense",
            "levels": 1
        }

        response = client.post("/api/approvals/workflows", json=workflow_data, headers=auth_headers)

        assert response.status_code == 500
        assert "Supabase client not available" in response.json()["detail"]

        _clear_overrides()

    def test_create_workflow_missing_name(self, auth_headers):
        """Test creating workflow without required name field"""
        _override_user_and_supabase()

        workflow_data = {
            "document_type": "purchase_order",
            "levels": 2
        }

        response = client.post("/api/approvals/workflows", json=workflow_data, headers=auth_headers)

        assert response.status_code == 422

        _clear_overrides()

    def test_create_workflow_defaults(self, auth_headers, mock_supabase):
        """Test creating workflow with defaults for optional fields"""
        company_id = str(uuid4())
        mock_wf = create_mock_workflow(wf_id=6, company_id=company_id)
        mock_wf["levels"] = 1
        mock_wf["is_active"] = True

        mock_query = MagicMock()
        mock_query.insert.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_wf])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        workflow_data = {
            "name": "Minimal Workflow",
            "document_type": "journal_entry"
        }

        response = client.post("/api/approvals/workflows", json=workflow_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["levels"] == 1
        assert data["is_active"] is True

        _clear_overrides()


# ---------------------------------------------------------------------------
# TestApprovalRequests - list and get approval requests
# ---------------------------------------------------------------------------

class TestApprovalRequests:
    """Test approval request endpoints"""

    def test_list_approval_requests_success(self, auth_headers, mock_supabase):
        """Test listing approval requests"""
        company_id = str(uuid4())
        mock_req = create_mock_approval_request(req_id=10, company_id=company_id)

        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[mock_req])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/approvals/requests", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["status"] == "pending"

        _clear_overrides()

    def test_list_approval_requests_with_status_filter(self, auth_headers, mock_supabase):
        """Test listing approval requests filtered by status"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.order.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/approvals/requests?status=approved", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data == []

        _clear_overrides()

    def test_list_approval_requests_no_supabase(self, auth_headers):
        """Test listing requests when supabase client is None"""
        _override_user_and_supabase(supabase_client=None)

        response = client.get("/api/approvals/requests", headers=auth_headers)

        assert response.status_code == 200
        assert response.json() == []

        _clear_overrides()

    def test_get_approval_request_success(self, auth_headers, mock_supabase):
        """Test getting a specific approval request with actions"""
        company_id = str(uuid4())
        mock_req = create_mock_approval_request(req_id=42, company_id=company_id)
        mock_action = create_mock_approval_action(request_id=42)

        mock_req_query = MagicMock()
        mock_req_query.select.return_value = mock_req_query
        mock_req_query.eq.return_value = mock_req_query
        mock_req_query.execute.return_value = MagicMock(data=[mock_req])

        mock_action_query = MagicMock()
        mock_action_query.select.return_value = mock_action_query
        mock_action_query.eq.return_value = mock_action_query
        mock_action_query.order.return_value = mock_action_query
        mock_action_query.execute.return_value = MagicMock(data=[mock_action])

        mock_supabase.table.side_effect = [mock_req_query, mock_action_query]

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/approvals/requests/42", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "request" in data
        assert "actions" in data
        assert data["request"]["id"] == 42
        assert len(data["actions"]) == 1

        _clear_overrides()

    def test_get_approval_request_not_found(self, auth_headers, mock_supabase):
        """Test getting non-existent approval request"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/approvals/requests/999", headers=auth_headers)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

        _clear_overrides()

    def test_get_approval_request_no_supabase(self, auth_headers):
        """Test getting request without supabase returns 500"""
        _override_user_and_supabase(supabase_client=None)

        response = client.get("/api/approvals/requests/1", headers=auth_headers)

        assert response.status_code == 500

        _clear_overrides()

    def test_get_approval_request_no_actions(self, auth_headers, mock_supabase):
        """Test getting request that has no actions yet"""
        company_id = str(uuid4())
        mock_req = create_mock_approval_request(req_id=7, company_id=company_id)

        mock_req_query = MagicMock()
        mock_req_query.select.return_value = mock_req_query
        mock_req_query.eq.return_value = mock_req_query
        mock_req_query.execute.return_value = MagicMock(data=[mock_req])

        mock_action_query = MagicMock()
        mock_action_query.select.return_value = mock_action_query
        mock_action_query.eq.return_value = mock_action_query
        mock_action_query.order.return_value = mock_action_query
        mock_action_query.execute.return_value = MagicMock(data=[])

        mock_supabase.table.side_effect = [mock_req_query, mock_action_query]

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.get("/api/approvals/requests/7", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["request"]["id"] == 7
        assert data["actions"] == []

        _clear_overrides()


# ---------------------------------------------------------------------------
# TestApprovalActions - approve and reject approval requests
# ---------------------------------------------------------------------------

class TestApprovalActions:
    """Test approve/reject action endpoints"""

    def test_approve_request_success(self, auth_headers, mock_supabase):
        """Test approving an approval request"""
        company_id = str(uuid4())
        mock_req = create_mock_approval_request(req_id=20, company_id=company_id)
        mock_req["current_level"] = 1

        updated_req = dict(mock_req)
        updated_req["status"] = "approved"
        updated_req["current_level"] = 2

        mock_req_query = MagicMock()
        mock_req_query.select.return_value = mock_req_query
        mock_req_query.eq.return_value = mock_req_query
        mock_req_query.execute.return_value = MagicMock(data=[mock_req])

        mock_action_query = MagicMock()
        mock_action_query.insert.return_value = mock_action_query
        mock_action_query.execute.return_value = MagicMock(data=[create_mock_approval_action(request_id=20)])

        mock_update_query = MagicMock()
        mock_update_query.update.return_value = mock_update_query
        mock_update_query.eq.return_value = mock_update_query
        mock_update_query.execute.return_value = MagicMock(data=[updated_req])

        mock_supabase.table.side_effect = [
            mock_req_query,     # get request
            mock_action_query,  # insert action
            mock_update_query,  # update request
        ]

        _override_user_and_supabase(supabase_client=mock_supabase)

        approve_data = {
            "comments": "Approved by manager"
        }

        response = client.post("/api/approvals/requests/20/approve", json=approve_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"

        _clear_overrides()

    def test_approve_request_with_delegation(self, auth_headers, mock_supabase):
        """Test approving request with delegation to another user"""
        company_id = str(uuid4())
        mock_req = create_mock_approval_request(req_id=21, company_id=company_id)
        mock_req["current_level"] = 1

        updated_req = dict(mock_req)
        updated_req["status"] = "approved"
        updated_req["current_level"] = 2

        mock_req_query = MagicMock()
        mock_req_query.select.return_value = mock_req_query
        mock_req_query.eq.return_value = mock_req_query
        mock_req_query.execute.return_value = MagicMock(data=[mock_req])

        mock_action_query = MagicMock()
        mock_action_query.insert.return_value = mock_action_query
        mock_action_query.execute.return_value = MagicMock(data=[create_mock_approval_action(request_id=21)])

        mock_update_query = MagicMock()
        mock_update_query.update.return_value = mock_update_query
        mock_update_query.eq.return_value = mock_update_query
        mock_update_query.execute.return_value = MagicMock(data=[updated_req])

        mock_supabase.table.side_effect = [
            mock_req_query,
            mock_action_query,
            mock_update_query,
        ]

        _override_user_and_supabase(supabase_client=mock_supabase)

        approve_data = {
            "comments": "Delegated for final sign-off",
            "delegate_to": str(uuid4())
        }

        response = client.post("/api/approvals/requests/21/approve", json=approve_data, headers=auth_headers)

        assert response.status_code == 200

        _clear_overrides()

    def test_approve_request_not_found(self, auth_headers, mock_supabase):
        """Test approving non-existent request"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        approve_data = {"comments": "Approved"}

        response = client.post("/api/approvals/requests/999/approve", json=approve_data, headers=auth_headers)

        assert response.status_code == 404

        _clear_overrides()

    def test_approve_request_no_supabase(self, auth_headers):
        """Test approving request without supabase returns 500"""
        _override_user_and_supabase(supabase_client=None)

        approve_data = {"comments": "Approved"}

        response = client.post("/api/approvals/requests/1/approve", json=approve_data, headers=auth_headers)

        assert response.status_code == 500

        _clear_overrides()

    def test_reject_request_success(self, auth_headers, mock_supabase):
        """Test rejecting an approval request"""
        company_id = str(uuid4())
        mock_req = create_mock_approval_request(req_id=30, company_id=company_id)
        mock_req["current_level"] = 1

        updated_req = dict(mock_req)
        updated_req["status"] = "rejected"

        mock_req_query = MagicMock()
        mock_req_query.select.return_value = mock_req_query
        mock_req_query.eq.return_value = mock_req_query
        mock_req_query.execute.return_value = MagicMock(data=[mock_req])

        mock_action_query = MagicMock()
        mock_action_query.insert.return_value = mock_action_query
        mock_action_query.execute.return_value = MagicMock(data=[
            create_mock_approval_action(action_id=1, request_id=30)
        ])

        mock_update_query = MagicMock()
        mock_update_query.update.return_value = mock_update_query
        mock_update_query.eq.return_value = mock_update_query
        mock_update_query.execute.return_value = MagicMock(data=[updated_req])

        mock_supabase.table.side_effect = [
            mock_req_query,
            mock_action_query,
            mock_update_query,
        ]

        _override_user_and_supabase(supabase_client=mock_supabase)

        reject_data = {
            "comments": "Budget exceeded, needs revision"
        }

        response = client.post("/api/approvals/requests/30/reject", json=reject_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "rejected"

        _clear_overrides()

    def test_reject_request_not_found(self, auth_headers, mock_supabase):
        """Test rejecting non-existent request"""
        mock_query = MagicMock()
        mock_query.select.return_value = mock_query
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value = mock_query

        _override_user_and_supabase(supabase_client=mock_supabase)

        reject_data = {"comments": "Rejected"}

        response = client.post("/api/approvals/requests/888/reject", json=reject_data, headers=auth_headers)

        assert response.status_code == 404

        _clear_overrides()

    def test_reject_request_no_supabase(self, auth_headers):
        """Test rejecting request without supabase returns 500"""
        _override_user_and_supabase(supabase_client=None)

        reject_data = {"comments": "Rejected"}

        response = client.post("/api/approvals/requests/1/reject", json=reject_data, headers=auth_headers)

        assert response.status_code == 500

        _clear_overrides()

    def test_reject_request_no_comments(self, auth_headers, mock_supabase):
        """Test rejecting request without comments (optional field)"""
        company_id = str(uuid4())
        mock_req = create_mock_approval_request(req_id=31, company_id=company_id)
        mock_req["current_level"] = 1

        updated_req = dict(mock_req)
        updated_req["status"] = "rejected"

        mock_req_query = MagicMock()
        mock_req_query.select.return_value = mock_req_query
        mock_req_query.eq.return_value = mock_req_query
        mock_req_query.execute.return_value = MagicMock(data=[mock_req])

        mock_action_query = MagicMock()
        mock_action_query.insert.return_value = mock_action_query
        mock_action_query.execute.return_value = MagicMock(data=[
            create_mock_approval_action(action_id=2, request_id=31)
        ])

        mock_update_query = MagicMock()
        mock_update_query.update.return_value = mock_update_query
        mock_update_query.eq.return_value = mock_update_query
        mock_update_query.execute.return_value = MagicMock(data=[updated_req])

        mock_supabase.table.side_effect = [
            mock_req_query,
            mock_action_query,
            mock_update_query,
        ]

        _override_user_and_supabase(supabase_client=mock_supabase)

        response = client.post("/api/approvals/requests/31/reject", json={}, headers=auth_headers)

        assert response.status_code == 200

        _clear_overrides()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
