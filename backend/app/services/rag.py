import asyncio
import hashlib
import math
import re
import uuid
from typing import Dict, List, Optional
import requests

import weaviate
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from weaviate.classes.config import Configure, DataType, Property
from weaviate.classes.query import MetadataQuery

from ..core.config import get_settings
from ..models import Interaction, Post


settings = get_settings()


class RAGService:
    def __init__(self) -> None:
        self.collection_name = settings.weaviate_collection_name
        self._client = None
        self._collection_ready = False

    def _embed(self, text: str, dimensions: int = 768) -> List[float]:
        """Try to get embeddings from Ollama, fallback to hashing if it fails."""
        try:
            response = requests.post(
                f"{settings.ollama_base_url.rstrip('/')}/api/embed",
                json={
                    "model": "nomic-embed-text",
                    "input": text,
                },
                timeout=5,
            )
            response.raise_for_status()
            embeddings = response.json().get("embeddings", [])
            if embeddings and len(embeddings) > 0:
                # Ollama returns a list of embeddings if input was a string or list
                # If we passed a string, it returns [[...]] usually, check structure
                vector = embeddings[0] if isinstance(embeddings[0], list) else embeddings
                return vector
        except Exception as e:
            # Fallback to local crude hashing if Ollama is down or model missing
            return self._embed_fallback(text, dimensions=96) # Local hashing uses 96 dims
        
        return self._embed_fallback(text, dimensions=96)

    def _embed_fallback(self, text: str, dimensions: int = 96) -> List[float]:
        tokens = re.findall(r"\w+", (text or "").lower(), flags=re.UNICODE)
        if not tokens:
            return [0.0] * dimensions

        vector = [0.0] * dimensions
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            for index in range(dimensions):
                byte = digest[index % len(digest)]
                vector[index] += (byte / 255.0) * 2 - 1

        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]

    def _connect(self):
        if self._client is None:
            self._client = weaviate.connect_to_local(
                host=settings.weaviate_host,
                port=settings.weaviate_http_port,
                grpc_port=settings.weaviate_grpc_port,
                skip_init_checks=True,
            )
        return self._client

    def _ensure_collection_sync(self) -> bool:
        if not settings.weaviate_enabled:
            return False

        client = self._connect()
        if self._collection_ready:
            return True

        if not client.collections.exists(self.collection_name):
            client.collections.create(
                name=self.collection_name,
                properties=[
                    Property(name="post_id", data_type=DataType.INT),
                    Property(name="content", data_type=DataType.TEXT),
                    Property(name="author", data_type=DataType.TEXT),
                    Property(name="language", data_type=DataType.TEXT),
                    Property(name="persona_key", data_type=DataType.TEXT),
                ],
                vectorizer_config=Configure.Vectorizer.none(),
            )

        self._collection_ready = True
        return True

    async def ensure_collection(self) -> bool:
        try:
            return await asyncio.to_thread(self._ensure_collection_sync)
        except Exception:
            return False

    async def ingest_post(self, post: Post) -> None:
        if not settings.weaviate_enabled or post.content is None:
            return

        ready = await self.ensure_collection()
        if not ready:
            return

        payload = {
            "post_id": post.id,
            "content": post.content,
            "author": post.author.username if post.author is not None else "unknown",
            "language": post.language,
            "persona_key": post.persona_key or "",
        }
        vector = self._embed(f"{post.content} {post.language} {post.persona_key or ''}")
        object_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"merewa-post-{post.id}"))

        def _write() -> None:
            collection = self._connect().collections.get(self.collection_name)
            if collection.data.exists(object_id):
                collection.data.replace(object_id, payload, vector=vector)
            else:
                collection.data.insert(payload, uuid=object_id, vector=vector)

        try:
            await asyncio.to_thread(_write)
        except Exception:
            return

    async def search(self, query: str, db: AsyncSession, limit: int = 5) -> List[Dict[str, object]]:
        if not query.strip():
            return []

        remote = await self._search_weaviate(query=query, limit=limit)
        if remote:
            return remote

        return await self._search_local(query=query, db=db, limit=limit)

    async def _search_weaviate(self, query: str, limit: int) -> List[Dict[str, object]]:
        ready = await self.ensure_collection()
        if not ready:
            return []

        near_vector = self._embed(query)

        def _query() -> List[Dict[str, object]]:
            collection = self._connect().collections.get(self.collection_name)
            response = collection.query.near_vector(
                near_vector=near_vector,
                limit=limit,
                return_metadata=MetadataQuery(distance=True),
                return_properties=["post_id", "content", "author", "language"],
            )
            items = []
            for obj in response.objects:
                properties = obj.properties or {}
                metadata = getattr(obj, "metadata", None)
                distance = getattr(metadata, "distance", None)
                score = 1.0 - float(distance if distance is not None else 1.0)
                items.append(
                    {
                        "post_id": int(properties.get("post_id", 0)),
                        "content": properties.get("content", ""),
                        "author": properties.get("author", "unknown"),
                        "language": properties.get("language", "am"),
                        "score": round(score, 4),
                        "source": "weaviate",
                    }
                )
            return items

        try:
            return await asyncio.to_thread(_query)
        except Exception:
            return []

    async def _search_local(self, query: str, db: AsyncSession, limit: int) -> List[Dict[str, object]]:
        result = await db.execute(
            select(Post)
            .options(
                selectinload(Post.author),
                selectinload(Post.interactions).selectinload(Interaction.user),
            )
            .where(Post.content.is_not(None))
            .order_by(desc(Post.created_at))
            .limit(100)
        )
        posts = result.scalars().unique().all()
        query_vector = self._embed(query)
        ranked = []

        for post in posts:
            content = post.content or ""
            vector = self._embed(f"{content} {post.language} {post.persona_key or ''}")
            score = self._cosine_similarity(query_vector, vector)
            if score <= 0:
                continue
            ranked.append(
                {
                    "post_id": post.id,
                    "content": content,
                    "author": post.author.username if post.author is not None else "unknown",
                    "language": post.language,
                    "score": round(score, 4),
                    "source": "local",
                }
            )

        ranked.sort(key=lambda item: item["score"], reverse=True)
        return ranked[:limit]

    @staticmethod
    def _cosine_similarity(left: List[float], right: List[float]) -> float:
        numerator = sum(a * b for a, b in zip(left, right))
        left_norm = math.sqrt(sum(a * a for a in left)) or 1.0
        right_norm = math.sqrt(sum(b * b for b in right)) or 1.0
        return numerator / (left_norm * right_norm)


rag_service = RAGService()
