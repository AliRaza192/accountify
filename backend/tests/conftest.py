import pytest
from unittest.mock import patch, MagicMock
import sys
import os

# Add backend app to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Set environment variables before importing anything else
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_SERVICE_KEY'] = 'test-key'
os.environ['SUPABASE_JWT_SECRET'] = 'test-jwt-secret'
os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost/test'
os.environ['GEMINI_API_KEY'] = 'test-key'
os.environ['SECRET_KEY'] = 'test-secret'


@pytest.fixture(scope='session', autouse=True)
def mock_settings():
    """Mock settings for all tests"""
    from app.config import settings

    settings.SUPABASE_URL = "https://test.supabase.co"
    settings.SUPABASE_SERVICE_KEY = "test-key"
    settings.SUPABASE_JWT_SECRET = "test-jwt-secret"
    settings.DATABASE_URL = "postgresql://test:test@localhost/test"
    settings.GEMINI_API_KEY = "test-key"
    settings.SECRET_KEY = "test-secret"

    yield settings


@pytest.fixture(scope='function', autouse=True)
def mock_supabase():
    """Mock supabase client for all tests - patches app.database.supabase"""
    from app import database
    from app.routers import auth

    mock_client = MagicMock()

    # Patch the supabase attribute in database module (accessed via __getattr__)
    with patch.object(database, 'supabase', mock_client, create=True):
        # Also patch the auth router's direct import
        with patch('app.routers.auth.supabase', mock_client):
            yield mock_client


@pytest.fixture
def override_dependencies():
    """Override FastAPI dependencies for customers router tests"""
    from app.main import app
    from app.routers import customers
    from app.types import User
    from uuid import uuid4

    # Create a mock current user
    mock_user = User(
        id="test-user-id",
        email="test@example.com",
        full_name="Test User",
        role="user",
        company_id="test-company-id",
        company_name="Test Company"
    )

    # Override get_current_user dependency
    async def mock_get_current_user():
        return mock_user

    # Override get_supabase_client dependency
    def mock_get_supabase_client():
        from app import database
        return database._supabase_client

    # Apply overrides
    app.dependency_overrides[customers.get_current_user] = mock_get_current_user
    app.dependency_overrides[customers.get_supabase_client] = mock_get_supabase_client

    yield mock_user

    # Clean up overrides after test
    app.dependency_overrides.clear()
