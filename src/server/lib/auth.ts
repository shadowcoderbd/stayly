import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth, type AuthSession } from "./better-auth";

/** The signed-in user a service acts for. */
export type Actor = AuthSession["user"];

/** The current session, once per request (shared by layouts, pages and route handlers). */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  return auth.api.getSession({ headers: await headers() });
});

/** For pages and layouts: redirect instead of throwing. */
export async function requireUser(redirectTo = "/") {
  const session = await getSession();
  if (!session) redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  return session.user;
}

export async function requireCustomer(redirectTo = "/") {
  const user = await requireUser(redirectTo);
  if (user.role === "admin") redirect("/admin/bookings");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin/bookings");
  if (user.role !== "admin") redirect("/");
  return user;
}
