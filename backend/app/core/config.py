from functools import lru_cache
from typing import Any, List, Literal, Optional
from urllib.parse import quote_plus

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _async_postgresql_url(url: str) -> str:
    """Ensure async SQLAlchemy uses asyncpg (plain postgresql:// defaults to psycopg2)."""
    import re
    u = url.strip()
    # Remove any brackets if the user accidentally left them in from Supabase UI
    u = u.replace("[", "").replace("]", "")
    
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

    google_tts_api_key: Optional[str] = None

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

    # Internal scheduler (in-process) for daily AI content
    enable_internal_scheduler: bool = False
    daily_run_hour_utc: int = 5  # 08:00 Africa/Addis_Ababa == 05:00 UTC
    daily_run_language: str = "am"

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

    @model_validator(mode="after")
    def _validate_production_requirements(self) -> "Settings":
        if not self.is_production:
            return self

        if not self.database_url and not self.supabase_database_url:
            raise ValueError("DATABASE_URL or SUPABASE_DATABASE_URL is required in production")
        if not self.internal_api_token:
            raise ValueError("INTERNAL_API_TOKEN is required in production")
        if self.llm_provider == "groq" and not self.groq_api_key:
            raise ValueError("GROQ_API_KEY is required when LLM_PROVIDER=groq")
        if self.storage_backend == "supabase":
            if not self.supabase_url:
                raise ValueError("SUPABASE_URL is required when STORAGE_BACKEND=supabase")
            if not self.supabase_service_role_key:
                raise ValueError(
                    "SUPABASE_SERVICE_ROLE_KEY is required when STORAGE_BACKEND=supabase"
                )
        
        if self.weaviate_enabled:
            if not self.weaviate_url and not self.weaviate_host:
                raise ValueError("WEAVIATE_URL or WEAVIATE_HOST is required when WEAVIATE_ENABLED=True")
                
        return self

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return _async_postgresql_url(self.database_url)
        if self.supabase_database_url:
            return _async_postgresql_url(self.supabase_database_url)
            
        # Use separate components and ensure password is URL-encoded
        encoded_password = quote_plus(self.postgres_password)
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{encoded_password}"
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
