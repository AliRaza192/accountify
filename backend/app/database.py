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
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _supabase_client


# For backward compatibility - initialize on import
supabase = get_supabase()


# SQLAlchemy engine for other database operations with SSL support
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency for getting SQLAlchemy database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
