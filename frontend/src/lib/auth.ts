import { DatabaseSync } from "node:sqlite";
import path from "node:path";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";
import { Pool } from "pg";

const authDatabaseUrl =
  process.env.BETTER_AUTH_DATABASE_URL ?? process.env.DATABASE_URL;

const isProduction = process.env.NODE_ENV === "production";

const globalForAuth = globalThis as typeof globalThis & {
  merewaAuthPool?: Pool;
  merewaAuthSqlite?: DatabaseSync;
};

function createAuthDatabase() {
  // In production, we MUST have a database URL (Supabase)
  if (authDatabaseUrl) {
    const existingPool = globalForAuth.merewaAuthPool;
    if (existingPool) {
      return existingPool;
    }

    const isSupabase = authDatabaseUrl.includes("supabase.co") || authDatabaseUrl.includes("supabase.com");
    const hasSslMode = authDatabaseUrl.includes("sslmode=");

    const pool = new Pool({
      connectionString: authDatabaseUrl,
      ssl: isSupabase || hasSslMode
        ? { rejectUnauthorized: false }
        : undefined,
    });

    if (!isProduction) {
      globalForAuth.merewaAuthPool = pool;
    }
    return pool;
  }

  // Fallback to SQLite ONLY in development
  if (!isProduction) {
    const existingDatabase = globalForAuth.merewaAuthSqlite;
    if (existingDatabase) {
      return existingDatabase;
    }

    const sqlitePath = path.join(process.cwd(), "auth.db");
    const sqlite = new DatabaseSync(sqlitePath);
    globalForAuth.merewaAuthSqlite = sqlite;
    return sqlite;
  }

  // If we get here in production, it's a configuration error
  throw new Error(
    "FATAL: BETTER_AUTH_DATABASE_URL or DATABASE_URL is missing in production. " +
    "Better Auth cannot fall back to SQLite on Vercel."
  );
}

const socialProviders = {
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
};

export const auth = betterAuth({
  appName: "Merewa",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (isProduction
      ? (() => {
          throw new Error("BETTER_AUTH_SECRET must be set in production.");
        })()
      : "merewa-local-secret-please-change-in-production"),
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "",
    process.env.NEXT_PUBLIC_APP_URL || "",
  ].filter(Boolean),
  database: createAuthDatabase(),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github", "google"],
      updateUserInfoOnLink: true,
    },
  },
  user: {
    additionalFields: {
      preferredLanguage: {
        type: "string",
        required: false,
        defaultValue: "am",
      },
      bio: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      location: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      website: {
        type: "string",
        required: false,
        defaultValue: "",
      },
    },
  },
  plugins: [
    nextCookies(),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 24,
    }),
  ],
});
