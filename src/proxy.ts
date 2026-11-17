import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/bookings", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];

const matches = (pathname: string, paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Optimistic UX check only: it looks for the Better Auth session cookie.
 * Role checks happen in the (customer) and (admin) layouts, and the API authorizes every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = !!getSessionCookie(request);

  if (!hasSession && matches(pathname, PROTECTED_PATHS)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", pathname + search);
    return NextResponse.redirect(url);
  }

  if (hasSession && matches(pathname, AUTH_PAGES)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
