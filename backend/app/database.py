import logging
from typing import Optional
from supabase import create_client, Client
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

logger = logging.getLogger(__name__)

# Supabase client for auth operations (lazy initialization)
_supabase_client: Optional[Client] = None


def get_supabase_client():
    """Get Supabase client (lazy initialization)"""
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
            logger.warning("Supabase credentials not configured - SUPABASE_URL or SUPABASE_SERVICE_KEY missing")
            return None
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.warning(f"Supabase client initialization failed: {e}")
            return None
    return _supabase_client


# SQLAlchemy engine - lazy initialization to avoid blocking startup
_engine = None
_SessionLocal = None


def get_engine():
    """Get SQLAlchemy engine (lazy initialization)"""
    global _engine
    if _engine is None:
        if not settings.DATABASE_URL:
            logger.warning("Database URL not configured - DATABASE_URL missing")
            return None
        try:
            _engine = create_engine(
                settings.DATABASE_URL,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20
            )
            logger.info("Database engine initialized successfully")
        except Exception as e:
            logger.warning(f"Database engine initialization failed: {e}")
            return None
    return _engine


def get_session_local():
    """Get SessionLocal class (lazy initialization)"""
    global _SessionLocal
    if _SessionLocal is None:
        engine = get_engine()
        if engine is None:
            return None
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _SessionLocal


def get_db():
    """Dependency for getting SQLAlchemy database session"""
    session_local = get_session_local()
    if session_local is None:
        raise Exception("Database session not available - check DATABASE_URL configuration")
    db = session_local()
    try:
        yield db
    finally:
        db.close()


# For backward compatibility
def __getattr__(name):
    if name == "supabase":
        return get_supabase_client()
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
