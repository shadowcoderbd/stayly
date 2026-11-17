# Tasks

## 1. Configuration and provider (server)

- [x] 1.1 In `src/server/config/env.ts`, add optional `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, with a refinement that fails when exactly one is set (naming the missing variable), and export `googleAuthEnabled`. Move the env schema into an exported pure parse function so it can be tested. Verify with a new `test/env.test.ts` covering: none set (disabled), both set (enabled), and only one set (throws, naming the missing var).
- [x] 1.2 In `src/server/lib/better-auth.ts`, register `socialProviders.google` (clientId, clientSecret, `prompt: "select_account"`) only when `googleAuthEnabled` is true. Leave `account.accountLinking` at its defaults (design D5). Verify with `pnpm typecheck` and the tests in 1.3.
- [x] 1.3 Add dummy Google credentials to the `vitest.config.ts` env and add `test/google-auth.test.ts`. Assert that `auth.api.signInSocial({ body: { provider: "google", callbackURL: "/auth/continue" } })` returns a URL on `accounts.google.com` whose `redirect_uri` is `<BETTER_AUTH_URL>/api/auth/callback/google`. Verify that `pnpm test` passes and the existing 30 tests still pass.
- [x] 1.4 Document the two variables in `.env.example`: both or neither, plus the redirect URIs for `pnpm dev` (`:3000`) and Docker (`:3100`). Verify by reading the file; the docker-compose `env_file` already passes them through.

## 2. Landing and error rules (shared, pure)

- [x] 2.1 In `src/features/auth/schemas.ts`, add `landingPath(role, redirectTo)` (safe `redirectTo`, else `/admin/bookings` for admins, else `/`) and `googleErrorMessage(code)`, and export both from `features/auth/index.ts`. First check the real error codes Better Auth 1.7.25 sends for a refused link and for a banned user (`node_modules/better-auth/dist/oauth2/link-account.mjs` and the admin plugin), and record them in a comment. Verify with unit tests in `test/auth-rules.test.ts`, covering: safe and unsafe `redirectTo` (`//evil.example`, `/\\x`), admin and customer defaults, and each mapped code plus an unknown one.
- [x] 2.2 Switch `LoginForm`'s `afterAuth` destination to `landingPath`, so password and Google sign-in share one rule. Verify that `pnpm check` passes and that a password sign-in as admin and as customer still lands on `/admin/bookings` and `/` (manual check in `pnpm dev`).

## 3. Google sign-in flow (frontend + landing page)

- [x] 3.1 Add `authApi.signInSocial({ callbackURL, errorCallbackURL })` to `features/auth/api/auth.api.ts`. It posts `{ provider: "google", callbackURL, errorCallbackURL, newUserCallbackURL: callbackURL }` to `/auth/sign-in/social` with the `{ baseURL: "/api" }` override and returns `{ url }`. Add `useGoogleSignIn()` to `useAuthMutations.ts`: a silent mutation that calls `window.location.assign(url)` and stays pending while the page navigates. Verify with `pnpm typecheck` and `pnpm lint`; the boundary rules must still pass.
- [x] 3.2 Add a `GoogleSignInButton` component (Google mark, "Continue with Google", spinner while pending, inline error if starting fails) plus an "or" divider. Render it in `LoginForm` and `SignupForm` only when the `googleEnabled` prop is true, and reuse `components/ui/Button`. Both forms build `callbackURL=/auth/continue?redirectTo=<safe>` and `errorCallbackURL=/login?redirectTo=<safe>`. Verify by hand in `pnpm dev`: the button shows with credentials set and is hidden without them.
- [x] 3.3 Update `app/(public)/login/page.tsx` and `signup/page.tsx` to `await connection()`, read `googleAuthEnabled` from `@/server/config/env` and pass `googleEnabled` down. Verify that `pnpm build` lists `/login` and `/signup` as dynamic (ƒ).
- [x] 3.4 Add `app/(public)/auth/continue/page.tsx`. It reads the session (no session: `redirect("/login")`), then `redirect(landingPath(user.role, redirectTo))`. Check that `src/proxy.ts` doesn't bounce `/auth/continue`. Verify by hand: signed out goes to `/login`; signed in as a customer with `?redirectTo=/bookings` goes to `/bookings`; signed in as admin with no target goes to `/admin/bookings`.
- [x] 3.5 Have `LoginForm` read `?error=` and show `googleErrorMessage(code)` in the existing alert. Verify by hand: `/login?error=account_not_linked`, `?error=banned` and `?error=whatever` each show the spec's message.
- [x] 3.6 Update the docs: `features-spec.md` F-01 (the Google option, the no-linking rule and the error messages) and `architecture.md` §9 (provider config, `/auth/continue`, the env flag). Verify that a grep for "Continue with Google" finds both docs and that `pnpm lint` passes.

## 4. Integration checks

- [x] 4.1 Run `pnpm check` (lint, typecheck, all tests against the Compose db) and fix every error.
- [x] 4.2 Docker without credentials: `docker compose up -d --build`, then confirm that `/login` has no Google button, that `POST /api/auth/sign-in/social {provider:"google"}` is rejected, and that the earlier 49-check smoke script still passes.
- [x] 4.3 Docker with a real Google OAuth client (the user supplies the credentials; redirect URI `http://localhost:3100/api/auth/callback/google`): add the vars and restart, then go through the scenarios in `specs/user-auth/spec.md`:
  - a new Google user is created as a customer and lands on `/`
  - a returning user signs in again
  - `redirectTo=/bookings` is honored
  - a Google email that matches the seeded password user `avery@stayly.local` is refused with the message (needs a Google account with that email, or a temporary seeded user with the tester's Gmail)
  - cancelling at Google shows the generic message
  - a suspended Google user is refused

  Remove any test users afterwards.

## Workflow follow-up

- Archive the change after review, which creates `openspec/specs/user-auth/spec.md` from the delta.
- Consider migrating the rest of F-01 (email/password) into `user-auth` in a separate change.
