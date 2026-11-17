# Design

## Context

Auth is Better Auth 1.7.25, mounted at `/api/auth/*` outside the versioned API:
- `src/server/lib/better-auth.ts` configures it: email/password, the admin plugin, and a Drizzle adapter.
- `src/server/lib/auth.ts` exposes `getSession` and the `require*` helpers.

The browser talks to it through `features/auth/api/auth.api.ts` using axios with `{ baseURL: "/api" }`. After a password sign-in, `useAfterAuth` in `useAuthMutations.ts` refetches the session in the browser and picks the destination: the safe `redirectTo`, else `/admin/bookings` for admins, else `/`.

What makes OAuth different: the browser leaves the app for Google and comes back through `/api/auth/callback/google`, so no client code runs between "signed in" and "landed". The destination and the error handling have to be decided by URLs passed in when the flow starts.

Better Auth facts this design relies on (checked in `node_modules`):
- `socialProviders.google` and `POST /sign-in/social` with `callbackURL`, `errorCallbackURL` and `newUserCallbackURL`.
- `account.accountLinking.requireLocalEmailVerified` defaults to `true`. That option is deprecated, and the gate becomes unconditional in the next minor version.
- When the email exists but linking is refused, the callback fails with "account not linked" and redirects to the error URL with `?error=<code>`.
- No schema change is needed: the `account` table already has `providerId`, `accountId` and the token columns.

## Goals / Non-Goals

**Goals:**
- Google as a second way in, on only when configured, with no effect on email/password or on deployments without credentials.
- The same landing rules and the same `redirectTo` safety as password sign-in.
- Every failure ends on `/login` with a human message.

**Non-Goals:**
- Linking Google to existing password accounts, or manual "connect Google" in a profile page. That has to wait until email verification exists (F-01 open question).
- Letting Google-created users add a password (there is no password reset yet).
- Other providers. The approach generalizes, but only Google is wired.
- Changing `/api/v1` or any domain module.

## Decisions

