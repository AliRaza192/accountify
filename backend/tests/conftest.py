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
    """Mock supabase client for all tests - patches both database.supabase and auth.supabase"""
    from app import database
    from app.routers import auth

    mock_client = MagicMock()
    
    # Mock the supabase client in database module
    database._supabase_client = mock_client
    
    # Also patch the supabase import in auth router
    with patch.object(database, 'supabase', mock_client):
        with patch.object(auth, 'supabase', mock_client):
            yield mock_client
