import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add backend app to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.main import app

client = TestClient(app)


class TestAuth:
    """Test authentication endpoints"""
    
    @patch('app.routers.auth.supabase')
    def test_register(self, mock_supabase):
        """Test user registration with valid data"""
        # Mock Supabase response
        mock_supabase.auth.sign_up.return_value = MagicMock(
            user=MagicMock(id="test-user-id")
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "test-user-id", "full_name": "Test User"}]
        )
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
        mock_supabase.auth.sign_in_with_password.return_value = MagicMock(
            user=MagicMock(id="test-user-id", email="test@example.com"),
            session=MagicMock(access_token="test-token")
        )
        
        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "password": "TestPass123!",
                "full_name": "Test User",
                "company_name": "Test Company"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] is not None
        assert data["user"]["email"] == "test@example.com"
    
    @patch('app.routers.auth.supabase')
    def test_login(self, mock_supabase):
        """Test login with valid credentials"""
        # Mock Supabase response
        mock_supabase.auth.sign_in_with_password.return_value = MagicMock(
            user=MagicMock(id="test-user-id", email="test@example.com"),
            session=MagicMock(access_token="test-token")
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{
                "full_name": "Test User",
                "company_id": "test-company-id",
                "companies": {"name": "Test Company"}
            }]
        )
        
        response = client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPass123!"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] is not None
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["full_name"] == "Test User"
    
    @patch('app.routers.auth.supabase')
    def test_login_invalid(self, mock_supabase):
        """Test login with invalid credentials returns 401"""
        # Mock Supabase response for invalid credentials
        mock_supabase.auth.sign_in_with_password.return_value = MagicMock(
            user=None,
            session=None
        )
        
        response = client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "WrongPassword"
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    @patch('app.routers.auth.supabase')
    def test_get_me(self, mock_supabase):
        """Test get current user with valid token"""
        # Mock Supabase response
        mock_supabase.auth.get_user.return_value = MagicMock(
            user=MagicMock(id="test-user-id", email="test@example.com")
        )
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{
                "full_name": "Test User",
                "company_id": "test-company-id",
                "companies": {"name": "Test Company"}
            }]
        )
        
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test-user-id"
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
    
    def test_get_me_no_token(self):
        """Test get current user without token returns 401"""
        response = client.get("/api/auth/me")
        
        assert response.status_code == 401
    
    def test_get_me_invalid_token(self):
        """Test get current user with invalid token returns 401"""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        assert response.status_code == 401


class TestHealth:
    """Test health check endpoint"""
    
    def test_health_check(self):
        """Test health check returns 200"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_root(self):
        """Test root endpoint"""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert "AI Accounts API running" in data["status"]
        assert data["version"] == "1.0.0"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
