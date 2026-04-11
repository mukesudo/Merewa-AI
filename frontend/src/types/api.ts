export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  username?: string | null;
  preferredLanguage?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
}

export interface Session {
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
  user: AuthUser;
}

export interface UserSummary {
  id: number;
  username: string;
  display_name?: string | null;
  preferred_language: string;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  is_ai: boolean;
  persona_key?: string | null;
}

export interface SearchUser extends UserSummary {
  followers_count: number;
  following_count: number;
  posts_count: number;
  viewer_follows: boolean;
}

export interface Comment {
  id: number;
  type: string;
  content?: string | null;
  media_url?: string | null;
  author: string;
  author_id: number;
  created_at?: string | null;
  language: string;
}

export interface Post {
  id: number;
  type: string;
  content?: string | null;
  media_url?: string | null;
  language: string;
  origin: string;
  persona_key?: string | null;
  author: string;
  author_id: number;
  author_display_name?: string | null;
  author_avatar_url?: string | null;
  author_is_ai: boolean;
  like_count: number;
  comment_count: number;
  share_count: number;
  engagement_score: number;
  viewer_follows_author: boolean;
  created_at?: string | null;
  comments: Comment[];
}

export interface FeedResponse {
  posts: Post[];
  next_offset: number;
}

export interface Personality {
  key: string;
  username: string;
  display_name: string;
  bio: string;
  tone: string;
  languages: string[];
  default_topics: string[];
}

export interface AIContextResult {
  post_id: number;
  content: string;
  author: string;
  language: string;
  score: number;
  source: string;
}

export interface GeneratePostResponse {
  persona: Personality;
  content: string;
  language: string;
  context: AIContextResult[];
  post?: Post | null;
}

export interface CommentMutationResponse {
  comment: Comment;
  ai_reply?: Comment | null;
}

export interface LikeMutationResponse {
  liked: boolean;
  like_count: number;
}

export interface FollowMutationResponse {
  following: boolean;
  followee_id: number;
  followee_username?: string | null;
}

export interface CreatePostPayload {
  type: string;
  content?: string | null;
  media_url?: string | null;
  language: string;
  origin: string;
  persona_key?: string | null;
}

export interface CreateCommentPayload {
  content?: string | null;
  media_url?: string | null;
  type: string;
  language: string;
  auto_reply: boolean;
}

export interface UserProfileResponse {
  user: SearchUser;
  recent_posts: Post[];
  followers: UserSummary[];
  following: UserSummary[];
}

export interface UserSettingsPayload {
  username?: string;
  display_name?: string;
  bio?: string;
  preferred_language?: string;
  avatar_url?: string;
  location?: string;
  website?: string;
}

export interface RoadmapTask {
  title: string;
  status: "done" | "active" | "next";
  detail: string;
}

export const fallbackPersonalities: Personality[] = [
  {
    key: "addis_taxi_driver",
    username: "AddisTaxi",
    display_name: "Addis Taxi Driver",
    bio: "Street-level updates, jokes, and opinions from an Addis minibus perspective.",
    tone: "Fast, opinionated, witty, and hyper-local.",
    languages: ["am", "en"],
    default_topics: ["Addis traffic", "city gossip", "fuel prices"],
  },
  {
    key: "habesha_mom",
    username: "HabeshaMom",
    display_name: "Habesha Mom",
    bio: "Warm, sharp, and culturally grounded life commentary from a Habesha mom.",
    tone: "Warm, humorous, protective, and full of wisdom.",
    languages: ["am", "en"],
    default_topics: ["family advice", "coffee ceremony", "community news"],
  },
  {
    key: "mercato_hustler",
    username: "MercatoMoves",
    display_name: "Mercato Hustler",
    bio: "Fast business takes, price trends, and market energy from Mercato.",
    tone: "Confident, energetic, and practical.",
    languages: ["am", "en"],
    default_topics: ["small business", "market prices", "side hustles"],
  },
];

export const fallbackPosts: Post[] = [
  {
    id: 101,
    type: "text",
    content: "Selam! Merewa Phase 2 is wired for AI personalities, ranked feeds, and context-aware replies.",
    language: "en",
    origin: "human",
    author: "tester",
    author_id: 1,
    author_display_name: "Test User",
    author_is_ai: false,
    like_count: 18,
    comment_count: 0,
    share_count: 2,
    engagement_score: 2.4,
    viewer_follows_author: false,
    comments: [],
  },
  {
    id: 102,
    type: "audio",
    content: "Audio demo post",
    media_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    language: "en",
    origin: "ai",
    persona_key: "addis_taxi_driver",
    author: "AddisTaxi",
    author_id: 2,
    author_display_name: "Addis Taxi Driver",
    author_is_ai: true,
    like_count: 45,
    comment_count: 1,
    share_count: 5,
    engagement_score: 3.8,
    viewer_follows_author: false,
    comments: [
      {
        id: 401,
        type: "comment",
        content: "This is the kind of local energy the app needs.",
        author: "tester",
        author_id: 1,
        language: "en",
      },
    ],
  },
];

export const roadmapTasks: RoadmapTask[] = [
  {
    title: "Auth and onboarding",
    status: "done",
    detail: "Email, username, and social sign-in flows with Better Auth.",
  },
  {
    title: "Profiles and discovery",
    status: "done",
    detail: "Search, follow graphs, profile pages, and settings sync across auth and app data.",
  },
  {
    title: "Voice workflow polish",
    status: "active",
    detail: "Persist uploaded audio files instead of temporary object URLs for production use.",
  },
  {
    title: "AI automation",
    status: "active",
    detail: "Wire scheduled Celery jobs to publish daily persona content and replies.",
  },
  {
    title: "Ops and moderation",
    status: "next",
    detail: "Admin dashboard, moderation queue, analytics, and abuse controls.",
  },
];
