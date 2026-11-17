# Next.js Full-Stack Architecture

A structure for **Next.js 16 (App Router) + TypeScript** apps where **Next.js is the backend too**: route handlers are the API, Server Components read data directly, and PostgreSQL is accessed through Drizzle. Auth is Better Auth.

This replaces the earlier baseline, which assumed an external REST API. It keeps what worked there (TanStack Query for interactive server state, Zod schemas, feature folders, domain-named hooks, URL state with nuqs) and adds a server layer that lives inside the app.

> **Target versions:** Next.js 16.x · React 19 · TanStack Query v5 · Zod v4 · Drizzle ORM · Better Auth 1.x · PostgreSQL 17 · Node 20.9+

---

## Table of Contents

0. [What Changed From the External-API Baseline](#0-what-changed-from-the-external-api-baseline)
1. [Stack](#1-stack)
2. [Folder Structure](#2-folder-structure)
3. [Dependency Rules](#3-dependency-rules)
4. [Server vs Client Components](#4-server-vs-client-components)
5. [Three Ways to Touch Data](#5-three-ways-to-touch-data)
6. [The Server Layer: Services](#6-the-server-layer-services)
7. [Route Handlers (the API)](#7-route-handlers-the-api)
8. [Database](#8-database)
9. [Auth](#9-auth)
10. [TanStack Query Setup](#10-tanstack-query-setup)
11. [Feature Anatomy (hotels)](#11-feature-anatomy-hotels)
12. [Example: Mutation + Form (request a booking)](#12-example-mutation--form-request-a-booking)
13. [Loading, Errors and Not Found](#13-loading-errors-and-not-found)
14. [Client State](#14-client-state)
15. [Environment Variables](#15-environment-variables)
16. [Files and Uploads](#16-files-and-uploads)
17. [Tooling and Guardrails](#17-tooling-and-guardrails)
18. [Testing](#18-testing)
19. [Docker](#19-docker)
20. [Conventions](#20-conventions)
21. [Checklists](#21-checklists)
22. [AGENTS.md for AI Coding Tools](#22-agentsmd-for-ai-coding-tools)
23. [Architecture Decisions](#23-architecture-decisions)

---

## 0. What Changed From the External-API Baseline

| External-API baseline | Full-stack baseline | Why |
| --- | --- | --- |
| A separate backend owns the data; Next.js proxies `/api/*` to it | Next.js **is** the backend. `app/api/v1/**/route.ts` are the endpoints (`/api/auth`, `/api/health`, `/api/uploads` sit outside `v1`) | One app, one deploy, one language, shared types end to end. A version prefix leaves room for a breaking `v2`. |
| Server Components fetch over HTTP with a per-request axios instance that forwards cookies | Server Components **call services directly** (`hotelService.search(...)`) | No extra network hop, no cookie forwarding, typed results. |
| `features/x/api/x.api.server.ts` (server HTTP client) | `server/modules/x/`: `x.service.ts` (business rules) + `x.repository.ts` (Drizzle) + `x.schema.ts` (Zod) + `x.types.ts` (DTOs) | The server side is real code now, not a fetch wrapper, and it lives apart from the UI. |
| Prefetch with the server API instance | Prefetch with the **service** as the `queryFn`; client hooks refetch through the route handler | Same query key on both sides; both return the same JSON-safe DTO. |
| `proxy.ts` checks a backend cookie | `proxy.ts` checks the Better Auth session cookie; layouts check roles; services/route handlers enforce | Same layered model, but every layer is in this repo. |
| Refresh-token interceptor | None. Better Auth uses one sliding session cookie | Nothing to refresh. A 401 means "sign in again". |
| `lib/http/server.ts` | `src/server/**` (`config/`, `db/`, `lib/`, `modules/`) | Server-only code has its own top-level folder, guarded by `server-only`. |

What did **not** change: TanStack Query owns interactive server state on the client, mutations go through HTTP (`useMutation` → route handler), forms use react-hook-form + Zod, filters live in the URL via nuqs, and features are folders with a public `index.ts`.

---

## 1. Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16, App Router, Turbopack (default) |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` |
| Database | PostgreSQL 17 + **Drizzle ORM** (`node-postgres` driver), migrations with `drizzle-kit` |
| Auth | **Better Auth** (email + password, `admin` plugin for roles), mounted at `/api/auth/*` |
| Server state (client) | TanStack Query v5 (+ devtools in development) |
| HTTP (client → route handlers) | Axios, one browser instance with `baseURL: "/api/v1"` |
| URL state | `nuqs` (type-safe search params, readable on the server) |
| Validation | Zod v4 (route input, forms, env) |
| Forms | react-hook-form + `@hookform/resolvers/zod` |
| Toasts | react-hot-toast, wrapped in `lib/toast.ts` |
| Styling | Tailwind CSS v4 + `cn()` (`clsx` + `tailwind-merge`); Radix primitives via `radix-ui` |
| Images | `sharp` (validate + re-encode uploads) |
| Logging | `pino` (JSON) |
| Lint / format | ESLint flat config (`eslint-config-next`) + Prettier |
| Tests | Vitest (services + route handlers against a real Postgres), Testing Library + MSW (components), Playwright (e2e) |
| Local runtime | Docker Compose: `db`, `migrate` (one-shot), `web` |

Path alias: `@/*` → `./src/*`.

```bash
pnpm create next-app@latest my-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
pnpm add @tanstack/react-query axios nuqs zod react-hook-form @hookform/resolvers react-hot-toast clsx tailwind-merge server-only \
  drizzle-orm pg better-auth sharp pino radix-ui
pnpm add -D drizzle-kit @types/pg tsx @tanstack/react-query-devtools vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom msw @playwright/test prettier prettier-plugin-tailwindcss
```

---

## 2. Folder Structure

```
.
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── drizzle/                            # generated SQL migrations (committed)
├── scripts/
│   ├── migrate.ts                      #   applies migrations (runs in the `migrate` container)
│   └── seed.ts                         #   demo data, idempotent
├── seed/                               # seed assets (images)
└── src/
    ├── app/                            # ROUTING ONLY. Pages, layouts and route handlers are thin.
    │   ├── layout.tsx                  #   html/body + <Providers>
    │   ├── providers.tsx               #   "use client": QueryClient, nuqs, Toaster, devtools
    │   ├── globals.css
    │   ├── error.tsx · global-error.tsx · not-found.tsx
    │   ├── (public)/                   #   no sign-in needed
    │   │   ├── page.tsx                #     browse
    │   │   ├── hotels/[slug]/page.tsx
    │   │   ├── login/page.tsx · signup/page.tsx
    │   ├── (customer)/                 #   signed-in customers (layout checks the role)
    │   │   └── bookings/…
    │   ├── (admin)/admin/              #   admins only (layout checks the role)
    │   │   └── hotels/ · bookings/ · finance/
    │   └── api/                        #   THE API: route handlers only
    │       ├── v1/                     #     versioned business API (axios baseURL "/api/v1")
    │       │   ├── hotels/route.ts · hotels/[slug]/route.ts · hotels/top-rated · trending · …
    │       │   ├── destinations/ · locations/
    │       │   ├── bookings/…
    │       │   └── admin/              #       hotels/… · bookings/… · finance/… (incl. transactions.csv)
    │       ├── auth/[...all]/route.ts  #     Better Auth (outside v1)
    │       ├── health/route.ts         #     liveness + DB check (outside v1)
    │       └── uploads/[...path]/route.ts  # stored images (outside v1)
    ├── proxy.ts                        # optimistic auth redirects (formerly middleware.ts)
    │
    ├── server/                         # SERVER-ONLY. Every file starts with import "server-only".
    │   ├── config/
    │   │   └── env.ts                  #   validated server env (serverEnv, isProd)
    │   ├── db/
    │   │   ├── client.ts               #   pool + drizzle instance (HMR-safe singleton)
    │   │   └── schema/                 #   auth.ts, catalog.ts, bookings.ts, columns.ts, index.ts
    │   ├── lib/                        #   infrastructure, no domain knowledge
    │   │   ├── api-handler.ts          #     apiHandler() wrapper + parse/parseQuery/parseBody/parseForm
    │   │   ├── errors.ts               #     AppError + BadRequestError, NotFoundError, ConflictError, …
    │   │   ├── response.ts             #     ok(), created(), fail(), file()
    │   │   ├── auth.ts                 #     getSession(), Actor, requireUser/Customer/Admin() for pages
    │   │   ├── better-auth.ts          #     betterAuth({...}) instance
    │   │   ├── storage.ts              #     image storage (local volume; swappable)
    │   │   ├── dates.ts                #     today() in APP_TIMEZONE (+ re-exported nightsBetween/addDays)
    │   │   ├── logger.ts · rate-limit.ts
    │   └── modules/                    #   one folder per business domain
    │       ├── hotel/
    │       │   ├── hotel.schema.ts     #     Zod request schemas (query, body, params)
    │       │   ├── hotel.types.ts      #     request types (z.output) + response DTOs
    │       │   ├── hotel.repository.ts #     Drizzle queries only; rows/DTOs or null
    │       │   ├── hotel.service.ts    #     public catalog: business rules
    │       │   └── hotel-admin.service.ts  # admin management (same repository)
    │       ├── booking/                #     booking.{schema,types,repository,service,pricing}.ts
    │       └── finance/                #     finance.{schema,types,repository,service}.ts
    │
    ├── lib/                            # Isomorphic + client infrastructure. No feature knowledge.
    │   ├── env.ts                      #   public env vars (safe in the browser)
    │   ├── domain/                     #   runtime rules shared by client and server
    │   │   ├── hotel.ts                #     hotelFields, MAX_IMAGES, status lists
    │   │   ├── booking.ts              #     MAX_GUESTS, tabs, rejectionReasonSchema, hasReceipt()
    │   │   └── period.ts               #     month helpers, defaultPeriod()
    │   ├── dates.ts                    #   pure date helpers + daySchema, refineStay, stayRangeSchema
    │   ├── http/
    │   │   ├── client.ts               #   browser axios instance (baseURL "/api/v1")
    │   │   └── errors.ts               #   getErrorMessage(), isClientError()
    │   ├── query/
    │   │   ├── defaults.ts             #   shared QueryClient defaults
    │   │   ├── client.ts               #   getQueryClient(): browser singleton + global error toasts
    │   │   └── server.ts               #   getServerQueryClient(): one per request
    │   ├── format.ts · query-string.ts · toast.ts · utils.ts
    │
    ├── features/                       # FRONTEND, one folder per business area
    │   └── hotels/
    │       ├── api/
    │       │   └── hotel.api.ts        #   client fetchers → /api/v1/hotels/* (unwrap the envelope)
    │       ├── components/             #   HotelCard.tsx, AllHotels.tsx, …
    │       ├── hooks/                  #   useHotels.ts, useHotelListParams.ts, …
    │       ├── queries.ts              #   hotelKeys + hotelQueries (queryOptions, injectable fetcher)
    │       ├── search-params.ts        #   nuqs parsers + server loader
    │       ├── schemas.ts              #   (when needed) client form schemas only
    │       └── index.ts                #   PUBLIC API (client-safe)
    │                                   #   features/auth/server.ts (hydrateSession) is the only feature server file
    │
    ├── components/                     # Shared UI, no business logic
    │   ├── ui/                         #   Button, Field, Badge, Dialog, Table, Pagination, …
    │   └── layout/                     #   AppHeader, PageHeader, …
    ├── hooks/                          # Generic hooks (useDebouncedValue, useMediaQuery)
    └── types/
        ├── api.ts                      #   ApiResponse, Page, ApiError
        └── react-query.d.ts            #   typed query/mutation meta
```

### Where things go

| Code | Location |
| --- | --- |
| A page, layout, loading or error file | `app/(group)/…` |
| An HTTP endpoint | `app/api/v1/**/route.ts` (thin: calls a service) |
| Business rules, transactions | `server/modules/<x>/<x>.service.ts` |
| Drizzle queries | `server/modules/<x>/<x>.repository.ts` |
| Table definitions | `server/db/schema/<domain>.ts` |
| Request schemas (Zod) | `server/modules/<x>/<x>.schema.ts` |
| Request and response DTO types | `server/modules/<x>/<x>.types.ts` |
| Constants, field schemas and pure helpers both sides need | `lib/domain/<x>.ts` |
| Client-only form schemas | `features/<x>/schemas.ts` |
| A client fetcher for an endpoint | `features/<x>/api/<x>.api.ts` |
| A query key + `queryOptions` | `features/<x>/queries.ts` |
| A query or mutation hook | `features/<x>/hooks/` |
| URL search-param definitions | `features/<x>/search-params.ts` |
| A component used by one feature | `features/<x>/components/` |
| A reusable UI primitive | `components/ui/` |
| DB client, auth instance, API handler, responses, storage | `server/lib/`, `server/db/`, `server/config/` |
| Axios, QueryClient, formatting, toasts, public env | `lib/` |

When two features need the same UI or hooks, **import the other feature's public API** (`@/features/hotels`). On the server, a module may call another module's service or repository directly (the booking service uses `hotel.repository.ts`). Don't copy it.

---

## 3. Dependency Rules

```
app/(pages)  ──►  features/* (index.ts) · server/modules/*/*.service · server/lib/auth
app/api/v1   ──►  server/lib/{api-handler,response} · server/modules/*/{*.schema,*.service}
server/modules/<x>/*.service  ──►  ./*.repository · server/lib/* · other modules' services/repositories
server/modules/<x>/*.repository  ──►  server/db/* · server/lib/{storage,dates}
server/*  ──►  lib/domain · lib/dates · types/
features/* (client parts)  ──►  components/ · hooks/ · lib/ · types/ · `import type` from server/modules/*/*.types
```

1. **Nothing imports from `app/`.** Routes are leaves.
2. **`server/`, `lib/`, `types/`, `components/` and `hooks/` never import from `features/`.**
3. **Features import each other only through `@/features/<x>`.** Inside a feature, use relative imports. Server modules import each other by file (`@/server/modules/hotel/hotel.repository`).
4. **The server/client wall.** Every file in `server/**` (and `features/auth/server.ts`) starts with `import "server-only"`. Client code (components, hooks, `api/`, `queries.ts`, `search-params.ts`, `schemas.ts`, `index.ts`) may only `import type` from `@/server/**` (DTOs from `<x>.types.ts`, erased at build time). Runtime code both sides need goes in `lib/domain/` or `lib/dates.ts`. A runtime import fails lint and the build.
5. **SQL lives only in repositories** (`server/modules/*/*.repository.ts`) and `server/db/`. Services, pages, route handlers and components never build queries.
6. **Modules don't know about HTTP or Next.js.** No `headers()`, `cookies()`, `NextRequest`, `NextResponse`, `redirect()`, `api-handler` or `response` in `server/modules/**`. Services take an explicit `actor` (the signed-in user) and validated input, return DTOs, and throw `AppError` subclasses. Route handlers and pages do the translating. This keeps services testable and reusable from pages, route handlers and scripts.
7. **Repositories are dumb.** They return rows/DTOs or `null`, never throw `AppError`, and apply no business rules. Services own transactions and pass `tx` to repository functions that take a `DbOrTx`.
8. **Route handlers and pages are thin.** Parse input → authorize → call a service → respond or render.
9. **Components never import `axios` or `lib/http`.** They call hooks.
10. **Client fetchers (`api/`) never import React or TanStack.**
11. **DTOs are JSON-safe**: strings, numbers, booleans, arrays and plain objects only. Timestamps are ISO strings, dates are `YYYY-MM-DD`, money is integer cents. A service result must look exactly like the JSON a route handler sends, because the same query key is filled by both (§5).

These rules are enforced with ESLint in [§17](#17-tooling-and-guardrails).

---

## 4. Server vs Client Components

Everything is a **Server Component** by default. A component becomes a Client Component only when it needs state, effects, event handlers, browser APIs, nuqs or TanStack hooks.

| Use a Server Component for | Use a Client Component for |
| --- | --- |
| Pages and layouts | Anything using `useQuery` / `useMutation` |
| Read-only content (details, receipts, "top rated" sections) | Forms, filters, tabs, pagination |
| Calling services directly | URL state (`nuqs`) |
| Prefetching data for client lists | Modals, dropdowns, toasts |
| Session and role checks, `redirect()`, `notFound()` | Anything with `onClick` / `onChange` |

Rules:
- Put `"use client"` on the component a Server Component renders (the client entry point). Its children are client code automatically. Hook files don't need the directive, **except** a hook file re-exported from a feature's `index.ts` that imports `next/navigation`. Mark that one `"use client"` so server files can import the barrel.
- Keep client boundaries **low**: a page is a Server Component that renders `<AllHotels/>`, not a client page.
- Props crossing the boundary must be serializable. Pass DTOs, never Drizzle rows or class instances.
- A Server Component can render a Client Component and pass Server Components to it as `children`.

---

## 5. Three Ways to Touch Data

Pick the first one that fits.

### 5.1 Read-only → call the service in a Server Component

Content that never refetches, filters or mutates on the client (hotel details, a receipt, a "top rated" strip):

```tsx
// app/(public)/hotels/[slug]/page.tsx (trimmed)
import { notFound } from "next/navigation";
import { cache } from "react";
import { HotelAbout, HotelGallery } from "@/features/hotels";
import * as hotelService from "@/server/modules/hotel/hotel.service";

// Once per request: generateMetadata and the page share it.
const getHotel = cache((slug: string) => hotelService.findBySlug(slug));

export default async function HotelPage({ params }: PageProps<"/hotels/[slug]">) {
  const { slug } = await params;
  const hotel = await getHotel(slug); // null, not a thrown 404
  if (!hotel) notFound();
  return (
    <>
      <HotelGallery hotel={hotel} />
      <HotelAbout hotel={hotel} />
    </>
  );
}
```

No HTTP, no TanStack. If the data must be fresh after a client mutation, call `router.refresh()` from the mutation's `onSuccess`.

### 5.2 Interactive → prefetch with the service, read with a hook

Lists with filters, pagination, tabs, or anything the client mutates. The Server Component fills the query cache **using the service**; the client hook reads the same key and later refetches **through the route handler**:

```tsx
// app/(public)/page.tsx (trimmed)
import * as hotelService from "@/server/modules/hotel/hotel.service";

const params = await loadHotelListParams(searchParams);
const query = toHotelQuery(params);
const queryClient = getServerQueryClient();
await queryClient.prefetchQuery(hotelQueries.list(query, hotelService.search));

return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <AllHotels />
  </HydrationBoundary>
);
```

This works because `hotelQueries.list(params, fetcher)` takes the fetcher as an argument (§11.4). It defaults to the browser fetcher, and TypeScript checks that the service returns the same type.

### 5.3 Writes → `useMutation` → route handler → service

```
Client form ─► useCreateBooking() ─► bookingApi.create() ─► POST /api/v1/bookings ─► bookingService.create(actor, input)
                                                                                         └► bookingRepo / hotelRepo (in one tx)
```

On success the hook invalidates the affected query keys. If the page also shows server-rendered data that changed, it calls `router.refresh()`.

**Server Actions are not used for data writes** (see §23): route handlers give one error path (status codes → global toasts), work with multipart uploads and CSV downloads, run concurrently, and are a real API other clients can call.

---

## 6. The Server Layer: Services

Each business domain is a folder in `server/modules/<x>/` with four kinds of file:

| File | Owns | Never |
| --- | --- | --- |
| `<x>.schema.ts` | Zod request schemas (query, body, route params) | Imports Drizzle |
| `<x>.types.ts` | Request types (`z.output<typeof schema>`) and response DTOs | Runtime code (types only, so the client can `import type`) |
| `<x>.repository.ts` | Drizzle queries; maps rows to DTOs | Throws `AppError` or applies business rules. Missing rows come back as `null` |
| `<x>.service.ts` | Business rules, authorization on data, transactions, logging | Imports `next/*`, `api-handler` or `response` |

A module can have more than one service over the same repository (`hotel.service.ts` for the public catalog, `hotel-admin.service.ts` for management) and helpers like `booking.pricing.ts` (`quote()`, the only source of truth for prices). Callers import services and repositories as namespaces:

```ts
import * as bookingService from "@/server/modules/booking/booking.service";
```

A service is a module of plain async functions. It owns the business rules and the transactions for one domain:

```ts
// server/modules/booking/booking.service.ts (excerpt)
import "server-only";
import { serverEnv } from "@/server/config/env";
import { db } from "@/server/db/client";
import type { Actor } from "@/server/lib/auth";
import { nightsBetween, today } from "@/server/lib/dates";
import { BadRequestError, ConflictError, NotFoundError, TooManyRequestsError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import * as hotelRepo from "@/server/modules/hotel/hotel.repository";
import { quote } from "./booking.pricing";
import * as bookingRepo from "./booking.repository";
import type { CreateBookingInput, CreatedBooking } from "./booking.types";

export async function create(actor: Actor, input: CreateBookingInput): Promise<CreatedBooking> {
  if (input.checkIn < today()) throw new BadRequestError("checkIn: Check-in can't be in the past.");

  return db.transaction(async (tx) => {
    // Serialize requests per user so the overlap and pending-limit checks can't race.
    await bookingRepo.lockUser(tx, actor.id);

    const h = await hotelRepo.findBookable(tx, input.hotelId);
    if (!h) throw new NotFoundError("Hotel not found.");

    if ((await hotelRepo.roomsLeft(tx, h.id, h.rooms, input.checkIn, input.checkOut)) <= 0)
      throw new ConflictError("This hotel is fully booked for these dates.");

    const overlap = await bookingRepo.findOverlap(tx, { userId: actor.id, hotelId: h.id, checkIn: input.checkIn, checkOut: input.checkOut });
    if (overlap) throw new ConflictError(`You already have booking ${overlap.ref} at ${h.name} for overlapping dates.`);

    const max = serverEnv.MAX_PENDING_PER_USER;
    if ((await bookingRepo.countPending(tx, actor.id)) >= max)
      throw new TooManyRequestsError(`You can have at most ${max} pending requests. Wait for a decision or cancel one.`);

    const created = await bookingRepo.insert(tx, {
      userId: actor.id,
      hotelId: h.id,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      ...quote(h.nightlyRateCents, nightsBetween(input.checkIn, input.checkOut)),
    });

    logger.info({ event: "booking.requested", bookingId: created.id, ref: created.ref, actor: actor.id });
    return created;
  });
}
```

The repository functions it calls take a `DbOrTx`, so they run inside the service's transaction:

```ts
// server/modules/hotel/hotel.repository.ts (excerpt)
/** What a booking needs from a published hotel. */
export async function findBookable(dbx: DbOrTx, id: string) {
  const [row] = await dbx
    .select({ id: hotel.id, name: hotel.name, rooms: hotel.rooms, nightlyRateCents: hotel.nightlyRateCents })
    .from(hotel)
    .where(and(eq(hotel.id, id), published))
    .limit(1);
  return row ?? null;
}

/** Locks the hotel row (FOR UPDATE) and returns its room count. */
export async function lockRooms(tx: DbOrTx, id: string) {
  const [row] = await tx.select({ rooms: hotel.rooms }).from(hotel).where(eq(hotel.id, id)).for("update");
  return row?.rooms ?? null;
}
```

Rules:
- **Input is already validated** by the caller (route handler or page) with the Zod schema from `<x>.schema.ts`. Services still check business rules (availability, ownership, state transitions, "not in the past", which needs the app time zone).
- **Authorization that depends on data lives in the service** ("only the owner can cancel", "only pending can be approved"). Role checks (`admin` vs `customer`) happen in `apiHandler` or the layout before the service is called.
- **Errors are thrown as `AppError` subclasses** (`throw new NotFoundError("Hotel not found.")`) with a message safe to show users. Repositories return `null`; the service decides whether that's a 404.
- **Return DTOs**: the types in `<x>.types.ts` (ISO strings, cents). Never return a raw row that contains secrets or `Date` objects. Lists return `Page<T>`, built with `toPage(items, { page, limit, totalDocs })` from `types/api.ts`.
- **Multi-step writes run in one `db.transaction`** opened by the service. Lock the rows a decision depends on (`.for("update")`) to prevent races.

```ts
// server/lib/errors.ts
import "server-only";

export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 429;

/** An error whose message is safe to show users. apiHandler turns it into a status code. */
export class AppError extends Error {
  constructor(
    readonly statusCode: ErrorStatus,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Invalid request.") {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to this.") {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests. Try again in a minute.") {
    super(429, message);
  }
}
```

---

## 7. Route Handlers (the API)

### 7.1 Response shapes: `types/api.ts`

```ts
export type ApiResponse<T> = { message: string; statusCode: number; data: T };
export type Pagination = { page: number; limit: number; totalDocs: number; totalPages: number };
export type Page<T> = { items: T[]; pagination: Pagination };
export type ApiError = { message: string; statusCode: number };
```

Every endpoint except `/api/auth/*` (Better Auth's own), `/api/health`, `/api/uploads/*` and file downloads returns `ApiResponse<T>`. Lists return `ApiResponse<Page<T>>`, so a list service returns `Page<T>` (via `toPage()` in the same file) and both sides of §5.2 produce the same value.

The envelope is built by `server/lib/response.ts`:

```ts
import "server-only";
import { NextResponse } from "next/server";
import type { ApiError, ApiResponse } from "@/types/api";

/** 200 with the `{ message, statusCode, data }` envelope the client unwraps. */
export const ok = <T>(data: T, message = "OK") =>
  NextResponse.json<ApiResponse<T>>({ message, statusCode: 200, data }, { status: 200 });

/** 201 with the same envelope. */
export const created = <T>(data: T, message = "Created.") =>
  NextResponse.json<ApiResponse<T>>({ message, statusCode: 201, data }, { status: 201 });

/** An error body: `{ message, statusCode }`. */
export const fail = (statusCode: number, message: string) =>
  NextResponse.json<ApiError>({ message, statusCode }, { status: statusCode });

/** A file download (no envelope). */
export const file = (body: BodyInit, { contentType, filename }: { contentType: string; filename: string }) =>
  new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
```

### 7.2 The `apiHandler()` wrapper: `server/lib/api-handler.ts`

One wrapper handles auth, input errors, `AppError`s and request logging, so each handler is a few lines. The request-parsing helpers live in the same file. `authorize()` is here too (not in `server/lib/auth.ts`), so route tests only need to mock `getSession`.

```ts
import "server-only";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { getSession, type Actor } from "./auth";
import { AppError, BadRequestError, ForbiddenError, UnauthorizedError } from "./errors";
import { logger } from "./logger";
import { fail } from "./response";

/** Who may call an endpoint. "customer" = signed in and not an admin. */
export type Access = "public" | "user" | "customer" | "admin";

type Context<P, A extends Access> = {
  req: NextRequest;
  params: P;
  actor: A extends "public" ? null : Actor;
};

/**
 * Wraps every route handler: authorizes the caller, logs the request,
 * maps AppErrors to their status code and anything unexpected to a logged 500.
 */
export function apiHandler<P = Record<string, never>, A extends Access = "public">(
  access: A,
  handler: (ctx: Context<P, A>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<Response> => {
    const started = performance.now();
    let res: Response;
    try {
      const actor = access === "public" ? null : await authorize(access);
      res = await handler({ req, params: await ctx.params, actor: actor as Context<P, A>["actor"] });
    } catch (error) {
      res = toErrorResponse(error, req);
    }
    logger.debug(
      { method: req.method, path: req.nextUrl.pathname, status: res.status, ms: Math.round(performance.now() - started) },
      "api",
    );
    return res;
  };
}

async function authorize(access: Exclude<Access, "public">): Promise<Actor> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  const actor = session.user;
  if (actor.banned) throw new ForbiddenError("This account is suspended.");
  if (access === "admin" && actor.role !== "admin") throw new ForbiddenError();
  if (access === "customer" && actor.role === "admin") throw new ForbiddenError("Admins can't do this. Use a customer account.");
  return actor;
}

function toErrorResponse(error: unknown, req: NextRequest) {
  if (error instanceof AppError) return fail(error.statusCode, error.message);
  logger.error({ err: error, method: req.method, path: req.nextUrl.pathname }, "unhandled error");
  return fail(500, "Something went wrong. Please try again.");
}

/* ───────── Request parsing: failures become a 400 naming the first issue ───────── */

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  throw new BadRequestError(issue?.path.length ? `${issue.path.join(".")}: ${issue.message}` : (issue?.message ?? "Invalid request."));
}

export const parseQuery = <S extends z.ZodType>(req: NextRequest, schema: S) =>
  parse(schema, Object.fromEntries(req.nextUrl.searchParams));

export const parseBody = async <S extends z.ZodType>(req: NextRequest, schema: S) =>
  parse(schema, await req.json().catch(() => ({})));

export async function parseForm(req: NextRequest) {
  return req.formData().catch(() => {
    throw new BadRequestError("Send the data as multipart/form-data.");
  });
}
```

### 7.3 A route handler

```ts
// app/api/v1/bookings/route.ts
import { apiHandler, parseBody, parseQuery } from "@/server/lib/api-handler";
import { createRateLimiter } from "@/server/lib/rate-limit";
import { created, ok } from "@/server/lib/response";
import { createBookingSchema, myBookingsQuerySchema } from "@/server/modules/booking/booking.schema";
import * as bookingService from "@/server/modules/booking/booking.service";

const limitCreate = createRateLimiter({ max: 10, windowMs: 60_000 });

/** GET /api/v1/bookings: the caller's bookings. */
export const GET = apiHandler("customer", async ({ req, actor }) => {
  return ok(await bookingService.listMine(actor, parseQuery(req, myBookingsQuerySchema)));
});

/** POST /api/v1/bookings: request a booking. */
export const POST = apiHandler("customer", async ({ req, actor }) => {
  limitCreate(actor.id);
  const booking = await bookingService.create(actor, await parseBody(req, createBookingSchema));
  return created(booking, `Request sent. Ref ${booking.ref}.`);
});
```

```ts
// app/api/v1/admin/bookings/[id]/approve/route.ts
import { apiHandler, parse } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { bookingIdSchema } from "@/server/modules/booking/booking.schema";
import * as bookingService from "@/server/modules/booking/booking.service";

export const POST = apiHandler<{ id: string }, "admin">("admin", async ({ params, actor }) => {
  const result = await bookingService.approve(actor, parse(bookingIdSchema, params.id));
  return ok(result, `${result.ref} approved. Payment recorded.`);
});
```

Rules:
- One file per URL; export one function per method (`GET`, `POST`, `PATCH`, `DELETE`).
- Parse with `parseQuery(req, schema)`, `await parseBody(req, schema)`, `parse(schema, params.x)` or `await parseForm(req)`, always with a schema from the module's `<x>.schema.ts`.
- Respond with `ok(data, message)` (200), `created(data, message)` (201) or `file(body, { contentType, filename })` for downloads. Errors are thrown, never returned.
- Route handlers run on the **Node.js runtime** (the default), which `pg` and `sharp` need. Never set `runtime = "edge"`.
- Handlers that read the session are dynamic automatically. Don't add caching to authenticated endpoints.
- The business API lives under `/api/v1/`; URL shapes mirror the resource (`/api/v1/admin/hotels/[id]/images`), and the spec's API surface is the source of truth. Only Better Auth (`/api/auth`), `/api/health`, `/api/uploads` and future webhooks live outside `v1`.

---

## 8. Database

### 8.1 Client: `server/db/client.ts`

```ts
import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { serverEnv } from "@/server/config/env";
import * as schema from "./schema";

pg.types.setTypeParser(1082, (v) => v); // `date` stays "YYYY-MM-DD" (no time-zone shifts)

// One pool per process. In dev, survive hot reloads instead of leaking connections.
const globalForDb = globalThis as unknown as { pgPool?: pg.Pool };
export const pool = globalForDb.pgPool ?? new pg.Pool({ connectionString: serverEnv.DATABASE_URL, max: 10 });
if (serverEnv.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;
```

### 8.2 Schema and migrations

- Tables live in `server/db/schema/<domain>.ts` and are re-exported from `schema/index.ts`. Better Auth's tables (`user`, `session`, `account`, `verification`) live in `schema/auth.ts`.
- Use `casing: "snake_case"` so TypeScript stays camelCase and SQL stays snake_case.
- `pnpm db:generate` (drizzle-kit) writes SQL to `drizzle/`. **Commit the migrations.** Never edit an applied migration; generate a new one.
- `pnpm db:migrate` runs `scripts/migrate.ts` (drizzle's `migrate()`). In Docker, the one-shot `migrate` service runs it before `web` starts.
- Put constraints in the database, not only in code: `check` constraints for ranges, unique indexes for idempotency (e.g. one payment per booking), foreign keys everywhere.

### 8.3 Data rules

| Thing | Rule |
| --- | --- |
| Money | Integer cents (`*_cents`). Format only in the UI. |
| Calendar dates (stays) | Postgres `date`, kept as `"YYYY-MM-DD"` strings. |
| Timestamps | `timestamptz`; DTOs carry ISO strings. |
| "Today" | `today()` from `server/lib/dates.ts` in `APP_TIMEZONE`. Never `new Date()` math on calendar dates. |
| IDs | `uuid` (`defaultRandom()`); Better Auth ids are text. |
| Soft vs hard delete | Rows that money or history points to are never hard-deleted (hide or archive instead). |

### 8.4 Correlated subqueries

Drizzle drops the table name from columns in single-table selects. Inside a hand-written subquery, an unqualified `"id"` binds to the subquery's own table. Reference the outer row with an explicit `sql\`"hotel"."id"\`` (`hotelRef` in `hotel.repository.ts`).

---

## 9. Auth

### 9.1 Better Auth instance: `server/lib/better-auth.ts`

```ts
import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { googleCredentials, isProd, serverEnv } from "@/server/config/env";
import { db } from "@/server/db/client";
import * as schema from "@/server/db/schema";

export const auth = betterAuth({
  appName: "Stayly",
  secret: serverEnv.BETTER_AUTH_SECRET,
  baseURL: serverEnv.BETTER_AUTH_URL, // the app's public origin; routes live at /api/auth/*
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  // Google sign-in exists only when configured. Account linking stays at Better Auth's defaults:
  // an existing (unverified) password account is never linked to a Google sign-in.
  socialProviders: googleCredentials ? { google: { ...googleCredentials, prompt: "select_account" } } : {},
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 }, // 7 days, sliding daily
  advanced: {
    useSecureCookies: isProd && serverEnv.BETTER_AUTH_URL.startsWith("https://"),
    database: { generateId: () => crypto.randomUUID() },
  },
  rateLimit: { enabled: serverEnv.NODE_ENV !== "test", window: 60, max: 30, storage: "memory" },
  plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] })],
});

export type AuthSession = typeof auth.$Infer.Session;
```

```ts
// app/api/auth/[...all]/route.ts (outside /api/v1)
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/lib/better-auth";

export const { GET, POST } = toNextJsHandler(auth);
```

#### Google sign-in ("Continue with Google")

- **Enabled by config.** `server/config/env.ts` reads optional `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. With both set, `googleCredentials` is non-null and the provider is registered. With neither, the provider doesn't exist (`POST /api/auth/sign-in/social` → 404 `PROVIDER_NOT_FOUND`) and the button isn't rendered. With only one set, env parsing fails and the app refuses to start. The login and signup pages call `connection()` and pass `googleEnabled={googleAuthEnabled}`, so the flag is read at request time and never baked into a prerender. That matters because the Docker image is built with placeholder env.
- **Flow.** Clicking the button runs `authApi.signInSocial()`, which posts to `/api/auth/sign-in/social` and gets `{ url }` back. The browser then goes to Google. Google returns to `/api/auth/callback/google`, where Better Auth creates the user (role `user`, emailVerified from Google) or signs them in, and sets the cookie. It then redirects to `callbackURL` = `/auth/continue?redirectTo=…`.
- **Landing.** `app/(public)/auth/continue/page.tsx` reads the session and redirects with `landingPath(role, redirectTo)` from `features/auth`. That is the same rule `LoginForm` uses after a password sign-in: a safe `redirectTo`, else `/admin/bookings` for admins, else `/`.
- **Errors.** `errorCallbackURL` is `/login`, so failures come back as `/login?error=<code>`. `googleErrorMessage(code)` maps them:

  | Code | Message |
  |---|---|
  | `account_not_linked` | "This email already has a Stayly account. Sign in with your password." |
  | `BANNED_USER` | "This account is suspended." |
  | anything else (e.g. cancelled at Google) | "Google sign-in was cancelled or failed. Please try again." |

- **No account linking.** Local emails are never verified, so Better Auth's default `requireLocalEmailVerified` refuses to link a Google sign-in to an existing password account. That prevents account pre-hijacking. Don't turn the option off: it is deprecated, and the check becomes unconditional in the next Better Auth minor.
- **Setup.** Create a Google OAuth client and register `<BETTER_AUTH_URL>/api/auth/callback/google` as the redirect URI (`:3000` for `pnpm dev`, `:3100` for Docker). See `.env.example`.

### 9.2 Session helpers: `server/lib/auth.ts`

```ts
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
```

The API-side check (`authorize()`: 401 without a session, 403 for a banned user or the wrong role) lives in `server/lib/api-handler.ts` (§7.2).

### 9.3 The layers

| Layer | Checks | Purpose |
| --- | --- | --- |
| `proxy.ts` | Session **cookie exists** (`getSessionCookie()` from `better-auth/cookies`) | Fast redirect to `/login?redirectTo=…`. UX only. |
| `(customer)` / `(admin)` layouts and pages | Real session + role via `requireUser()` / `requireCustomer()` / `requireAdmin()` | Correct page for the right people. |
| `apiHandler()` | Real session + role (+ not banned) | The API refuses wrong roles. |
| Services | Ownership and state ("your booking", "still pending") | The actual security boundary for data. |

```ts
// src/proxy.ts
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/bookings", "/admin"];
const AUTH_PAGES = ["/login", "/signup"];
const under = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(`${p}/`));

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = !!getSessionCookie(request);

  if (!hasSession && under(pathname, PROTECTED)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", pathname + search);
    return NextResponse.redirect(url);
  }
  if (hasSession && under(pathname, AUTH_PAGES)) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"] };
```

### 9.4 Client side

- `features/auth/api/auth.api.ts` wraps the Better Auth endpoints (`/api/auth/sign-in/email`, `/sign-up/email`, `/sign-in/social`, `/sign-out`, `/get-session`) with the shared axios instance. Better Auth is outside `/api/v1`, so it overrides the base URL per request:

  ```ts
  // Better Auth is mounted outside the versioned API, at /api/auth.
  const auth = { baseURL: "/api" };

  export const authApi = {
    getSession: () => http.get<Session>("/auth/get-session", auth).then((r) => r.data ?? null),
    signIn: (input: SignInInput) => http.post("/auth/sign-in/email", input, auth).then((r) => r.data),
    // …signUp, signOut
  };
  ```

  Hooks (`useSignIn`, `useSignUp`, `useGoogleSignIn`, `useSignOut`) are TanStack mutations over it. `useGoogleSignIn` navigates with `window.location.assign(url)` and stays pending while the page unloads.
- **Current user:** `authQueries.me()` + `useMe()`. Layouts call `hydrateSession(queryClient)` from `features/auth/server.ts` (the only feature-level server file), which reads `getSession()` and puts it in the server QueryClient under `authKeys.me()` so the header has it on first paint. There is no separate auth context.
- **After sign-in/out:** refresh `me`, then `router.replace(target)` + `router.refresh()` so Server Components re-render with the new cookie. On sign-out, `queryClient.clear()` even if the call fails.
- Validate `redirectTo` as a same-site relative path.

---

## 10. TanStack Query Setup

Unchanged from the previous baseline, apart from where the data comes from.

### 10.1 Shared defaults: `lib/query/defaults.ts`

```ts
import type { DefaultOptions } from "@tanstack/react-query";
import { isClientError } from "@/lib/http/errors";

export const queryDefaults: DefaultOptions = {
  queries: {
    staleTime: 60_000, // > 0 so server-prefetched data isn't refetched on mount
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => !isClientError(error) && failureCount < 1, // never retry 4xx
  },
};
```

### 10.2 Typed meta: `types/react-query.d.ts`

```ts
import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: { silent?: boolean }; // true = skip the global error toast
    mutationMeta: { silent?: boolean };
  }
}
```

### 10.3 Clients

```ts
// lib/query/client.ts
import { isServer, MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/http/errors";
import { toast } from "@/lib/toast";
import { queryDefaults } from "./defaults";

function makeBrowserQueryClient() {
  return new QueryClient({
    defaultOptions: queryDefaults,
    queryCache: new QueryCache({ onError: (e, q) => !q.meta?.silent && toast.error(getErrorMessage(e)) }),
    mutationCache: new MutationCache({ onError: (e, _v, _c, m) => !m.meta?.silent && toast.error(getErrorMessage(e)) }),
  });
}

let browserQueryClient: QueryClient | undefined;
export function getQueryClient() {
  if (isServer) return new QueryClient({ defaultOptions: queryDefaults }); // never share a cache between users
  return (browserQueryClient ??= makeBrowserQueryClient());
}
```

```ts
// lib/query/server.ts
import "server-only";
import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { queryDefaults } from "./defaults";

/** One QueryClient per request, shared by every Server Component in that request. */
export const getServerQueryClient = cache(() => new QueryClient({ defaultOptions: queryDefaults }));
```

### 10.4 Browser HTTP client: `lib/http/client.ts`

```ts
import axios, { type AxiosError } from "axios";

export const http = axios.create({ baseURL: "/api/v1" }); // same origin → cookies sent automatically

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const isAuthCall = error.config?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && !isAuthCall && typeof window !== "undefined") {
      const redirectTo = encodeURIComponent(location.pathname + location.search);
      window.location.assign(`/login?redirectTo=${redirectTo}`);
    }
    return Promise.reject(error);
  },
);
```

Fetchers use paths relative to `/api/v1` (`http.get("/hotels")`). Calls outside `v1` pass `{ baseURL: "/api" }` per request (§9.4).

`lib/http/errors.ts` (`getErrorMessage`, `isClientError`) and `app/providers.tsx` (QueryClientProvider + NuqsAdapter + Toaster + devtools) are as in the previous baseline.

---

## 11. Feature Anatomy (hotels)

The server half lives in `server/modules/hotel/`, the UI half in `features/hotels/`.

### 11.1 Request schemas and DTOs: `hotel.schema.ts` + `hotel.types.ts`

Request schemas are server-only. Field rules the client also needs (the admin form) come from `lib/domain/hotel.ts`; date rules from `lib/dates.ts`.

```ts
// server/modules/hotel/hotel.schema.ts (excerpt)
import "server-only";
import { z } from "zod";
import { daySchema as day, refineStay, stayRangeSchema } from "@/lib/dates";
import { HOTEL_STATUS_TABS, hotelFields } from "@/lib/domain/hotel";

/** Browse / search (spec F-03). The service re-checks rules that need "today". */
export const hotelListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(48).default(12),
    q: z.string().trim().max(80).default(""),
    location: z.string().trim().max(80).default(""),
    checkIn: z.union([day, z.literal("")]).default(""),
    checkOut: z.union([day, z.literal("")]).default(""),
  })
  .superRefine((v, ctx) => {
    if (!!v.checkIn !== !!v.checkOut)
      ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Pick both check-in and check-out." });
    else if (v.checkIn) refineStay(v, ctx);
  });

export const hotelInputSchema = z.object(hotelFields);
export const hotelPatchSchema = hotelInputSchema.partial();
```

Types are derived from the schemas (`z.output`) for requests and written out for responses. The file holds only types, so client code can `import type` from it:

```ts
// server/modules/hotel/hotel.types.ts (excerpt)
import "server-only";
import type { z } from "zod";
import type { Page } from "@/types/api";
import type { hotelListQuerySchema /* , … */ } from "./hotel.schema";

// Request and response DTOs. Client code may `import type` from here.

export type HotelQuery = z.output<typeof hotelListQuerySchema>;

export type HotelStatus = "published" | "hidden";

export type HotelCard = {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  nightlyRateCents: number;
  ratingAvg: number | null;
  reviewCount: number;
  status: HotelStatus;
  cover: { url: string; alt: string } | null;
};

export type HotelPage = Page<HotelCard>;
```

### 11.2 Repository and service: `hotel.repository.ts` + `hotel.service.ts`

The repository holds the Drizzle query and maps rows to DTOs. It returns `{ items, total }` and knows nothing about rules like "check-in can't be in the past":

```ts
// server/modules/hotel/hotel.repository.ts (excerpt)
export async function search(p: {
  q: string;
  location: string;
  stay: { checkIn: string; checkOut: string } | null;
  page: number;
  limit: number;
}): Promise<{ items: HotelCard[]; total: number }> {
  const where: SQL[] = [published];
  if (p.q) where.push(ilike(hotel.name, likeTerm(p.q)));
  if (p.location) where.push(eq(hotel.city, p.location));
  if (p.stay) where.push(sql`${roomsLeftSql(hotelRef.id, hotelRef.rooms, p.stay.checkIn, p.stay.checkOut)} > 0`);

  const filter = and(...where);
  const [rows, [total]] = await Promise.all([
    db
      .select(cardColumns)
      .from(hotel)
      .where(filter)
      .orderBy(sql`${hotel.ratingAvg} desc nulls last`, asc(hotel.name))
      .limit(p.limit)
      .offset((p.page - 1) * p.limit),
    db.select({ n: sql<number>`count(*)::int` }).from(hotel).where(filter),
  ]);
  return { items: rows.map(toCard), total: total?.n ?? 0 };
}
```

The service applies the rules and shapes the `Page<T>`:

```ts
// server/modules/hotel/hotel.service.ts (excerpt)
import "server-only";
import { serverEnv } from "@/server/config/env";
import { today } from "@/server/lib/dates";
import { BadRequestError, NotFoundError } from "@/server/lib/errors";
import { toPage } from "@/types/api";
import * as hotelRepo from "./hotel.repository";
import type { HotelDetail, HotelPage, HotelQuery } from "./hotel.types";

// Public catalog (spec F-03 / F-04). Admin management lives in hotel-admin.service.ts.

function assertNotPast(checkIn: string) {
  if (checkIn < today()) throw new BadRequestError("checkIn: Check-in can't be in the past.");
}

/** Browse / search. Dates filter to hotels with at least one room left. */
export async function search(p: HotelQuery): Promise<HotelPage> {
  const stay = p.checkIn && p.checkOut ? { checkIn: p.checkIn, checkOut: p.checkOut } : null;
  if (stay) assertNotPast(stay.checkIn);
  const { items, total } = await hotelRepo.search({ q: p.q, location: p.location, stay, page: p.page, limit: p.limit });
  return toPage(items, { page: p.page, limit: p.limit, totalDocs: total });
}

/** For pages: null instead of a 404, so they can call notFound(). */
export async function findBySlug(slug: string): Promise<HotelDetail | null> {
  const detail = await hotelRepo.findDetail({ slug });
  return detail && { ...detail, taxRate: serverEnv.TAX_RATE };
}

export async function getBySlug(slug: string): Promise<HotelDetail> {
  const detail = await findBySlug(slug);
  if (!detail) throw new NotFoundError("Hotel not found.");
  return detail;
}
```

### 11.3 Route handler + client fetcher

```ts
// app/api/v1/hotels/route.ts
import { apiHandler, parseQuery } from "@/server/lib/api-handler";
import { ok } from "@/server/lib/response";
import { hotelListQuerySchema } from "@/server/modules/hotel/hotel.schema";
import * as hotelService from "@/server/modules/hotel/hotel.service";

/** GET /api/v1/hotels: browse and search published hotels. */
export const GET = apiHandler("public", async ({ req }) => ok(await hotelService.search(parseQuery(req, hotelListQuerySchema))));
```

```ts
// features/hotels/api/hotel.api.ts (excerpt)
import { http } from "@/lib/http/client";
import { buildQueryString } from "@/lib/query-string";
import type { ApiResponse } from "@/types/api";
import type { HotelDetail, HotelPage, HotelQuery } from "@/server/modules/hotel/hotel.types";

const unwrap = <T>(r: { data: ApiResponse<T> }) => r.data.data;

/** Browser fetchers for /api/v1/hotels/*. Each returns the same DTO as the matching service function. */
export const hotelApi = {
  search: (params: HotelQuery) => http.get<ApiResponse<HotelPage>>(`/hotels${buildQueryString(params)}`).then(unwrap),
  getBySlug: (slug: string) => http.get<ApiResponse<HotelDetail>>(`/hotels/${encodeURIComponent(slug)}`).then(unwrap),
  // …topRated, trending, destinations, locations, availability
};
```

Fetchers **unwrap the envelope** and return `T`, the same type the service returns. They name the function after the service function they mirror (`hotelApi.search` ↔ `hotelService.search`). The DTO types are `import type` from the module, which is allowed on the client (§3 rule 4).

### 11.4 Queries: `features/hotels/queries.ts`

```ts
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { hotelApi } from "./api/hotel.api";
import type { HotelPage, HotelQuery } from "@/server/modules/hotel/hotel.types";

export const hotelKeys = {
  all: ["hotels"] as const,
  lists: () => [...hotelKeys.all, "list"] as const,
  list: (params: HotelQuery) => [...hotelKeys.lists(), params] as const,
};

type Fetch<P, T> = (params: P) => Promise<T>;

// `fetcher` defaults to the browser fetcher. Server Components pass the service: same key, same type.
export const hotelQueries = {
  list: (params: HotelQuery, fetcher: Fetch<HotelQuery, HotelPage> = hotelApi.search) =>
    queryOptions({
      queryKey: hotelKeys.list(params),
      queryFn: () => fetcher(params),
      placeholderData: keepPreviousData,
    }),
};
```

Rules:
- Every value the `queryFn` reads is in the key.
- Invalidating a prefix refreshes everything under it (`hotelKeys.all`, `hotelKeys.lists()`).

### 11.5 URL params, hook, component

```ts
// features/hotels/search-params.ts
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";

export const hotelListParsers = {
  q: parseAsString.withDefault(""),
  location: parseAsString.withDefault(""),
  checkIn: parseAsString.withDefault(""),
  checkOut: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};
export const loadHotelListParams = createLoader(hotelListParsers);
```

```ts
// features/hotels/hooks/useHotels.ts
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { hotelQueries } from "../queries";
import { hotelListParsers, toHotelQuery } from "../search-params";

export function useHotels() {
  const [params, setParams] = useQueryStates(hotelListParsers);
  const { data, isPending, isFetching } = useQuery(hotelQueries.list(toHotelQuery(params)));
  return {
    hotels: data?.items ?? [],
    pagination: data?.pagination,
    isLoading: isPending,
    isFetching,
    params,
    setPage: (page: number) => setParams({ page }),
    setFilter: (f: Partial<typeof params>) => setParams({ ...f, page: 1 }),
  };
}
```

`toHotelQuery()` normalizes URL params into the exact `HotelQuery` (dropping an invalid date pair, fixing the limit). The page and the hook both call it, so both build **the same key**.

### 11.6 Public API: `index.ts`

```ts
// features/hotels/index.ts (excerpt): client-safe
export { AllHotels } from "./components/AllHotels";
export { HotelHeader, HotelGallery, HotelAbout } from "./components/HotelOverview";
export { useAvailability } from "./hooks/useAvailability";
export { hotelKeys, hotelQueries } from "./queries";
export { loadHotelListParams, toHotelQuery, dateQuery, stayError, MAX_NIGHTS } from "./search-params";
export type {
  HotelCard,
  HotelDetail,
  HotelPage,
  HotelQuery,
  // …
} from "@/server/modules/hotel/hotel.types";
```

A feature has no server barrel. Server code (pages, route handlers, tests) imports the module directly: `import * as hotelService from "@/server/modules/hotel/hotel.service"`. `index.ts` may re-export **types** from a module, never runtime values. The admin features (`admin-hotels`, `admin-bookings`) are frontend-only and use the same `hotel` and `booking` modules (`hotel-admin.service.ts`, `bookingService.listForAdmin`, …).

---

## 12. Example: Mutation + Form (request a booking)

### 12.1 Schema

```ts
// server/modules/booking/booking.schema.ts
import "server-only";
import { z } from "zod";
import { daySchema, refineStay } from "@/lib/dates";
import { MAX_GUESTS } from "@/lib/domain/booking";

export const createBookingSchema = z
  .object({
    hotelId: z.uuid(),
    checkIn: daySchema,
    checkOut: daySchema,
    guests: z
      .number({ error: "Choose the number of guests." })
      .int()
      .min(1, "At least 1 guest.")
      .max(MAX_GUESTS, `At most ${MAX_GUESTS} guests per room.`),
  })
  .superRefine(refineStay);
```

```ts
// server/modules/booking/booking.types.ts
export type CreateBookingInput = z.output<typeof createBookingSchema>;
```

The request schema is server-only. The pieces both sides need live in `lib/dates.ts` (`daySchema`, `refineStay`, `MAX_NIGHTS`, `isDay`) and `lib/domain/booking.ts` (`MAX_GUESTS`), so the booking panel checks the same rules (`stayError()`, the guests select) without importing server code. When a client form needs a whole schema, it builds its own in `features/<x>/schemas.ts` from those pieces (`rejectBookingSchema` from `rejectionReasonSchema`, `hotelFormSchema` from `hotelFields`). The service still enforces the rules that need the database or the app time zone (availability, overlaps, today's date).

### 12.2 Mutation hook

```ts
// features/bookings/hooks/useCreateBooking.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hotelKeys } from "@/features/hotels";
import { toast } from "@/lib/toast";
import { bookingApi } from "../api/booking.api";
import { bookingKeys } from "../queries";

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { mutate: createBooking, isPending: isCreating } = useMutation({
    mutationFn: bookingApi.create,
    onSuccess: (res) => {
      toast.success(res.message);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.all }),
        queryClient.invalidateQueries({ queryKey: hotelKeys.all }),
      ]);
    },
    // Errors (409 fully booked, 429 too many pending) are toasted by the MutationCache.
  });
  return { createBooking, isCreating };
}
```

### 12.3 Hook conventions

- Return **domain-named** fields (`hotels`, `createBooking`, `isCreating`), not the raw `useQuery` / `useMutation` result.
- Toasts and invalidation that apply everywhere go **in the hook**.
- Effects for one call site (close a dialog, reset a form, navigate) go in `mutate(vars, { onSuccess })`.
- Instant feedback (approve/reject rows, toggles) uses optimistic updates in `onMutate`, rolled back in `onError`.
- A hook exposes `errorMessage` (via `getErrorMessage`) when a component shows an error inline, because components can't import `lib/http`.

---

## 13. Loading, Errors and Not Found

| File | Purpose |
| --- | --- |
| `loading.tsx` | Instant skeleton while the route's Server Component awaits services or prefetches |
| `error.tsx` | `"use client"` boundary for render errors in that segment, with a retry |
| `global-error.tsx` | Last resort when the root layout fails (renders its own `<html>`) |
| `not-found.tsx` | Rendered by `notFound()` from `next/navigation` |

Error layers, from outermost to innermost:
1. **Route `error.tsx`:** render crashes, including a service throwing during a Server Component render.
2. **Global QueryCache / MutationCache `onError`:** toasts for every failed client request.
3. **Inline handling:** a component that shows its own error sets `meta: { silent: true }` and reads the hook's `errorMessage`.

On a detail page, call the service's `find*` variant (it returns `null` instead of throwing a 404) and call `notFound()`. Route handlers use the throwing `get*` variant. In a Server Component, prefer `.catch(() => fallback)` for **optional** sections (e.g. "Trending this week") so one failing query doesn't take down the page.

---

## 14. Client State

Server data lives **only** in the TanStack cache (client) or in Server Component props (read-only). Never copy it into `useState`, context or Zustand.

| State | Where |
| --- | --- |
| Filters, pagination, tabs, selected item, form dates worth sharing | URL via `nuqs` |
| Local UI state (open/closed, hover, an input draft) | `useState` in the component |
| State shared within one feature | `features/x/context.tsx` with a guard hook |
| App-wide UI preferences | Small context, or Zustand if it grows |
| Form state | react-hook-form |

---

## 15. Environment Variables

```ts
// lib/env.ts
import { z } from "zod";

// Browser-safe. Only NEXT_PUBLIC_* vars, each referenced explicitly so Next can inline it.
export const env = z
  .object({
    NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  })
  .parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
```

```ts
// server/config/env.ts
import "server-only";
import { z } from "zod";

export const serverEnv = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    /** The app's public origin. Better Auth lives at `${BETTER_AUTH_URL}/api/auth`. */
    BETTER_AUTH_URL: z.url(),
    APP_TIMEZONE: z.string().default("UTC"),
    UPLOAD_DIR: z.string().default("./data/uploads"),
    TAX_RATE: z.coerce.number().min(0).max(1).default(0.12),
    MAX_PENDING_PER_USER: z.coerce.number().int().positive().default(5),
  })
  .parse(process.env);

export const isProd = serverEnv.NODE_ENV === "production";
```

- The app fails at startup when a variable is missing or malformed.
- Anything prefixed `NEXT_PUBLIC_` is inlined into the browser bundle at **build** time. Never put secrets there.
- Scripts outside Next (`scripts/migrate.ts`, `seed.ts`) load `.env` with `tsx --env-file-if-exists` and run with `--conditions=react-server`, so the `server-only` guard in the modules they import resolves to a no-op. Vitest aliases `server-only` to an empty module for the same reason.
- Commit `.env.example` and keep it in sync.

---

## 16. Files and Uploads

- Upload endpoints (`POST /api/v1/admin/hotels/[id]/images`) accept `multipart/form-data` (`await parseForm(req)`, which turns a non-multipart body into a 400). `storage.putImage` checks the **real** format from the file's bytes with `sharp`, enforces `MAX_UPLOAD_MB` (from `lib/domain/hotel.ts`), re-encodes (webp, max edge 2000 px), and stores the file under a random name.
- `server/lib/storage.ts` exposes `putImage`, `read` and `remove`, plus `publicUrl(path)` (→ `/api/uploads/<path>`). The default stores files on a volume (`UPLOAD_DIR`); an S3/MinIO implementation can replace it without touching modules.
- Files are served by `app/api/uploads/[...path]/route.ts` (outside `v1`, like other static assets) with long-lived cache headers, and the path is resolved safely inside `UPLOAD_DIR`.
- Images are rendered with `<img>` (already resized). Use `next/image` only for static assets in `public/`.
- Downloads (CSV) are route handlers that return `file(body, { contentType, filename })` from `server/lib/response.ts` (a `Response` with `Content-Disposition`, no envelope). The client links to them with a plain `<a href>` (`/api/v1/admin/finance/transactions.csv?from=…&to=…`), so cookies come along.

---

## 17. Tooling and Guardrails

### 17.1 `tsconfig.json` (additions)

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### 17.2 `eslint.config.mjs`: boundaries as lint errors

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Import boundaries from architecture.md §3 / §17.2.
const featureBoundary = {
  group: ["@/features/*/*", "!@/features/*/server"],
  message: "Import features via @/features/<name> or @/features/<name>/server. Inside a feature, use relative imports.",
};
const noAppImports = { group: ["@/app/*"], message: "Nothing imports from app/." };
const noFeatureImports = { group: ["@/features/*"], message: "Shared layers must not depend on features." };
const noHttpInUi = { group: ["axios", "@/lib/http/*"], message: "Components call hooks, never the HTTP layer." };
const noServerInClient = {
  group: ["@/server/*", "@/features/*/server", "drizzle-orm", "drizzle-orm/*", "pg"],
  // DTO types from @/server/modules/<x>/<x>.types are erased at build time, so `import type` is fine.
  allowTypeImports: true,
  message: "Client code can't import server-only modules (only `import type`). Use the feature's api/ + hooks.",
};
const noNextInModules = {
  group: ["next", "next/*", "@/server/lib/api-handler", "@/server/lib/response"],
  message: "Modules don't know about HTTP or Next.js. Take an actor and validated input; let route handlers translate.",
};

// The TS variant understands `allowTypeImports`.
const restrict = (...patterns) => ({ "@typescript-eslint/no-restricted-imports": ["error", { patterns }] });

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      ...restrict(featureBoundary, noAppImports),
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    // client side of a feature
    files: ["src/features/*/{hooks,api}/**", "src/features/*/{queries,index,search-params,schemas}.ts"],
    rules: restrict(featureBoundary, noAppImports, noServerInClient),
  },
  {
    files: ["src/features/*/components/**"],
    rules: restrict(featureBoundary, noAppImports, noServerInClient, noHttpInUi),
  },
  {
    files: ["src/server/**"],
    rules: restrict(noAppImports, noFeatureImports),
  },
  {
    // Services, repositories, schemas and types: no HTTP, no Next.js.
    files: ["src/server/modules/**"],
    rules: restrict(noAppImports, noFeatureImports, noNextInModules),
  },
  {
    // Shared by client and server, so no server-only imports.
    files: ["src/{lib,types,hooks,components}/**"],
    rules: restrict(noAppImports, noFeatureImports, noServerInClient),
  },
  {
    // Tests call route handlers directly.
    files: ["test/**"],
    rules: restrict(featureBoundary),
  },
  globalIgnores([".next/**", "out/**", "build/**", "drizzle/**", "data/**", "next-env.d.ts"]),
]);
```

`server/lib/` is where Next.js is allowed on the server side: `auth.ts` uses `next/headers` and `next/navigation` (it adapts the request to an `Actor`), and `api-handler.ts` / `response.ts` use `next/server`. Nothing in `server/modules/` may. `featureBoundary` still whitelists `@/features/*/server`, which today is only `features/auth/server.ts` (`hydrateSession`, used by layouts).

### 17.3 Scripts

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "next typegen && tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx --conditions=react-server --env-file-if-exists=.env scripts/migrate.ts",
    "db:seed": "tsx --conditions=react-server --env-file-if-exists=.env scripts/seed.ts",
    "check": "pnpm lint && pnpm typecheck && pnpm test"
  }
}
```

- Prettier with `prettier-plugin-tailwindcss`; husky + lint-staged on commit; CI runs `pnpm check` and `pnpm build`.
- **React Compiler** (`reactCompiler: true`) handles memoization. Don't hand-write `useMemo`/`useCallback` unless profiling shows a need.

---

## 18. Testing

| Layer | Tool | What to test |
| --- | --- | --- |
| Schemas, utils, pricing | Vitest | Validation edge cases, formatters, `buildQueryString` |
| **Services** | Vitest + real Postgres (a `*_test` database) | Business rules, state transitions, races (concurrent approvals), totals |
| **Route handlers** | Vitest, calling the exported `GET`/`POST` with a `NextRequest` | Status codes, envelope, role checks |
| Hooks + components | Vitest + Testing Library + MSW | Render with a test `QueryClient` (retry off); mock `/api/v1/*` with MSW |
| Critical flows | Playwright | Sign up → search → request → admin approves → customer sees Approved |

- Services are tested with an explicit `actor`, without HTTP. That is the payoff of rule 6. Tests import them as namespaces, like pages do (`import * as bookingService from "@/server/modules/booking/booking.service"`), and may use a repository directly for setup or assertions.
- A Vitest `globalSetup` creates the test database and runs migrations. Each test file truncates tables in `beforeEach`. Vitest aliases `server-only` to an empty module.
- Route-handler tests import the handler module (`await import("@/app/api/v1/bookings/route")`) and stub only `getSession` to act as a given user. `authorize()` lives in `api-handler.ts`, so it still runs for real:

```ts
// test/routes.test.ts
const session = vi.hoisted(() => ({ current: null as Actor | null }));
vi.mock("@/server/lib/auth", () => ({
  getSession: async () => (session.current ? { user: session.current, session: {} } : null),
}));
const as = (actor: Actor | null) => (session.current = actor);

const bookings = await import("@/app/api/v1/bookings/route");
```

---

## 19. Docker

```yaml
services:
  db:        # postgres:17-alpine, healthcheck pg_isready, volume pgdata
  migrate:   # one-shot: build target `tools`, runs `scripts/migrate.ts`, then `scripts/seed.ts` when `SEED=true`; depends_on db (healthy)
  web:       # build target `runner` (Next standalone); depends_on migrate (completed); volume uploads
```

- One multi-stage `Dockerfile`: `deps` → `build` (`next build`, `output: "standalone"`) → `runner` (only `.next/standalone`, `.next/static`, `public`), plus a `tools` stage with full dependencies, `drizzle/`, `scripts/` and `seed/` for migrations and seeding.
- `NEXT_PUBLIC_*` values are build args, because they are inlined at build time. Server env vars are runtime env.
- `docker compose up` gives a working app with migrated, seeded data.

---

## 20. Conventions

| Thing | Convention | Example |
| --- | --- | --- |
| Component files | PascalCase, one component per file | `HotelCard.tsx` |
| Hook files | camelCase, `use` prefix | `useCreateBooking.ts` |
| Module files | `server/modules/<x>/<x>.{schema,types,repository,service}.ts` (singular domain name) | `booking.service.ts` |
| Service / repository imports | Namespace import named `<x>Service` / `<x>Repo` | `import * as bookingService from "…/booking.service"` → `bookingService.approve()` |
| Request schemas | `<thing>Schema` in `<x>.schema.ts` | `createBookingSchema`, `bookingIdSchema` |
| Other files | kebab-case with a role suffix | `hotel.api.ts`, `search-params.ts`, `api-handler.ts` |
| Errors | `throw new <Kind>Error(message)` | `throw new ConflictError("…")` |
| Exports | Named only (except Next route files, which use default exports or method names) | `export function HotelCard()` |
| Types | `z.output<…>` of the request schema for inputs; explicit `type` for DTOs; both in `<x>.types.ts` | `type CreateBookingInput = z.output<typeof createBookingSchema>` |
| API paths | `/api/v1/<resource>`; client fetchers use paths relative to `/api/v1` | `http.get("/bookings")` |
| Booleans | `is` / `has` / `can` prefix | `isCreating`, `canCancel` |
| Event props | `on` + verb | `onChange`, `onDone` |
| Query keys | Hierarchical, from the feature's key factory | `bookingKeys.detail(ref)` |
| Money / dates | `*Cents` integers; `YYYY-MM-DD` dates; ISO timestamps | `totalCents`, `checkIn` |

---

## 21. Checklists

### New endpoint

1. Add the request schema to `server/modules/<x>/<x>.schema.ts` (reuse field rules from `lib/domain/` if the client needs them too).
2. Add the request type (`z.output<…>`) and the response DTO to `server/modules/<x>/<x>.types.ts`.
3. Add the query to `server/modules/<x>/<x>.repository.ts` (Drizzle only; returns rows/DTOs or `null`; takes `DbOrTx` if it runs in a transaction).
4. Add a service function in `server/modules/<x>/<x>.service.ts` (takes `actor` + input, applies the rules, opens the transaction, returns a DTO, throws `AppError` subclasses).
5. Add `app/api/v1/…/route.ts` with `apiHandler(access, …)`: `parseQuery` / `parseBody` / `parse` → service → `ok()` / `created()`.
6. Add a client fetcher to `features/<x>/api/<x>.api.ts` (path relative to `/api/v1`, unwrap the envelope, `import type` the DTO).
7. Add a key to `xKeys`, plus a `queryOptions` entry with an injectable `fetcher` if it's a read.
8. Add a hook: a query, or a mutation that invalidates the related keys.
9. If a page needs it on first paint: read-only → call the service in the Server Component; interactive → prefetch with `xQueries.y(params, xService.y)`.
10. Test the service (real DB) and the role check on the route.

### New feature

1. Create `server/modules/<x>/` with `<x>.schema.ts`, `<x>.types.ts`, `<x>.repository.ts`, `<x>.service.ts` (each starting with `import "server-only"`).
2. Create `features/<x>/` with `api/`, `components/`, `hooks/`, `queries.ts`, `index.ts` (plus `search-params.ts` for URL state and `schemas.ts` for client form schemas, when needed).
3. Add tables to `server/db/schema/<x>.ts`, then `pnpm db:generate` and commit the migration.
4. Add pages under the right route group with `loading.tsx` and `error.tsx`, plus route handlers under `app/api/v1/`.
5. Export only what other code needs from `index.ts` (types from the module via `export type`).
6. Run `pnpm check`.

---

## 22. AGENTS.md for AI Coding Tools

Put this at the repo root as `AGENTS.md` (symlink it to `CLAUDE.md` for Claude Code).

```md
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
```

When you correct the AI for the same mistake twice, add a line to this file.

---

## 23. Architecture Decisions

**Why Next.js as the backend instead of a separate API service?**
One codebase, one deploy, one set of types. Server Components can call business logic directly instead of over HTTP, which removes a network hop and the cookie-forwarding plumbing. The trade-off is that the web tier and the API scale together. That's fine for this app, and the service layer (rule 6) keeps the logic portable if it ever needs to move.

**Why keep route handlers and TanStack Query when Server Components can read the DB?**
The UI is interactive: filters, tabs, pagination, approvals with optimistic updates, background refresh. TanStack Query gives a client cache with invalidation, and route handlers give it something to call. Server Components still handle the first paint (direct service calls for read-only content, prefetch + hydrate for interactive lists).

**Why not Server Actions for mutations?**
They'd work, but they return values instead of status codes (so errors need a second convention), run one at a time, don't fit multipart uploads or file downloads as cleanly, and aren't an API anything else can call. Route handlers + `useMutation` give one error path (status code → global toast), optimistic updates, and a REST surface. Server Actions remain an option later for progressively enhanced forms.

**Why services that take an `actor` instead of reading the session themselves?**
Services can then be tested without a request, reused by pages, route handlers and scripts (seed), and audited for authorization in one place. Only `server/lib/auth.ts` knows how to get the actor from a request.

**Why split modules into service, repository, schema and types?**
Each file has one reason to change. Repositories hold the SQL and can be shared (the booking service locks and counts rooms through `hotel.repository.ts`); services hold the rules and the transaction boundaries; schemas are what route handlers validate against; types are the contract the client imports with `import type`. Keeping the server code in `server/modules/` instead of inside feature folders makes the server/client wall a folder boundary, and lets one module serve several frontend features (`hotels` and `admin-hotels` both use `modules/hotel`).

**Why `/api/v1`?**
The route handlers are a real API (§5.3), so they get a version prefix. A breaking change can ship as `/api/v2` next to `v1`. Better Auth, health checks, uploaded files and webhooks have their own contracts and stay outside the version.

**Why inject the fetcher into `queryOptions`?**
The same options object drives `prefetchQuery` on the server (with the service) and `useQuery` on the client (with the HTTP fetcher). The key comes from one place, and TypeScript checks that both fetchers return the same DTO.

**Why Drizzle?**
SQL-shaped queries with full types, no code generation step at runtime, first-class Postgres features (row locks, `generate_series`, check constraints), and migrations as plain SQL files we commit. Better Auth has a Drizzle adapter.

**Why a one-shot `migrate` container?**
Migrations run once, before the app starts, from a stage that has the dev tooling. The production `runner` image stays small and never runs schema changes on its own.

**Cache Components (`cacheComponents: true`)?**
Optional, off by default. Almost everything here is per-user or changes often. If enabled later, the public catalog (destinations, top rated) is the candidate for `"use cache"` with `cacheTag`, invalidated from the admin hotel mutations.
