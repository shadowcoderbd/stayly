import "server-only";
import { z } from "zod";

export const serverEnv = z
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
  })
  .parse(process.env);

export const isProd = serverEnv.NODE_ENV === "production";
