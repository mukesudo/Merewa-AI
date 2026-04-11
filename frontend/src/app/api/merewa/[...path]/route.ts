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
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const target = new URL(`${BACKEND_URL}/api/${params.path.join("/")}`);
  target.search = request.nextUrl.search;

  const headers = buildAuthHeaders(session?.user ?? null);
  headers.set("x-internal-token", INTERNAL_API_TOKEN);

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const response = await fetch(target, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text(),
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
