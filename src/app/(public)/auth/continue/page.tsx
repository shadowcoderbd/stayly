import { redirect } from "next/navigation";
import { landingPath } from "@/features/auth";
import { getSession } from "@/server/lib/auth";

/**
 * Where Google sign-in returns after Better Auth sets the session cookie.
 * The browser left the app, so the role-based destination is picked here (spec user-auth).
 */
export default async function AuthContinuePage({ searchParams }: PageProps<"/auth/continue">) {
  const { redirectTo } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(landingPath(session.user.role, typeof redirectTo === "string" ? redirectTo : null));
}
