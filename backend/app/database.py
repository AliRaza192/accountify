import logging
from supabase import create_client, Client
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Validate required environment variables
if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
    raise ValueError(
        "Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set. "
        "Please check your .env file or environment configuration."
    )

if not settings.DATABASE_URL:
    raise ValueError(
        "Missing required environment variable: DATABASE_URL must be set. "
        "Please check your .env file or environment configuration."
    )

# Supabase client for auth operations (lazy initialization)
_supabase_client: Client = None


def get_supabase():
    """Get Supabase client (lazy initialization)"""
    global _supabase_client
    if _supabase_client is None:
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        except Exception:
            # Return None if credentials are invalid - allows app to start for health checks
            logger = logging.getLogger(__name__)
            logger.warning("Supabase client initialization failed - check credentials")
            return None
    return _supabase_client


# For backward compatibility - lazy initialization
def __getattr__(name):
    if name == "supabase":
        return get_supabase()
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")


# SQLAlchemy engine - lazy initialization to avoid blocking startup
_engine = None
_SessionLocal = None


def get_engine():
    """Get SQLAlchemy engine (lazy initialization)"""
    global _engine
    if _engine is None:
        _engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
    return _engine


def get_session_local():
    """Get SessionLocal class (lazy initialization)"""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal


def get_db():
    """Dependency for getting SQLAlchemy database session"""
    db = get_session_local()()
    try:
        yield db
    finally:
        db.close()
