from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Interaction, Post, User
from ..schemas import (
    AIContextResult,
    DailyRunRequest,
    DailyRunResponse,
    GeneratePostRequest,
    GeneratePostResponse,
    GenerateReplyRequest,
    GenerateReplyResponse,
    GenerateScriptRequest,
    GenerateScriptResponse,
    Personality,
)
from ..services.feed import serialize_comment, serialize_post
from ..services.ollama import ollama_service
from ..services.personas import ALL_PERSONAS, get_persona
from ..services.rag import rag_service


router = APIRouter(prefix="/ai", tags=["ai"])


def _safe_persona(persona_key: str):
    try:
        return get_persona(persona_key)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


async def _resolve_persona_user(db: AsyncSession, persona_key: str) -> User:
    result = await db.execute(select(User).where(User.persona_key == persona_key))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="AI persona user not found")
    return user


async def _load_post(db: AsyncSession, post_id: int) -> Post:
    result = await db.execute(
        select(Post)
        .options(
            selectinload(Post.author),
            selectinload(Post.interactions).selectinload(Interaction.user),
        )
        .where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("/personalities", response_model=List[Personality])
async def list_personalities():
    return [Personality(**persona.as_dict()) for persona in ALL_PERSONAS]


@router.get("/context", response_model=List[AIContextResult])
async def search_context(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=5, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
):
    results = await rag_service.search(query=q, db=db, limit=limit)
    return [AIContextResult(**result) for result in results]


@router.post("/generate-post", response_model=GeneratePostResponse)
async def generate_post(request: GeneratePostRequest, db: AsyncSession = Depends(get_db)):
    persona = _safe_persona(request.persona_key)
    topic = request.topic or persona.default_topics[0]
    context = await rag_service.search(query=topic, db=db, limit=3)
    content = await ollama_service.generate_post(
        persona=persona,
        topic=topic,
        language=request.language,
        context=context,
    )

    published_post = None
    if request.publish:
        ai_user = await _resolve_persona_user(db, request.persona_key)
        post = Post(
            user_id=ai_user.id,
            type="text",
            content=content,
            language=request.language,
            origin="ai",
            persona_key=request.persona_key,
        )
        db.add(post)
        await db.commit()
        published_post = await _load_post(db, post.id)
        await rag_service.ingest_post(published_post)

    return GeneratePostResponse(
        persona=Personality(**persona.as_dict()),
        content=content,
        language=request.language,
        context=[AIContextResult(**item) for item in context],
        post=serialize_post(published_post, set()) if published_post is not None else None,
    )


@router.post("/generate-reply", response_model=GenerateReplyResponse)
async def generate_reply(request: GenerateReplyRequest, db: AsyncSession = Depends(get_db)):
    post = await _load_post(db, request.post_id)
    persona_key = request.persona_key or post.persona_key
    if not persona_key:
        raise HTTPException(status_code=400, detail="No AI persona available for this post")

    persona = _safe_persona(persona_key)
    context = await rag_service.search(query=request.comment, db=db, limit=3)
    reply = await ollama_service.generate_reply(
        persona=persona,
        comment=request.comment,
        post_content=post.content or "",
        language=request.language,
        context=context,
    )

    saved_comment = None
    if request.publish:
        ai_user = await _resolve_persona_user(db, persona_key)
        interaction = Interaction(
            user_id=ai_user.id,
            post_id=post.id,
            type="comment",
            content=reply,
            language=request.language,
        )
        post.comment_count += 1
        db.add(interaction)
        await db.commit()
        refreshed_post = await _load_post(db, post.id)
        saved_comment = next(
            (
                item
                for item in refreshed_post.interactions
                if item.id == interaction.id
            ),
            None,
        )

    return GenerateReplyResponse(
        persona=Personality(**persona.as_dict()),
        reply=reply,
        context=[AIContextResult(**item) for item in context],
        comment=serialize_comment(saved_comment) if saved_comment is not None else None,
    )


@router.post("/daily-run", response_model=DailyRunResponse)
async def daily_run(request: DailyRunRequest, db: AsyncSession = Depends(get_db)):
    persona_keys = request.persona_keys or [persona.key for persona in ALL_PERSONAS]
    generated = []

    for persona_key in persona_keys:
        persona = _safe_persona(persona_key)
        topic = persona.default_topics[0]
        context = await rag_service.search(query=topic, db=db, limit=2)
        content = await ollama_service.generate_post(
            persona=persona,
            topic=topic,
            language=request.language,
            context=context,
        )
        ai_user = await _resolve_persona_user(db, persona_key)
        post = Post(
            user_id=ai_user.id,
            type="text",
            content=content,
            language=request.language,
            origin="ai",
            persona_key=persona_key,
        )
        db.add(post)
        await db.flush()
        generated.append(post.id)

    await db.commit()

    result = await db.execute(
        select(Post)
        .options(
            selectinload(Post.author),
            selectinload(Post.interactions).selectinload(Interaction.user),
        )
        .where(Post.id.in_(generated))
    )
    posts = result.scalars().unique().all()
    for post in posts:
        await rag_service.ingest_post(post)

    return DailyRunResponse(generated=[serialize_post(post, set()) for post in posts])


@router.post("/generate-script", response_model=GenerateScriptResponse)
async def generate_script(request: GenerateScriptRequest):
    content = await ollama_service.generate_voice_script(
        user_prompt=request.prompt,
        language=request.language,
    )
    return GenerateScriptResponse(script=content, language=request.language)
