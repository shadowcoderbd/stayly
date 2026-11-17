import "server-only";
import { TooManyRequestsError } from "./errors";

/** Small fixed-window, in-memory limiter. Good enough for a single app instance. */
export function createRateLimiter({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function hit(key: string) {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      return;
    }
    entry.count += 1;
    if (entry.count > max) throw new TooManyRequestsError();
  };
}
