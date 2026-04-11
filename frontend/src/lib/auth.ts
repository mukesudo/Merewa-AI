import { DatabaseSync } from "node:sqlite";
import path from "node:path";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";

const authDatabasePath = path.join(process.cwd(), "auth.db");
const authDatabase = new DatabaseSync(authDatabasePath);

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
    "merewa-local-secret-please-change-in-production",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000",
  database: authDatabase,
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
