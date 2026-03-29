import os
from collections.abc import AsyncGenerator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

load_dotenv()


def _normalize_database_url(raw_url: str) -> str:
    """Convert URL formats from Vercel/Neon to SQLAlchemy asyncpg format."""
    if raw_url.startswith("postgres://"):
        normalized = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif raw_url.startswith("postgresql://"):
        normalized = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    else:
        normalized = raw_url

    # asyncpg expects a smaller set of query parameters than libpq-style URLs.
    # We normalize `sslmode` and discard incompatible extras.
    parts = urlsplit(normalized)
    query_items = parse_qsl(parts.query, keep_blank_values=True)
    if query_items:
        allowed_keys = {
            "ssl",
            "timeout",
            "command_timeout",
            "statement_cache_size",
            "max_cached_statement_lifetime",
            "max_cacheable_statement_size",
        }
        rebuilt_query: list[tuple[str, str]] = []
        has_ssl = False
        for key, value in query_items:
            if key == "ssl":
                has_ssl = True
                rebuilt_query.append((key, value))
                continue
            if key == "sslmode":
                if not has_ssl:
                    ssl_value = value.strip().lower()
                    rebuilt_query.append(
                        ("ssl", "true" if ssl_value in {"require", "verify-ca", "verify-full", "prefer"} else "false")
                    )
                    has_ssl = True
                continue
            if key in allowed_keys:
                rebuilt_query.append((key, value))

        normalized = urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(rebuilt_query), parts.fragment)
        )

    return normalized


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
    if raw:
        return _normalize_database_url(raw)

    # Local fallback to simplify development when Postgres variables are not set.
    if not os.getenv("VERCEL"):
        return "sqlite+aiosqlite:///./cuentasclaras.db"

    return ""


DATABASE_URL = _resolve_database_url()
engine = None
AsyncSessionLocal = None

if DATABASE_URL:
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
    if AsyncSessionLocal is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Database is not configured. Set POSTGRES_URL_NON_POOLING, "
                "POSTGRES_URL, or DATABASE_URL in environment variables."
            ),
        )
    async with AsyncSessionLocal() as session:
        yield session
