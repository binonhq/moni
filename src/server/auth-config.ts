import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { Database } from "@/db";
import * as schema from "@/db/schema";

export function createAuth(db: Database, bootstrap = false) {
  const baseURL = process.env.BETTER_AUTH_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!baseURL || !secret || secret.length < 32) throw new Error("AUTH_NOT_CONFIGURED");
  if (process.env.VERCEL_ENV === "production" && !baseURL.startsWith("https://")) throw new Error("HTTPS_REQUIRED");
  return betterAuth({
    appName: "Moni", baseURL, secret, trustedOrigins: [new URL(baseURL).origin],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true, disableSignUp: !bootstrap, minPasswordLength: 16, maxPasswordLength: 128, autoSignIn: false },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    advanced: { useSecureCookies: baseURL.startsWith("https://"), defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" } },
    // Atomic PostgreSQL rate limiting is applied before every exposed auth handler.
    rateLimit: { enabled: false },
    logger: { disabled: true },
  });
}
