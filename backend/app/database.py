from supabase import create_client, Client
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Supabase client for auth operations (lazy initialization)
_supabase_client: Client = None


def get_supabase():
    """Get Supabase client (lazy initialization)"""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase_client


# For backward compatibility
supabase = get_supabase()


# SQLAlchemy engine for other database operations
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency for getting SQLAlchemy database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
