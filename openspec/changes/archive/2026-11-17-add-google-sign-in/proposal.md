# Proposal

## Why

Today the only way into Stayly is email and password, so every new guest has to invent and remember another password before they can request a booking. Letting people continue with their Google account removes that step for sign-up and sign-in, and it costs the app nothing when an operator doesn't want it: the option only appears when Google credentials are configured.

## What Changes

- Add **"Continue with Google"** to `/login` and `/signup`. One button covers both: the first Google sign-in creates the account, later ones sign in.
- The option is **enabled by configuration**: it is on only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. Without them the button is not rendered and the Google endpoints are not registered. Setting just one of the two is a startup error.
- Accounts created through Google get the normal customer role (`user`), take their name and avatar from Google, and are marked email-verified.
- After a Google sign-in the user lands where a password sign-in would send them: the safe `redirectTo` if there is one, otherwise `/admin/bookings` for admins and `/` for everyone else.
- If the Google email already belongs to an email/password account, **the accounts are not linked**. The user is sent back to `/login` with a message to sign in with their password. This keeps Better Auth's default protection against account pre-hijacking, because local emails are never verified in v1.
- Failed or cancelled Google sign-ins return to `/login` with a readable message instead of Better Auth's error page. That includes suspended accounts.
- Email/password sign-up and sign-in work exactly as before.

## Capabilities

### New Capabilities
- `user-auth`: How people get an account and a session. This change only adds the Google sign-in requirements; the existing email/password behavior stays described in `features-spec.md` F-01 until it is migrated.

### Modified Capabilities
<!-- None: no specs exist yet under openspec/specs/. -->

## Impact

- **Server config**:
  - `src/server/config/env.ts` gets two optional env vars, which must be set together.
  - `src/server/lib/better-auth.ts` registers the Google provider when they are set.
- **Routes**:
  - Better Auth's `/api/auth/sign-in/social` and `/api/auth/callback/google` become active. No `/api/v1` routes change.
  - A small server-only landing page decides where to go after sign-in, based on the user's role.
- **Frontend**: `features/auth` gets a fetcher, a hook, a Google button on both auth cards, and error messages on `/login`.
- **Database**: none. The Better Auth `account` table already stores OAuth accounts, so no migration is needed.
- **Dependencies**: none. This uses the installed `better-auth@1.7.25`.
- **Ops**:
  - Operators create a Google OAuth client, register `<BETTER_AUTH_URL>/api/auth/callback/google` as its redirect URI, and add the two vars to `.env`.
  - Docker passes them through the existing `env_file`.
- **Docs**:
  - `.env.example`
  - `features-spec.md` F-01
  - `architecture.md` §9 (Auth)
