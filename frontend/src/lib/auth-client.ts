"use client";

import { createAuthClient } from "better-auth/react";
import {
  inferAdditionalFields,
  usernameClient,
} from "better-auth/client/plugins";

import type { auth } from "./auth";

const authOrigin =
  typeof window === "undefined"
    ? process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000"
    : window.location.origin;

export const authClient = createAuthClient({
  baseURL: authOrigin,
  basePath: "/api/auth",
  plugins: [inferAdditionalFields<typeof auth>(), usernameClient()],
});
