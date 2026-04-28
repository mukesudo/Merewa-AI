import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "../../../../lib/auth";
import {
  BACKEND_URL,
  buildAuthHeaders,
  INTERNAL_API_TOKEN,
} from "../../../../lib/backend";

type RouteContext = {
  params: {
    path: string[];
  };
};

async function proxy(request: NextRequest, { params }: RouteContext) {
  // Attempt 1: use headers() from next/headers — nextCookies() is optimised
  // for this API, whereas request.headers (Web Headers) can be missed.
  let session = null;
  try {
    const nextHeaders = headers();
    session = await auth.api.getSession({
      headers: nextHeaders,
    });
  } catch (err) {
    console.warn("[Merewa Proxy] getSession via headers() failed:", err);
  }

  // Attempt 2: fallback to raw request.headers if Attempt 1 returned nothing
  if (!session) {
    try {
      session = await auth.api.getSession({
        headers: request.headers,
      });
    } catch (err) {
      console.warn("[Merewa Proxy] getSession via request.headers failed:", err);
    }
  }

  const cookieHeader = request.headers.get("cookie");
  const hasCookie = Boolean(cookieHeader && cookieHeader.includes("better-auth"));
  console.log(
    `[Merewa Proxy] ${request.method} ${params.path.join("/")} | ` +
    `session=${session ? "found" : "null"} | cookie=${hasCookie ? "present" : "missing"}`
  );

  const target = new URL(`${BACKEND_URL}/api/${params.path.join("/")}`);
  target.search = request.nextUrl.search;

  const proxyHeaders = buildAuthHeaders(session?.user ?? null);
  proxyHeaders.set("x-internal-token", INTERNAL_API_TOKEN);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    proxyHeaders.set("content-type", contentType);
  }

  const response = await fetch(target, {
    method: request.method,
    headers: proxyHeaders,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    cache: "no-store",
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
