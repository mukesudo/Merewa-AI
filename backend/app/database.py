import logging
import ssl as _ssl
from urllib.parse import parse_qs, quote_plus, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from .core.config import get_settings
from .models import Base


settings = get_settings()
logger = logging.getLogger(__name__)


def _build_engine_kwargs() -> dict:
    """
    Build the keyword arguments for create_async_engine.

    Handles Supabase / asyncpg / Supavisor specific issues:
    1. asyncpg does NOT parse ?sslmode=require from the URL — it must be
       passed as a separate `ssl` connect_arg.
    2. Supabase transaction-mode pooler does not support prepared statements.
       We must set both asyncpg's `statement_cache_size=0` AND 
       SQLAlchemy's `prepared_statement_cache_size=0`.
    3. Disable SQLAlchemy internal pooling (use NullPool) when using 
       an external pooler like Supavisor.
    """
    raw_url = settings.resolved_database_url
    parsed = urlparse(raw_url)
    query_params = parse_qs(parsed.query)

    # --- Re-encode the password to handle special characters ---
    if parsed.password:
        safe_password = quote_plus(parsed.password)
        userinfo = parsed.username or ""
        userinfo += f":{safe_password}"
        host_part = parsed.hostname or ""
        if parsed.port:
            host_part += f":{parsed.port}"
        new_netloc = f"{userinfo}@{host_part}"
        parsed = parsed._replace(netloc=new_netloc)

    # --- Strip sslmode from the URL and convert to an asyncpg ssl arg ---
    needs_ssl = False
    if "sslmode" in query_params:
        needs_ssl = query_params["sslmode"][0] in ("require", "verify-ca", "verify-full")
        query_params.pop("sslmode", None)

    is_supabase = parsed.hostname and (
        "supabase.co" in parsed.hostname or "supabase.com" in parsed.hostname
    )
    if is_supabase:
        needs_ssl = True

    # Rebuild the URL without sslmode
    clean_query = "&".join(f"{k}={v[0]}" for k, v in query_params.items())
    clean_url = urlunparse(parsed._replace(query=clean_query))

    connect_args: dict = {}
    if needs_ssl:
        ctx = _ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = _ssl.CERT_NONE
        connect_args["ssl"] = ctx

    # Default engine arguments
    engine_kwargs = {
        "url": clean_url,
        "echo": settings.debug,
        "future": True,
        "connect_args": connect_args,
    }

    # --- Supabase / External Pooler Optimization ---
    if is_supabase or parsed.port == 6543:
        # 1. Disable asyncpg's internal statement cache
        connect_args["statement_cache_size"] = 0
        # 2. Disable SQLAlchemy internal pooling (Supavisor handles pooling)
        engine_kwargs["poolclass"] = NullPool
        # 3. Disable pre-ping as it uses prepared statements
        engine_kwargs["pool_pre_ping"] = False
    else:
        engine_kwargs["pool_pre_ping"] = True


    # --- Diagnostic logging (password masked) ---
    masked_password = "***" if parsed.password else "(empty)"
    logger.info(
        "DB connection: user=%s host=%s port=%s db=%s ssl=%s supabase=%s password=%s",
        parsed.username,
        parsed.hostname,
        parsed.port,
        parsed.path,
        needs_ssl,
        is_supabase,
        masked_password,
    )

    return engine_kwargs


engine = create_async_engine(**_build_engine_kwargs())
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_models() -> None:
    if not settings.auto_create_tables:
        return
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
