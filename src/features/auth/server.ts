import "server-only";
import type { QueryClient } from "@tanstack/react-query";
import { getSession } from "@/server/lib/auth";
import { authKeys } from "./queries";
import type { Session } from "./schemas";

/** Puts the current session into the server QueryClient so `useMe()` has it on first paint. */
export async function hydrateSession(queryClient: QueryClient): Promise<Session> {
  const raw = await getSession();
  // Same JSON shape as GET /api/auth/get-session (dates become ISO strings).
  const session: Session = raw ? JSON.parse(JSON.stringify(raw)) : null;
  queryClient.setQueryData(authKeys.me(), session);
  return session;
}
