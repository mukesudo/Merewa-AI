from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from ..core.auth import _ensure_unique_username, get_current_actor, get_optional_actor
from ..database import get_db
from ..models import Follow, Interaction, Post, User
from ..schemas import FollowMutationResponse, UserListItem, UserProfileResponse, UserSummary, UserUpdateRequest
from ..services.feed import serialize_post


router = APIRouter(tags=["users"])


async def _following_ids(db: AsyncSession, viewer_id: Optional[int]) -> set[int]:
    if viewer_id is None:
        return set()
    result = await db.execute(select(Follow.followee_id).where(Follow.follower_id == viewer_id))
    return {row[0] for row in result.all()}


async def _counts(db: AsyncSession, user_id: int) -> tuple[int, int, int]:
    followers_count = await db.scalar(
        select(func.count(Follow.id)).where(Follow.followee_id == user_id)
    )
    following_count = await db.scalar(
        select(func.count(Follow.id)).where(Follow.follower_id == user_id)
    )
    posts_count = await db.scalar(select(func.count(Post.id)).where(Post.user_id == user_id))
    return int(followers_count or 0), int(following_count or 0), int(posts_count or 0)


def _serialize_summary(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "preferred_language": user.preferred_language,
        "avatar_url": user.avatar_url,
        "bio": user.bio,
        "location": user.location,
        "website": user.website,
        "is_ai": user.is_ai,
        "persona_key": user.persona_key,
    }


async def _load_connections(db: AsyncSession, user_id: int) -> tuple[list[User], list[User]]:
    follower_alias = aliased(User)
    following_alias = aliased(User)

    followers_result = await db.execute(
        select(follower_alias)
        .join(Follow, Follow.follower_id == follower_alias.id)
        .where(Follow.followee_id == user_id)
        .order_by(follower_alias.username.asc())
        .limit(12)
    )
    following_result = await db.execute(
        select(following_alias)
        .join(Follow, Follow.followee_id == following_alias.id)
        .where(Follow.follower_id == user_id)
        .order_by(following_alias.username.asc())
        .limit(12)
    )
    return followers_result.scalars().all(), following_result.scalars().all()


async def _load_profile(
    db: AsyncSession,
    username: str,
    viewer: Optional[User],
) -> UserProfileResponse:
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.posts).selectinload(Post.interactions).selectinload(Interaction.user)
        )
        .where(User.username == username)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    followers_count, following_count, posts_count = await _counts(db, user.id)
    viewer_following_ids = await _following_ids(db, viewer.id if viewer is not None else None)
    followers, following = await _load_connections(db, user.id)
    recent_posts = sorted(
        user.posts,
        key=lambda post: post.created_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )[:12]

    return UserProfileResponse(
        user=UserListItem(
            **_serialize_summary(user),
            followers_count=followers_count,
            following_count=following_count,
            posts_count=posts_count,
            viewer_follows=user.id in viewer_following_ids,
        ),
        recent_posts=[serialize_post(post, viewer_following_ids) for post in recent_posts],
        followers=[UserSummary(**_serialize_summary(item)) for item in followers],
        following=[UserSummary(**_serialize_summary(item)) for item in following],
    )


@router.get("/users/me", response_model=UserProfileResponse)
async def get_me(
    actor: User = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    return await _load_profile(db, actor.username, actor)


@router.patch("/users/me", response_model=UserProfileResponse)
async def update_me(
    payload: UserUpdateRequest,
    actor: User = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    if payload.username:
        actor.username = await _ensure_unique_username(
            db,
            payload.username,
            excluding_user_id=actor.id,
        )
    if payload.display_name is not None:
        actor.display_name = payload.display_name
    if payload.bio is not None:
        actor.bio = payload.bio
    if payload.preferred_language is not None:
        actor.preferred_language = payload.preferred_language
    if payload.avatar_url is not None:
        actor.avatar_url = payload.avatar_url
    if payload.location is not None:
        actor.location = payload.location
    if payload.website is not None:
        actor.website = payload.website

    await db.commit()
    await db.refresh(actor)
    return await _load_profile(db, actor.username, actor)


@router.get("/users/search", response_model=list[UserListItem])
async def search_users(
    q: str = Query(..., min_length=1),
    viewer: Optional[User] = Depends(get_optional_actor),
    db: AsyncSession = Depends(get_db),
):
    pattern = f"%{q.strip()}%"
    result = await db.execute(
        select(User)
        .where(
            or_(
                User.username.ilike(pattern),
                User.display_name.ilike(pattern),
                User.bio.ilike(pattern),
            )
        )
        .order_by(User.is_ai.asc(), User.username.asc())
        .limit(20)
    )
    users = result.scalars().all()
    viewer_following_ids = await _following_ids(db, viewer.id if viewer is not None else None)

    items = []
    for user in users:
        followers_count, following_count, posts_count = await _counts(db, user.id)
        items.append(
            UserListItem(
                **_serialize_summary(user),
                followers_count=followers_count,
                following_count=following_count,
                posts_count=posts_count,
                viewer_follows=user.id in viewer_following_ids,
            )
        )
    return items


@router.get("/users/{username}", response_model=UserProfileResponse)
async def get_profile(
    username: str,
    viewer: Optional[User] = Depends(get_optional_actor),
    db: AsyncSession = Depends(get_db),
):
    return await _load_profile(db, username, viewer)


@router.post("/users/{username}/follow", response_model=FollowMutationResponse)
async def toggle_follow_username(
    username: str,
    actor: User = Depends(get_current_actor),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.username == username))
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == actor.id:
        raise HTTPException(status_code=400, detail="Users cannot follow themselves")

    existing = await db.execute(
        select(Follow).where(
            Follow.follower_id == actor.id,
            Follow.followee_id == target.id,
        )
    )
    follow = existing.scalar_one_or_none()
    following = follow is None

    if following:
        db.add(Follow(follower_id=actor.id, followee_id=target.id))
    else:
        await db.delete(follow)

    await db.commit()
    return FollowMutationResponse(
        following=following,
        followee_id=target.id,
        followee_username=target.username,
    )
