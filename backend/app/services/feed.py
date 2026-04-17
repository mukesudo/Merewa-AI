from datetime import datetime, timezone
from math import log1p
from typing import Iterable, Optional, Sequence, Set

from ..models import Interaction, Post


def _age_in_hours(created_at: Optional[datetime]) -> float:
    if created_at is None:
        return 1.0

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    age_seconds = max((datetime.now(timezone.utc) - created_at).total_seconds(), 1.0)
    return age_seconds / 3600


def calculate_feed_score(post: Post, following_ids: Optional[Set[int]] = None) -> float:
    following_ids = following_ids or set()
    base = (
        post.like_count * 1.2
        + post.comment_count * 2.1
        + post.share_count * 3.4
        + 1
    )
    freshness = 1 / max(_age_in_hours(post.created_at) ** 0.45, 0.75)
    affinity = 1.35 if post.user_id in following_ids else 1.0
    ai_mix = 1.1 if post.origin == "ai" else 1.0
    score = log1p(base) * freshness * affinity * ai_mix
    return round(score, 4)


def serialize_comment(comment: Optional[Interaction]):
    if comment is None:
        return None

    author = comment.user.username if comment.user is not None else "unknown"
    return {
        "id": comment.id,
        "type": comment.type,
        "content": comment.content,
        "media_url": comment.media_url,
        "author": author,
        "author_id": comment.user_id,
        "created_at": comment.created_at,
        "language": comment.language,
    }


def serialize_post(post: Optional[Post], following_ids: Optional[Set[int]] = None):
    if post is None:
        return None

    following_ids = following_ids or set()
    comments = [
        interaction
        for interaction in sorted(
            post.interactions,
            key=lambda item: item.created_at or datetime.min.replace(tzinfo=timezone.utc),
        )
        if interaction.type == "comment"
    ][-4:]

    author = post.author.username if post.author is not None else "unknown"
    author_display_name = post.author.display_name if post.author is not None else None
    author_avatar_url = post.author.avatar_url if post.author is not None else None
    author_is_ai = bool(post.author.is_ai) if post.author is not None else False

    score = calculate_feed_score(post, following_ids)
    post.engagement_score = score

    return {
        "id": post.id,
        "type": post.type,
        "content": post.content,
        "media_url": post.media_url,
        "language": post.language,
        "origin": post.origin,
        "persona_key": post.persona_key,
        "author": author,
        "author_id": post.user_id,
        "author_display_name": author_display_name,
        "author_avatar_url": author_avatar_url,
        "author_is_ai": author_is_ai,
        "like_count": post.like_count,
        "comment_count": post.comment_count,
        "share_count": post.share_count,
        "engagement_score": score,
        "viewer_follows_author": post.user_id in following_ids,
        "created_at": post.created_at,
        "comments": [serialize_comment(comment) for comment in comments],
    }


def rank_posts(posts: Sequence[Post], following_ids: Optional[Set[int]] = None):
    following_ids = following_ids or set()
    return sorted(
        posts,
        key=lambda post: (
            calculate_feed_score(post, following_ids),
            post.created_at or datetime.min.replace(tzinfo=timezone.utc),
        ),
        reverse=True,
    )
