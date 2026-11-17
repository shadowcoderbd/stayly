# Project rules

Architecture reference: architecture.md. Feature reference: features-spec.md. Follow both.

## Structure
- Single Next.js 16 app. Next.js is the backend: route handlers in src/app/api/v1 are the API.
- Outside v1: /api/auth (Better Auth), /api/health, /api/uploads (stored images), and future webhooks.
- app/ is routing only. Pages: read params → call a service or prefetch → render feature components.
- Route handlers: apiHandler(access, …) → parseQuery/parseBody/parse with a module schema → call a service → ok()/created(). No SQL, no business rules.
- Server code lives in src/server/:
  - modules/<x>/: <x>.service.ts (business rules), <x>.repository.ts (Drizzle queries only), <x>.schema.ts (Zod request schemas), <x>.types.ts (request/response DTOs).
  - lib/: api-handler, errors (AppError subclasses), response (ok/created/fail/file), auth (session helpers), better-auth, logger, storage, dates, rate-limit.
  - config/env.ts (validated server env) and db/ (client + schema).
- Every file in src/server/** starts with import "server-only".
- Import services and repositories as namespaces: import * as bookingService from "@/server/modules/booking/booking.service".
- Frontend code lives in src/features/<name>/ (api/, components/, hooks/, queries.ts, search-params.ts, index.ts, and schemas.ts for client form schemas only).
- Client code may only `import type` from @/server/** (DTOs from <x>.types.ts). Runtime rules shared by both sides (constants, field schemas, pure helpers) go in src/lib/domain/.
- Import other features only via @/features/<name>.

## Data
- Read-only page data: call the service directly in a Server Component (find* variants return null → notFound()).
- Interactive data: prefetch with xQueries.y(params, xService.y), read with a hook (TanStack Query).
- Writes: useMutation → client fetcher → route handler → service. No Server Actions for data writes.
- Services take (actor, input), return JSON-safe DTOs (ISO strings, cents), throw AppError subclasses. No next/* imports.
- Repositories return rows/DTOs or null; they don't throw AppErrors or apply business rules. Services own transactions and pass tx to repositories.
- Lists return Page<T> = { items, pagination }.
- Query keys and queryOptions live in features/<x>/queries.ts. Never write inline key arrays.
- Errors are toasted globally. Use meta: { silent: true } to handle one inline.
- List filters and pagination live in the URL via nuqs parsers in search-params.ts.
- Money in integer cents; stay dates as YYYY-MM-DD; multi-step writes in db.transaction with row locks.

## Components
- Server Components by default. "use client" only on the client entry a Server Component renders.
- Components never import axios, lib/http or runtime code from src/server. They call hooks.
- Reuse components/ui before creating new primitives.

## Code
- TypeScript strict. No `any`.
- Named exports, except Next.js route files.
- Don't add dependencies without asking.
- After changing a table: pnpm db:generate and commit the migration.

## Before finishing
- Run pnpm check (lint, typecheck, tests against the Compose db) and fix every error.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
