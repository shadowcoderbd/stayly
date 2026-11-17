import { http } from "@/lib/http/client";
import type { Session, SignInInput, SignUpInput } from "../schemas";

// Better Auth is mounted outside the versioned API, at /api/auth.
const auth = { baseURL: "/api" };

/** Wraps Better Auth's endpoints (mounted at /api/auth) so hooks never talk to HTTP directly. */
export const authApi = {
  getSession: () => http.get<Session>("/auth/get-session", auth).then((r) => r.data ?? null),

  signIn: (input: SignInInput) => http.post("/auth/sign-in/email", input, auth).then((r) => r.data),

  signUp: ({ name, email, password }: Omit<SignUpInput, "confirmPassword">) =>
    http.post("/auth/sign-up/email", { name, email, password }, auth).then((r) => r.data),

  signOut: () => http.post("/auth/sign-out", {}, auth).then((r) => r.data),

  /** Starts Google sign-in. Returns Google's consent URL; the browser must navigate there. */
  signInSocial: ({ callbackURL, errorCallbackURL }: { callbackURL: string; errorCallbackURL: string }) =>
    http
      .post<{ url: string; redirect: boolean }>(
        "/auth/sign-in/social",
        // New users land on the same page as returning ones; the landing page picks the destination by role.
        { provider: "google", callbackURL, errorCallbackURL, newUserCallbackURL: callbackURL },
        auth,
      )
      .then((r) => r.data),
};
