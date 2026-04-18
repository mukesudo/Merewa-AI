import asyncio
import uuid
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import requests

from ..core.config import get_settings


settings = get_settings()


class StorageService:
    def __init__(self) -> None:
        self.backend = settings.storage_backend

    async def store_upload(
        self,
        *,
        content: bytes,
        filename: str,
        content_type: Optional[str],
        folder: str,
    ) -> str:
        extension = Path(filename).suffix.lower()
        object_name = f"{folder}/{uuid.uuid4()}{extension}"

        if settings.storage_backend == "supabase":
            return await asyncio.to_thread(
                self._store_supabase,
                object_name,
                content,
                content_type or "application/octet-stream",
            )
        return await asyncio.to_thread(self._store_local, object_name, content)

    def _store_local(self, object_name: str, content: bytes) -> str:
        root = Path(__file__).resolve().parents[2] / settings.local_upload_dir
        file_path = root / object_name
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(content)
        return f"/uploads/{object_name}"

    def _store_supabase(self, object_name: str, content: bytes, content_type: str) -> str:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError("Supabase storage is not configured")

        endpoint = (
            f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
            f"{settings.supabase_storage_bucket}/{quote(object_name, safe='/')}"
        )
        response = requests.post(
            endpoint,
            headers={
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "apikey": settings.supabase_service_role_key,
                "x-upsert": "true",
                "Content-Type": content_type,
            },
            data=content,
            timeout=30,
        )
        response.raise_for_status()
        return (
            f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/"
            f"{settings.supabase_storage_bucket}/{quote(object_name, safe='/')}"
        )


storage_service = StorageService()
