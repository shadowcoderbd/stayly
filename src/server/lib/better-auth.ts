import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { isProd, serverEnv } from "@/server/config/env";
import { db } from "@/server/db/client";
import * as schema from "@/server/db/schema";

export const auth = betterAuth({
  appName: "Stayly",
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL, // the app's public origin; routes live at /api/auth/*
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 }, // 7 days, sliding daily
  advanced: {
    useSecureCookies: isProd && serverEnv.BETTER_AUTH_URL.startsWith("https://"),
    database: { generateId: () => crypto.randomUUID() },
  },
  rateLimit: { enabled: serverEnv.NODE_ENV !== "test", window: 60, max: 30, storage: "memory" },
  plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] })],
});

export type AuthSession = typeof auth.$Infer.Session;
