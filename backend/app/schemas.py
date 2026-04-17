from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserSummary(ORMBase):
    id: int
    username: str
    display_name: Optional[str] = None
    preferred_language: str = "am"
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    is_ai: bool = False
    persona_key: Optional[str] = None


class CommentRead(BaseModel):
    id: int
    type: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    author: str
    author_id: int
    created_at: Optional[datetime] = None
    language: str = "am"


class PostRead(BaseModel):
    id: int
    type: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    language: str
    origin: str
    persona_key: Optional[str] = None
    author: str
    author_id: int
    author_display_name: Optional[str] = None
    author_avatar_url: Optional[str] = None
    author_is_ai: bool = False
    like_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    engagement_score: float = 0
    viewer_follows_author: bool = False
    created_at: Optional[datetime] = None
    comments: List[CommentRead] = Field(default_factory=list)


class FeedResponse(BaseModel):
    posts: List[PostRead]
    next_offset: int


class PostCreate(BaseModel):
    type: str = "text"
    content: Optional[str] = None
    media_url: Optional[str] = None
    user_id: Optional[int] = None
    language: str = "am"
    origin: str = "human"
    persona_key: Optional[str] = None


class CommentCreate(BaseModel):
    content: Optional[str] = None
    user_id: Optional[int] = None
    media_url: Optional[str] = None
    type: str = "text"
    language: str = "am"
    auto_reply: bool = True


class ToggleLikeRequest(BaseModel):
    user_id: Optional[int] = None


class ToggleFollowRequest(BaseModel):
    follower_id: Optional[int] = None


class LikeMutationResponse(BaseModel):
    liked: bool
    like_count: int


class FollowMutationResponse(BaseModel):
    following: bool
    followee_id: int
    followee_username: Optional[str] = None


class CommentMutationResponse(BaseModel):
    comment: CommentRead
    ai_reply: Optional[CommentRead] = None


class Personality(BaseModel):
    key: str
    username: str
    display_name: str
    bio: str
    tone: str
    languages: List[str]
    default_topics: List[str]


class AIContextResult(BaseModel):
    post_id: int
    content: str
    author: str
    language: str
    score: float
    source: str


class GeneratePostRequest(BaseModel):
    persona_key: str
    topic: Optional[str] = None
    language: str = "am"
    publish: bool = True


class GeneratePostResponse(BaseModel):
    persona: Personality
    content: str
    language: str
    context: List[AIContextResult]
    post: Optional[PostRead] = None


class GenerateReplyRequest(BaseModel):
    post_id: int
    comment: str
    persona_key: Optional[str] = None
    language: str = "am"
    publish: bool = False


class GenerateReplyResponse(BaseModel):
    persona: Personality
    reply: str
    context: List[AIContextResult]
    comment: Optional[CommentRead] = None


class DailyRunRequest(BaseModel):
    language: str = "am"
    persona_keys: Optional[List[str]] = None


class DailyRunResponse(BaseModel):
    generated: List[PostRead]


class HealthResponse(BaseModel):
    status: str
    phase: str
    services: dict


class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    preferred_language: Optional[str] = None
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None


class UserListItem(UserSummary):
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    viewer_follows: bool = False


class UserProfileResponse(BaseModel):
    user: UserListItem
    recent_posts: List[PostRead] = Field(default_factory=list)
    followers: List[UserSummary] = Field(default_factory=list)
    following: List[UserSummary] = Field(default_factory=list)


class GenerateScriptRequest(BaseModel):
    prompt: str
    language: str = "am"


class GenerateScriptResponse(BaseModel):
    script: str
    language: str
