import os
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

load_dotenv()


def _normalize_database_url(raw_url: str) -> str:
    """Convert URL formats from Vercel/Neon to SQLAlchemy asyncpg format."""
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw_url


def _resolve_database_url() -> str:
    """
    Resolve a Postgres URL from common Vercel/local environment variables.

    Preference order:
    1) POSTGRES_URL_NON_POOLING (often safest with async drivers)
    2) POSTGRES_URL
    3) DATABASE_URL (generic fallback)
    """
    raw = (
        os.getenv("POSTGRES_URL_NON_POOLING")
        or os.getenv("POSTGRES_URL")
        or os.getenv("DATABASE_URL")
        or ""
    )
    return _normalize_database_url(raw)


DATABASE_URL = _resolve_database_url()

if not DATABASE_URL:
    raise RuntimeError(
        "Database URL missing. Set POSTGRES_URL_NON_POOLING, POSTGRES_URL, or DATABASE_URL."
    )

engine = create_async_engine(
    DATABASE_URL,
    # In serverless functions, avoiding long-lived pools prevents stale connections.
    poolclass=NullPool,
    pool_pre_ping=True,
    pool_recycle=1800,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
