import "server-only";
import { z } from "zod";

/** Unset and empty ("GOOGLE_CLIENT_ID=" in .env) both mean "not configured". */
const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    /** The app's public origin. Better Auth lives at `${BETTER_AUTH_URL}/api/auth`. */
    BETTER_AUTH_URL: z.url(),
    APP_TIMEZONE: z.string().default("UTC"),
    UPLOAD_DIR: z.string().default("./data/uploads"),
    TAX_RATE: z.coerce.number().min(0).max(1).default(0.12),
    MAX_PENDING_PER_USER: z.coerce.number().int().positive().default(5),
    /** Google sign-in is enabled when both are set (set both or neither). */
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
  })
  .superRefine((env, ctx) => {
    if (env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_SECRET)
      ctx.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_SECRET"], message: "GOOGLE_CLIENT_SECRET is required when GOOGLE_CLIENT_ID is set" });
    if (env.GOOGLE_CLIENT_SECRET && !env.GOOGLE_CLIENT_ID)
      ctx.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_ID"], message: "GOOGLE_CLIENT_ID is required when GOOGLE_CLIENT_SECRET is set" });
  });

export type ServerEnv = z.output<typeof serverEnvSchema>;

/** Validates raw env vars. Throws on invalid config, so the app refuses to start. */
export function parseServerEnv(raw: Record<string, string | undefined>) {
  const env = serverEnvSchema.parse(raw);
  const google = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } : null;
  return { env, google };
}

const parsed = parseServerEnv(process.env);

export const serverEnv = parsed.env;
export const isProd = serverEnv.NODE_ENV === "production";

/** Google OAuth credentials, or null when Google sign-in is not configured. */
export const googleCredentials = parsed.google;
export const googleAuthEnabled = googleCredentials !== null;