### D1. Enabled by the presence of credentials, validated at startup
- **Env:**
  - `src/server/config/env.ts` gets optional `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
  - A refinement fails parsing when exactly one of them is set, naming the missing one.
  - It exports `googleAuthEnabled` (both set).
- **Server:** `better-auth.ts` adds `socialProviders: { google: {...} }` only when `googleAuthEnabled` is true. When it's off, the provider isn't registered, so Better Auth itself rejects `provider: "google"`.
- **Pages:** the login and signup pages are Server Components. They read `googleAuthEnabled` and pass `googleEnabled` to `LoginForm` and `SignupForm`, and they call `connection()` first. The flag is runtime config, and the Docker image is built with placeholder env; without `connection()` a prerendered page would bake in "off".
- **Alternatives:**
  - A separate `AUTH_GOOGLE_ENABLED` flag: rejected, two switches that can disagree.
  - A `NEXT_PUBLIC_*` flag: rejected, because it's inlined at build time, so the Docker image couldn't be toggled per environment.

### D2. Starting the flow from the client
- **Fetcher and hook:**
  - `authApi.signInSocial({ callbackURL, errorCallbackURL })` posts to `/auth/sign-in/social` with `provider: "google"` and returns `{ url }`.
  - `useGoogleSignIn()` is a silent mutation that calls `window.location.assign(url)` on success and stays pending while the browser navigates away, so the button keeps its spinner.
- **Button:** a shared `GoogleSignInButton` component sits under the form on both `AuthCard`s, with an "or" divider, and renders only when `googleEnabled` is true.
- **Google options:** the provider is configured with `prompt: "select_account"`, so people with several Google accounts get to choose instead of being signed in silently with the last one.
- **Alternatives:**
  - A plain `<form action=...>` POST: rejected. Better Auth answers JSON `{ url }` to fetch calls, and using the shared client keeps it on the existing axios pattern and its error handling.
  - A Better Auth client SDK (`createAuthClient`): rejected, because it would be a second HTTP client next to `lib/http`.

### D3. Landing is decided by a server page after the callback
- **`callbackURL`:** set to `/auth/continue?redirectTo=<safe path>`. The new page `app/(public)/auth/continue/page.tsx` is routing only. It reads the session:
  - no session: `redirect("/login")`
  - otherwise: `redirect(landingPath(user.role, redirectTo))`
- **`landingPath`:** a new pure function in `features/auth/schemas.ts`, exported from `features/auth`:
  - returns `safeRedirect(redirectTo)` when the target is safe
  - otherwise `/admin/bookings` for admins and `/` for everyone else
- **Shared rule:** `LoginForm`'s `afterAuth` switches to the same function, so password and Google sign-in can't drift apart.
- **`newUserCallbackURL`:** the same as `callbackURL`. New users follow the same rules (they're always customers).
- **Proxy:** `/auth/continue` is not in the proxy's `AUTH_PAGES`, so a just-signed-in user isn't bounced to `/`.
- **Alternative:** choosing the destination in the browser before leaving. Rejected, because the role is unknown until Google tells us who the person is.

### D4. Errors come back to `/login`
- **`errorCallbackURL`:** set to `/login`, keeping `redirectTo` if present. Better Auth appends `?error=<code>`.
- **Messages:** `LoginForm` reads `error` from the URL and maps it with a small pure `googleErrorMessage(code)`:

  | Error code | Message |
  |---|---|
  | `account_not_linked` | "This email already has a Stayly account. Sign in with your password." |
  | `BANNED_USER` | "This account is suspended." |
  | anything else | "Google sign-in was cancelled or failed. Please try again." |

  These codes were verified against 1.7.25 (`account_not_linked` comes from `oauth2/link-account.mjs`; `BANNED_USER` is the admin plugin's session-create error code). Any unknown code falls back to the generic message.
- **Display:** the message uses the existing inline alert.
- **`/signup`:** it starts the flow with `errorCallbackURL=/login` too, so all errors show in one place.

### D5. No account linking, using the library default
- Leave `account.accountLinking` at its defaults, and don't add Google to `trustedProviders`. Every existing local account is unverified, so `requireLocalEmailVerified` (default `true`) refuses the link. That gives the spec's "doesn't take over password accounts" behavior with no custom code and no deprecated option.
- **Later:** when email verification ships, verified local accounts will link automatically, because Google reports `email_verified`. That is the intended future behavior, and it needs a spec update then.
- **Alternative:** turning off `requireLocalEmailVerified`, linking, and dropping the password. Rejected: it relies on an option being removed in the next minor, and it silently takes away a working login method.

### D6. Profile and role
- Better Auth's Google mapping gives `name`, `email`, `image` (picture) and `emailVerified`.
- The admin plugin's `defaultRole: "user"` already makes every new Google account a customer, so nothing extra is needed.
- The header avatar can keep using initials; showing `image` is optional polish and is not required by the spec.

## Risks / Trade-offs

- **[Risk]** The happy path can't be tested automatically without real Google credentials. → Mitigation:
  - Unit-test the pure pieces: the env refinement, `landingPath` and `googleErrorMessage`.
  - Test with fake credentials that `sign-in/social` returns an `accounts.google.com` URL with the right `redirect_uri`. No network is needed for that.
  - Test that the provider is rejected when it's disabled.
  - Add a manual checklist with a real OAuth client covering: a new user, a returning user, a refused link, cancelling, and a suspended account.
- **[Risk]** Better Auth's error code strings could change in an upgrade. → Mitigation: unknown codes fall back to the generic message, so the worst case is a less specific message, not a broken page.
- **[Risk]** A prerendered login page could freeze the flag at build time. → Mitigation: `connection()` in both pages (D1), checked in the Docker smoke test by toggling the env.
- **[Trade-off]** People who already have a password account can't switch to Google yet. The refusal message tells them to sign in with their password. This is accepted until email verification exists.
- **[Trade-off]** Accounts created through Google have no password and can't add one (there's no reset flow). If they lose access to Google, they lose access to Stayly. This is accepted for v1.
- **[Risk]** The Google redirect URI must exactly match `BETTER_AUTH_URL`. → Mitigation: document both URIs in `.env.example`:
  - `http://localhost:3000/...` for `pnpm dev`
  - `http://localhost:3100/...` for Docker

## Migration Plan

- **Deploy:** no database migration. Ship the code, then create a Google OAuth client and register `<BETTER_AUTH_URL>/api/auth/callback/google` as its redirect URI. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` and restart (`docker compose up -d`).
- **Rollback:** remove the two env vars and restart. The button disappears and the provider is unregistered. Accounts already created through Google stay in the database and can't sign in again until Google is re-enabled; that's the only lasting effect.
