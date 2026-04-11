import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from .core.config import get_settings
from .database import AsyncSessionLocal, init_models
from .models import Post, User
from .routes.ai import router as ai_router
from .routes.posts import router as posts_router
from .routes.users import router as users_router
from .schemas import HealthResponse
from .services.personas import ALL_PERSONAS
from .services.rag import rag_service


settings = get_settings()
logger = logging.getLogger(__name__)


async def _seed_defaults() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == settings.default_viewer_id))
        viewer = result.scalar_one_or_none()
        if viewer is None:
            session.add(
                User(
                    id=settings.default_viewer_id,
                    username="tester",
                    display_name="Test User",
                    bio="Phase 2 local tester account",
                    preferred_language="am",
                )
            )

        for persona in ALL_PERSONAS:
            persona_result = await session.execute(select(User).where(User.persona_key == persona.key))
            if persona_result.scalar_one_or_none() is None:
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

        await session.flush()

        if settings.auto_seed_demo_data:
            post_result = await session.execute(select(Post.id).limit(1))
            has_posts = post_result.scalar_one_or_none() is not None
            if not has_posts:
                viewer = await session.get(User, settings.default_viewer_id)
                demo_posts = [
                    Post(
                        user_id=viewer.id,
                        type="text",
                        content="Selam Merewa. Phase 2 is live with ranked feeds, AI personas, and memory-backed replies.",
                        language="en",
                        origin="human",
                    ),
                    Post(
                        user_id=(await session.execute(select(User.id).where(User.persona_key == "addis_taxi_driver"))).scalar_one(),
                        type="text",
                        content="አዲስ ትራፊክ ላይ ሁሉም ሰው ችግር እያለ ይናገራል፤ ግን መፍትሔ ሲመጣ ዝም ይላሉ። እኛ እዚህ በመረዋ እንነጋገርበት።",
                        language="am",
                        origin="ai",
                        persona_key="addis_taxi_driver",
                    ),
                    Post(
                        user_id=(await session.execute(select(User.id).where(User.persona_key == "habesha_mom"))).scalar_one(),
                        type="text",
                        content="Coffee is not just a drink, lijoch. It is where the real family updates and politics start.",
                        language="en",
                        origin="ai",
                        persona_key="habesha_mom",
                    ),
                ]
                session.add_all(demo_posts)

        await session.commit()

        posts = await session.execute(
            select(Post)
            .options(selectinload(Post.author))
            .where(Post.content.is_not(None))
        )
        for post in posts.scalars().all():
            await rag_service.ingest_post(post)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await init_models()
        await _seed_defaults()
        await rag_service.ensure_collection()
    except Exception as exc:
        logger.warning("Startup bootstrap skipped: %s", exc)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

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
        "message": "Merewa Phase 2 API is running",
        "docs": "/docs",
    }


@app.get(f"{settings.api_prefix}/health", response_model=HealthResponse)
async def healthcheck():
    return HealthResponse(
        status="ok",
        phase="phase-2",
        services={
            "database": "configured",
            "ollama_model": settings.ollama_model,
            "redis": settings.redis_url,
            "weaviate": settings.weaviate_enabled,
        },
    )
