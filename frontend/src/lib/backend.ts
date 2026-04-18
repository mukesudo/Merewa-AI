import "server-only";

import type { Session } from "../types/api";

const BACKEND_URL = (process.env.MEREWA_BACKEND_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const INTERNAL_API_TOKEN =
  process.env.MEREWA_INTERNAL_API_TOKEN ??
  (process.env.NODE_ENV === "production" ? "" : "merewa-internal-dev-token");

type SessionUserLike = Session["user"];

function buildAuthHeaders(user?: SessionUserLike | null) {
  if (!INTERNAL_API_TOKEN) {
    throw new Error("MEREWA_INTERNAL_API_TOKEN must be set in production.");
  }

  const headers = new Headers({
    "x-internal-token": INTERNAL_API_TOKEN,
  });

  if (!user) {
    return headers;
  }

  headers.set("x-auth-user-id", user.id);
  headers.set("x-auth-email", user.email);
  headers.set("x-auth-name", user.name);
  headers.set("x-auth-image", user.image ?? "");
  headers.set("x-auth-username", user.username ?? "");
  headers.set("x-auth-language", user.preferredLanguage ?? "am");
  return headers;
}

export async function backendRequest<T>(
  path: string,
  options: RequestInit = {},
  user?: SessionUserLike | null,
): Promise<T> {
  const target = `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = buildAuthHeaders(user);

  if (options.headers) {
    const extraHeaders = new Headers(options.headers);
    extraHeaders.forEach((value, key) => headers.set(key, value));
  }

  const response = await fetch(target, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export { BACKEND_URL, INTERNAL_API_TOKEN, buildAuthHeaders };
