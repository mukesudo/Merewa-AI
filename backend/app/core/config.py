from functools import lru_cache
from typing import Any, List, Literal, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _async_postgresql_url(url: str) -> str:
    """Ensure async SQLAlchemy uses asyncpg (plain postgresql:// defaults to psycopg2)."""
    import re
    u = url.strip()
    if re.match(r"^postgres(ql)?\+", u):
        return u
    if u.startswith("postgresql://"):
        return "postgresql+asyncpg://" + u[len("postgresql://") :]
    if u.startswith("postgres://"):
        return "postgresql+asyncpg://" + u[len("postgres://") :]
    return u


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Merewa API"
    environment: str = "development"
    debug: bool = False
    api_prefix: str = "/api"
    cors_origins: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )
    public_backend_url: Optional[str] = None

    database_url: Optional[str] = None
    supabase_database_url: Optional[str] = None
    postgres_user: str = "merewa"
    postgres_password: str = "password"
    postgres_host: str = "127.0.0.1"
    postgres_port: int = 5433
    postgres_db: str = "merewa_db"

    llm_provider: Literal["groq", "ollama"] = "groq"
    llm_model: str = "llama-3.1-8b-instant"
    llm_timeout_seconds: int = 45
    groq_api_key: Optional[str] = None
    groq_base_url: str = "https://api.groq.com/openai/v1"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "gemma2:2b"

    redis_url: Optional[str] = None
    upstash_redis_url: Optional[str] = None
    internal_api_token: Optional[str] = None

    storage_backend: Literal["local", "supabase"] = "local"
    local_upload_dir: str = "uploads"
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_storage_bucket: str = "merewa-media"

    weaviate_enabled: bool = False
    weaviate_host: Optional[str] = "127.0.0.1"
    weaviate_http_port: int = 8080
    weaviate_grpc_port: int = 50051
    weaviate_url: Optional[str] = None
    weaviate_api_key: Optional[str] = None
    weaviate_collection_name: str = "PostMemory"

    auto_seed_demo_data: bool = False
    seed_personas_on_startup: bool = True
    auto_create_tables: bool = True
    default_viewer_id: int = 1
    fail_fast_startup: bool = False

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _normalize_cors_origins(cls, value: Any) -> List[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        raise TypeError("cors_origins must be a list or comma-separated string")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return _async_postgresql_url(self.database_url)
        if self.supabase_database_url:
            return _async_postgresql_url(self.supabase_database_url)
            
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def resolved_redis_url(self) -> str:
        return self.upstash_redis_url or self.redis_url or "redis://127.0.0.1:6379/0"

    @property
    def resolved_internal_api_token(self) -> str:
        return self.internal_api_token or "merewa-internal-dev-token"

    @property
    def resolved_public_backend_url(self) -> str:
        return (self.public_backend_url or "http://127.0.0.1:8000").rstrip("/")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
