import asyncio
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import AsyncSessionLocal
from ..models import Interaction, Post, User
from ..services.ollama import ollama_service
from ..services.personas import ALL_PERSONAS, get_persona
from ..services.rag import rag_service
from .celery_app import celery_app


async def _resolve_persona_user(session: AsyncSession, persona_key: str) -> User:
    result = await session.execute(select(User).where(User.persona_key == persona_key))
    user = result.scalar_one_or_none()
    if user is None:
        raise ValueError(f"Persona user not found: {persona_key}")
    return user


@celery_app.task(name="merewa.generate_daily_ai_posts")
def generate_daily_ai_posts(language: str = "am", persona_keys: Optional[List[str]] = None):
    async def _run():
        keys = persona_keys or [persona.key for persona in ALL_PERSONAS]
        async with AsyncSessionLocal() as session:
            created_ids = []
            for key in keys:
                persona = get_persona(key)
                context = await rag_service.search(persona.default_topics[0], session, limit=2)
                content = await ollama_service.generate_post(
                    persona=persona,
                    topic=persona.default_topics[0],
                    language=language,
                    context=context,
                )
                author = await _resolve_persona_user(session, key)
                post = Post(
                    user_id=author.id,
                    type="text",
                    content=content,
                    language=language,
                    origin="ai",
                    persona_key=key,
                )
                session.add(post)
                await session.flush()
                created_ids.append(post.id)

            await session.commit()
            result = await session.execute(
                select(Post)
                .options(
                    selectinload(Post.author),
                    selectinload(Post.interactions).selectinload(Interaction.user),
                )
                .where(Post.id.in_(created_ids))
            )
            posts = result.scalars().unique().all()
            for post in posts:
                await rag_service.ingest_post(post)
            return created_ids

    return asyncio.run(_run())


@celery_app.task(name="merewa.reply_to_comment")
def reply_to_comment(post_id: int, comment_text: str, persona_key: str, language: str = "am"):
    async def _run():
        async with AsyncSessionLocal() as session:
            persona = get_persona(persona_key)
            post = await session.get(Post, post_id)
            if post is None:
                raise ValueError(f"Post not found: {post_id}")

            context = await rag_service.search(comment_text, session, limit=3)
            reply_text = await ollama_service.generate_reply(
                persona=persona,
                comment=comment_text,
                post_content=post.content or "",
                language=language,
                context=context,
            )
            author = await _resolve_persona_user(session, persona_key)
            interaction = Interaction(
                user_id=author.id,
                post_id=post_id,
                type="comment",
                content=reply_text,
                language=language,
            )
            post.comment_count += 1
            session.add(interaction)
            await session.commit()
            return interaction.id

    return asyncio.run(_run())
