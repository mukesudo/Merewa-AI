import re
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User
from .config import get_settings


settings = get_settings()


def _normalize_username(value: Optional[str]) -> str:
    base = (value or "").strip().lower()
    normalized = re.sub(r"[^a-z0-9_]+", "_", base).strip("_")
    if len(normalized) < 3:
        normalized = f"merewa_{normalized or 'user'}"
    return normalized[:30]


async def _ensure_unique_username(
    db: AsyncSession,
    requested_username: str,
    *,
    excluding_user_id: Optional[int] = None,
) -> str:
    candidate = _normalize_username(requested_username)
    suffix = 0

    while True:
        trial = candidate if suffix == 0 else f"{candidate[:25]}_{suffix}"
        result = await db.execute(select(User).where(User.username == trial))
        existing = result.scalar_one_or_none()
        if existing is None or existing.id == excluding_user_id:
            return trial
        suffix += 1


def require_internal_request(request: Request) -> None:
    token = request.headers.get("x-internal-token")
    if token != settings.internal_api_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal token",
        )


async def _sync_actor_from_headers(
    request: Request,
    db: AsyncSession,
    *,
    require_auth: bool,
) -> Optional[User]:
    require_internal_request(request)

    external_auth_id = request.headers.get("x-auth-user-id")
    if not external_auth_id:
        if require_auth:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
            )
        return None

    result = await db.execute(select(User).where(User.external_auth_id == external_auth_id))
    actor = result.scalar_one_or_none()

    header_email = request.headers.get("x-auth-email")
    header_name = request.headers.get("x-auth-name")
    header_image = request.headers.get("x-auth-image")
    header_username = request.headers.get("x-auth-username")
    header_language = request.headers.get("x-auth-language") or "am"

    desired_username = await _ensure_unique_username(
        db,
        header_username or (header_email.split("@")[0] if header_email else external_auth_id),
        excluding_user_id=actor.id if actor else None,
    )

    changed = False
    if actor is None:
        actor = User(
            external_auth_id=external_auth_id,
            email=header_email,
            username=desired_username,
            display_name=header_name or desired_username,
            avatar_url=header_image,
            preferred_language=header_language,
            is_ai=False,
        )
        db.add(actor)
        changed = True
    else:
        if header_email and actor.email != header_email:
            actor.email = header_email
            changed = True
        if header_name and actor.display_name != header_name:
            actor.display_name = header_name
            changed = True
        if header_image != actor.avatar_url:
            actor.avatar_url = header_image
            changed = True
        if header_language and actor.preferred_language != header_language:
            actor.preferred_language = header_language
            changed = True
        if header_username and actor.username != desired_username:
            actor.username = desired_username
            changed = True

    if changed:
        await db.commit()
        await db.refresh(actor)

    return actor


async def get_current_actor(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    actor = await _sync_actor_from_headers(request, db, require_auth=True)
    if actor is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return actor


async def get_optional_actor(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    token = request.headers.get("x-internal-token")
    if not token:
        return None
    return await _sync_actor_from_headers(request, db, require_auth=False)
