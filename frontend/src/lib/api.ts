import type {
  CommentMutationResponse,
  CreateCommentPayload,
  CreatePostPayload,
  FeedResponse,
  FollowMutationResponse,
  GeneratePostResponse,
  GenerateScriptResponse,
  LikeMutationResponse,
  Personality,
  Post,
  SearchUser,
  UserProfileResponse,
  UserSettingsPayload,
} from "../types/api";

const API_BASE_URL = "/api/merewa";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function fetchFeed(): Promise<FeedResponse> {
  return request<FeedResponse>("/posts?limit=12");
}

export function fetchPersonalities(): Promise<Personality[]> {
  return request<Personality[]>("/ai/personalities");
}

export function createPost(payload: CreatePostPayload): Promise<Post> {
  return request<Post>("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createComment(
  postId: number,
  payload: CreateCommentPayload,
): Promise<CommentMutationResponse> {
  return request<CommentMutationResponse>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function toggleLike(postId: number): Promise<LikeMutationResponse> {
  return request<LikeMutationResponse>(`/posts/${postId}/like`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getCurrentProfile(): Promise<UserProfileResponse> {
  return request<UserProfileResponse>("/users/me");
}

export function updateCurrentProfile(
  payload: UserSettingsPayload,
): Promise<UserProfileResponse> {
  return request<UserProfileResponse>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getProfile(username: string): Promise<UserProfileResponse> {
  return request<UserProfileResponse>(`/users/${username}`);
}

export function searchUsers(query: string): Promise<SearchUser[]> {
  return request<SearchUser[]>(`/users/search?q=${encodeURIComponent(query)}`);
}

export function searchPosts(query: string): Promise<Post[]> {
  return request<Post[]>(`/posts/search?q=${encodeURIComponent(query)}`);
}

export function toggleFollow(username: string): Promise<FollowMutationResponse> {
  return request<FollowMutationResponse>(`/users/${username}/follow`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function fetchFollowers(username: string): Promise<SearchUser[]> {
  return request<SearchUser[]>(`/users/${username}/followers`);
}

export function fetchFollowing(username: string): Promise<SearchUser[]> {
  return request<SearchUser[]>(`/users/${username}/following`);
}

export function generateAiPost(payload: {
  persona_key: string;
  topic?: string;
  language: string;
  publish: boolean;
}): Promise<GeneratePostResponse> {
  return request<GeneratePostResponse>("/ai/generate-post", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generateScript(prompt: string, language: string): Promise<GenerateScriptResponse> {
  return request<GenerateScriptResponse>("/ai/generate-script", {
    method: "POST",
    body: JSON.stringify({ prompt, language }),
  });
}

export async function uploadMedia(blob: Blob): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", blob, "recording.webm");

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
    // Note: We don't set Content-Type header here because fetch sets it automatically with the boundary for FormData
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

export function deletePost(postId: number): Promise<{status: string}> {
  return request<{status: string}>(`/posts/${postId}`, {
    method: "DELETE",
  });
}

export function fetchStats(): Promise<any> {
  return request<any>("/users/stats");
}
