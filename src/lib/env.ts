import { z } from "zod";

// Browser-safe. Only NEXT_PUBLIC_* vars, each referenced explicitly so Next can inline it.
export const env = z
  .object({
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  })
  .parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
