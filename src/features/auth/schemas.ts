import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80),
    email: z.email("Enter a valid email."),
    password: z.string().min(8, "Use at least 8 characters.").max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match." });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export type Role = "user" | "admin";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  image: string | null;
};

export type Session = { user: SessionUser; session: { expiresAt: string } } | null;

/** Only allow same-site relative paths, so `redirectTo` can't send people elsewhere (architecture.md §10.2). */
export function safeRedirect(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/** Where a user lands after signing in (password or Google): a safe `redirectTo`, else their role's home. */
export function landingPath(role: string | null | undefined, redirectTo?: string | null) {
  return safeRedirect(redirectTo, role === "admin" ? "/admin/bookings" : "/");
}

/*
 * Error codes Better Auth 1.7.25 appends to the error callback URL (`/login?error=<code>`):
 * - "account_not_linked": the Google email already belongs to an unverified password account,
 *   so linking was refused (oauth2/link-account.mjs, joined with "_" in api/routes/callback.mjs).
 * - "BANNED_USER": the admin plugin refused to create a session for a suspended user (plugins/admin).
 * Anything else (the user cancelled at Google, invalid_code, …) gets the generic message.
 */
const GOOGLE_ERRORS: Record<string, string> = {
  account_not_linked: "This email already has a Stayly account. Sign in with your password.",
  BANNED_USER: "This account is suspended.",
};

/** A readable message for a failed Google sign-in, or null when there is no error code. */
export function googleErrorMessage(code: string | null | undefined) {
  if (!code) return null;
  return GOOGLE_ERRORS[code] ?? "Google sign-in was cancelled or failed. Please try again.";
}
