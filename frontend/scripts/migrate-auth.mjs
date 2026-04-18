import { DatabaseSync } from "node:sqlite";
import path from "node:path";

import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";
import pg from "pg";

const authDatabaseUrl =
  process.env.BETTER_AUTH_DATABASE_URL ?? process.env.DATABASE_URL ?? null;

const database = authDatabaseUrl
  ? new pg.Pool({
      connectionString: authDatabaseUrl,
      ssl: authDatabaseUrl.includes("sslmode=require")
        ? undefined
        : authDatabaseUrl.includes("supabase.co")
          ? { rejectUnauthorized: false }
          : undefined,
    })
  : new DatabaseSync(path.join(process.cwd(), "auth.db"));

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

const auth = betterAuth({
  appName: "Merewa",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "merewa-local-secret-please-change-in-production",
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://127.0.0.1:3000",
  database,
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

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();

if (database instanceof pg.Pool) {
  await database.end();
}

console.log(
  authDatabaseUrl
    ? "Better Auth migrations completed against PostgreSQL."
    : "Better Auth migrations completed for local SQLite.",
);
