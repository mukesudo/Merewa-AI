from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, desc, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..core.auth import get_current_actor, get_optional_actor
from ..database import get_db
from ..models import Follow, Interaction, Post, User
from ..schemas import (
    CommentCreate,
    CommentMutationResponse,
    FeedResponse,
    LikeMutationResponse,
    PostCreate,
    PostRead,
    ToggleLikeRequest,
)
from ..services.feed import rank_posts, serialize_comment, serialize_post
from ..services.ollama import ollama_service
from ..services.personas import get_persona
from ..services.rag import rag_service


router = APIRouter(tags=["posts"])


def _safe_persona(persona_key: str):
    try:
        return get_persona(persona_key)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


async def _get_post_with_relations(db: AsyncSession, post_id: int) -> Optional[Post]:
    result = await db.execute(
        select(Post)
        .options(
            selectinload(Post.author),
            selectinload(Post.interactions).selectinload(Interaction.user),
        )
        .where(Post.id == post_id)
    )
    return result.scalar_one_or_none()


async def _following_ids(db: AsyncSession, viewer_id: Optional[int]) -> set:
    if not viewer_id:
        return set()

    result = await db.execute(select(Follow.followee_id).where(Follow.follower_id == viewer_id))
    return {row[0] for row in result.all()}


@router.get("/posts", response_model=FeedResponse)
async def get_posts(
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    actor: Optional[User] = Depends(get_optional_actor),
    db: AsyncSession = Depends(get_db),
):
    try:
        viewer_id = actor.id if actor is not None else None
        following_ids = await _following_ids(db, viewer_id)
        result = await db.execute(
            select(Post)
            .options(
                selectinload(Post.author),
                selectinload(Post.interactions).selectinload(Interaction.user),
            )
            .order_by(desc(Post.created_at))
            .offset(offset)
            .limit(limit * 3)
        )
        posts = result.scalars().unique().all()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc

    ranked_posts = rank_posts(posts, following_ids)[:limit]
    serialized = [serialize_post(post, following_ids) for post in ranked_posts]
    return FeedResponse(posts=serialized, next_offset=offset + len(ranked_posts))


@router.post("/posts", response_model=PostRead)
async def create_post(
    post_in: PostCreate,
    actor: User = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    author_id = post_in.user_id or actor.id
    author = await db.get(User, author_id)
    if author is None:
        raise HTTPException(status_code=404, detail="Author not found")

    post = Post(
        user_id=author_id,
        type=post_in.type,
        content=post_in.content,
        media_url=post_in.media_url,
        language=post_in.language,
        origin=post_in.origin,
        persona_key=post_in.persona_key,
    )
    db.add(post)
    await db.commit()

    hydrated = await _get_post_with_relations(db, post.id)
    if hydrated is None:
        raise HTTPException(status_code=500, detail="Post creation failed")

    await rag_service.ingest_post(hydrated)
    return serialize_post(hydrated, set())


@router.post("/posts/{post_id}/comments", response_model=CommentMutationResponse)
async def create_comment(
    post_id: int,
    comment_in: CommentCreate,
    actor: User = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_post_with_relations(db, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    commenter_id = comment_in.user_id or actor.id
    commenter = await db.get(User, commenter_id)
    if commenter is None:
        raise HTTPException(status_code=404, detail="Comment author not found")

    comment = Interaction(
        user_id=commenter_id,
        post_id=post_id,
        type="comment",
        content=comment_in.content,
        media_url=comment_in.media_url,
        language=comment_in.language,
    )
    post.comment_count += 1
    db.add(comment)
    await db.flush()

    ai_reply = None
    if comment_in.auto_reply and post.origin == "ai" and post.persona_key:
        persona = _safe_persona(post.persona_key)
        context = await rag_service.search(
            query=comment_in.content or post.content or "",
            db=db,
            limit=3,
        )
        reply_text = await ollama_service.generate_reply(
            persona=persona,
            comment=comment_in.content or "",
            post_content=post.content or "",
            language=comment_in.language,
            context=context,
        )
        ai_author = await db.execute(select(User).where(User.persona_key == post.persona_key))
        ai_user = ai_author.scalar_one_or_none()
        if ai_user is not None:
            ai_reply = Interaction(
                user_id=ai_user.id,
                post_id=post_id,
                type="comment",
                content=reply_text,
                language=comment_in.language,
            )
            post.comment_count += 1
            db.add(ai_reply)

    await db.commit()

    fresh_post = await _get_post_with_relations(db, post_id)
    if fresh_post is None:
        raise HTTPException(status_code=500, detail="Could not load updated post")

    comment_record = next(
        (
            interaction
            for interaction in fresh_post.interactions
            if interaction.id == comment.id
        ),
        None,
    )
    ai_reply_record = next(
        (
            interaction
            for interaction in fresh_post.interactions
            if ai_reply is not None and interaction.id == ai_reply.id
        ),
        None,
    )
    if comment_record is None:
        raise HTTPException(status_code=500, detail="Comment creation failed")

    return CommentMutationResponse(
        comment=serialize_comment(comment_record),
        ai_reply=serialize_comment(ai_reply_record) if ai_reply_record else None,
    )


@router.post("/posts/{post_id}/like", response_model=LikeMutationResponse)
async def toggle_like(
    post_id: int,
    like_in: ToggleLikeRequest,
    actor: User = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    post = await db.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    user_id = like_in.user_id or actor.id
    existing = await db.execute(
        select(Interaction).where(
            Interaction.post_id == post_id,
            Interaction.user_id == user_id,
            Interaction.type == "like",
        )
    )
    like = existing.scalar_one_or_none()

    liked = like is None
    if like is None:
        db.add(Interaction(user_id=user_id, post_id=post_id, type="like"))
        post.like_count += 1
    else:
        await db.execute(delete(Interaction).where(Interaction.id == like.id))
        post.like_count = max(0, post.like_count - 1)

    await db.commit()
    return LikeMutationResponse(liked=liked, like_count=post.like_count)
