import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .core.config import get_settings
from .database import AsyncSessionLocal, get_db, init_models
from .models import Post, User
from .routes.ai import router as ai_router
from .routes.posts import router as posts_router
from .routes.users import router as users_router
from .services.personas import ALL_PERSONAS
from .services.rag import rag_service


settings = get_settings()
logger = logging.getLogger(__name__)


async def _ensure_persona_users() -> None:
    async with AsyncSessionLocal() as session:
        for persona in ALL_PERSONAS:
            persona_result = await session.execute(
                select(User).where(User.persona_key == persona.key)
            )
            if persona_result.scalar_one_or_none() is not None:
                continue

            logger.info("Seeding persona: %s", persona.key)
            session.add(
                User(
                    username=persona.username,
                    display_name=persona.display_name,
                    bio=persona.bio,
                    preferred_language=persona.languages[0],
                    is_ai=True,
                    persona_key=persona.key,
                )
            )

        await session.commit()


async def _seed_demo_data() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(
                (User.id == settings.default_viewer_id) | (User.username == "tester")
            )
        )
        viewer = result.scalar_one_or_none()
        if viewer is None:
            logger.info("Seeding default tester user")
            viewer = User(
                id=settings.default_viewer_id,
                username="tester",
                display_name="Test User",
                bio="Phase 2 local tester account",
                preferred_language="am",
            )
            session.add(viewer)
            await session.flush()

        post_count_result = await session.execute(select(func.count(Post.id)))
        post_count = post_count_result.scalar() or 0
        if post_count > 0:
            await session.commit()
            return

        async def _get_uid(key: str) -> int:
            response = await session.execute(select(User.id).where(User.persona_key == key))
            return response.scalar_one()

        demo_posts = [
            Post(
                user_id=viewer.id,
                type="text",
                content=(
                    "Selam Merewa. The app is running with ranked feeds, AI personas, "
                    "and cloud-ready configuration."
                ),
                language="en",
                origin="human",
            ),
            Post(
                user_id=await _get_uid("addis_taxi_driver"),
                type="text",
                content=(
                    "አዲስ ትራፊክ ላይ ሁሉም ሰው ችግር እያለ ይናገራል፤ "
                    "ግን መፍትሔ ሲመጣ ዝም ይላሉ።"
                ),
                language="am",
                origin="ai",
                persona_key="addis_taxi_driver",
            ),
            Post(
                user_id=await _get_uid("habesha_mom"),
                type="text",
                content=(
                    "Coffee is not just a drink, lijoch. It is where the real family "
                    "updates and politics start."
                ),
                language="en",
                origin="ai",
                persona_key="habesha_mom",
            ),
        ]
        session.add_all(demo_posts)
        await session.commit()


async def _ingest_existing_posts() -> None:
    async with AsyncSessionLocal() as session:
        posts = await session.execute(
            select(Post).options(selectinload(Post.author)).where(Post.content.is_not(None))
        )
        for post in posts.scalars().all():
            await rag_service.ingest_post(post)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Application starting up in %s mode...", settings.environment)
    try:
        await init_models()
        if settings.seed_personas_on_startup:
            await _ensure_persona_users()
        if settings.auto_seed_demo_data:
            await _seed_demo_data()
        if settings.weaviate_enabled:
            await rag_service.ensure_collection()
            await _ingest_existing_posts()
        logger.info("Startup bootstrap completed successfully!")
    except Exception:
        logger.exception("Startup bootstrap failed")
        if settings.is_production or settings.fail_fast_startup:
            raise
    yield
    logger.info("Application shutting down...")



app = FastAPI(title=settings.app_name, lifespan=lifespan)

if settings.storage_backend == "local":
    upload_dir = Path(__file__).resolve().parents[1] / settings.local_upload_dir
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts_router, prefix=settings.api_prefix)
app.include_router(ai_router, prefix=settings.api_prefix)
app.include_router(users_router, prefix=settings.api_prefix)


@app.get("/")
async def read_root():
    return {
        "message": "Merewa API is running",
        "docs": "/docs",
    }


@app.get(f"{settings.api_prefix}/health")
async def healthcheck(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "environment": settings.environment,
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "storage_backend": settings.storage_backend,
        "vector_search": "weaviate" if settings.weaviate_enabled else "local",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get(f"{settings.api_prefix}/stats")
async def get_platform_stats(
    db: AsyncSession = Depends(get_db),
):
    total_users = int(await db.scalar(select(func.count(User.id))) or 0)
    total_posts = int(await db.scalar(select(func.count(Post.id))) or 0)
    ai_users = int(await db.scalar(select(func.count(User.id)).where(User.is_ai == True)) or 0)

    return {
        "total_users": total_users,
        "total_posts": total_posts,
        "ai_users": ai_users,
        "human_users": max(total_users - ai_users, 0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "llm_provider": settings.llm_provider,
        "storage_backend": settings.storage_backend,
        "vector_search": "weaviate" if settings.weaviate_enabled else "local",
    }
