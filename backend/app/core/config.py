from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def resolved_cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    database_url: Optional[str] = None
    postgres_user: str = "merewa"
    postgres_password: str = "password"
    postgres_host: str = "127.0.0.1"
    postgres_port: int = 5433
    postgres_db: str = "merewa_db"

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "gemma2:2b"
    ollama_timeout_seconds: int = 45

    redis_url: str = "redis://127.0.0.1:6379/0"
    internal_api_token: str = "merewa-internal-dev-token"

    weaviate_enabled: bool = True
    weaviate_host: str = "127.0.0.1"
    weaviate_http_port: int = 8080
    weaviate_grpc_port: int = 50051
    weaviate_collection_name: str = "PostMemory"

    auto_seed_demo_data: bool = True
    default_viewer_id: int = 1

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url

        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
