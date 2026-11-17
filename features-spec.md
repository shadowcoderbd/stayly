# Stayly: Features Spec

The hotel booking app shown in the "Hotel Booking App" design canvas. This document says **what** we build. `architecture.md` says **how** the app is structured.

- **Design source:** the Claude Design canvas "Hotel Booking App" (6 screens: Browse, Hotel details, My bookings, Admin Hotels, Admin Bookings, Admin Finance).
- **Status:** draft v1, 2026-11-16.
- **Conventions:** each feature has an ID (`F-xx`) and acceptance criteria (`AC`). Open questions are marked **[Q]**. Assumptions are marked **[A]**. Change either by editing this file.

---

## 1. Product summary

Stayly is a request-to-book hotel app with two roles:

- **Customers** browse published hotels, search by name, location and dates, and **request** a booking. They are not charged until an admin approves the request.
- **Admins** manage the hotel catalog, approve or reject booking requests, and see finance reports.

The core rule is that **a booking request is not a booking until an admin approves it.** Approval checks that rooms are free, confirms the stay, and records a payment in the same step.

### Out of scope for v1

- Real payment processing (Stripe and similar). Payments and refunds are **recorded**, not charged. **[A]**
- Multiple room types per hotel. A hotel has one room type, a room count and one nightly rate. **[A]**
- Hotel-owner or partner accounts. Admins are platform staff and manage every hotel.
- Multi-currency. Everything is in USD.
- Email notifications. Planned for v2 (§9).
- Writing reviews in the UI. Ratings come from seeded reviews in v1 (§9).

---

## 2. Tech stack and system layout

One **full-stack Next.js app**. Next.js serves the pages **and** is the API (route handlers under `/api/v1`; Better Auth, health and uploads sit beside it under `/api`). `architecture.md` describes the structure; this section only records the project-specific choices.

| Concern | Choice |
| --- | --- |
| App | Next.js 16 App Router (pages + route handlers), following `architecture.md` |
| Data access | Drizzle ORM over PostgreSQL 17, called from repositories in server modules (`src/server/modules/<x>/<x>.repository.ts`), with business rules in `<x>.service.ts` |
| Auth | **Better Auth** (email + password, `admin` plugin for roles), mounted at `/api/auth/*` |
| Image storage | Files on a Docker volume, served by `/api/uploads/*` behind a small storage interface, so S3 or MinIO can replace it later **[A]** |
| Local runtime | Docker Compose: `db`, `migrate` (one-shot), `web` |
| Package manager | pnpm (single package, no workspace) |

### 2.1 How the pieces talk

- **Read-only pages** (hotel details, receipt, the "top rated" and "trending" strips) are Server Components that call services directly.
- **Interactive views** (browse list, My bookings, every admin table) are prefetched on the server **with the service**, then read and refetched on the client through TanStack Query → `/api/v1/*` route handlers.
- **Writes** go `useMutation` → `/api/v1/*` route handler → service. No Server Actions for data writes.
- **Auth** cookies are first-party (same origin). `proxy.ts` does the optimistic cookie check, layouts check roles, route handlers check roles, services check ownership and state.

### 2.2 Repo layout

```
hotel/
├── src/
│   ├── app/                 # (public), (customer), (admin) pages + api/v1/** route handlers (api/auth, api/health, api/uploads outside v1)
│   ├── server/              # config (env), db (client + schema), lib (api-handler, errors, response, auth, better-auth, storage, …),
│   │                        #   modules/{hotel,booking,finance} (schema, types, repository, service)
│   ├── features/            # frontend: auth, hotels, bookings, admin-hotels, admin-bookings, finance
│   ├── components/ · lib/ (incl. lib/domain, lib/env.ts) · hooks/ · types/
│   └── proxy.ts
├── drizzle/                 # committed SQL migrations
├── scripts/                 # migrate.ts, seed.ts
├── seed/images/             # seed photos (from the design)
├── public/                  # hero image
├── Dockerfile · docker-compose.yml · .env.example
├── architecture.md · features-spec.md · AGENTS.md
```

### 2.3 Better Auth notes

| Topic | Decision |
| --- | --- |
| Session | One sliding session cookie (`expiresIn` 7d, `updateAge` 1d). No refresh token, so a 401 on the client redirects to `/login?redirectTo=…`. |
| Roles | `admin` plugin: `role` is `"user"` (shown as "customer") or `"admin"`. Admins are seeded or promoted. |
| Server session | `getSession()` in `server/lib/auth.ts` (`auth.api.getSession({ headers })`, cached per request). The Better Auth instance is `server/lib/better-auth.ts`. |
| Client | `features/auth/api/auth.api.ts` calls `/api/auth/*` (passing `{ baseURL: "/api" }`, since the shared axios instance points at `/api/v1`); `useSignIn`, `useSignUp`, `useSignOut` are TanStack mutations; `useMe()` reads the hydrated session. |
| Route groups | `(public)` holds browse, hotel details, login and sign-up. `(customer)` and `(admin)` are protected. |

Every app endpoint under `/api/v1` (not `/api/auth/*`, `/api/health`, `/api/uploads/*` or file downloads) returns `ApiResponse<T>`; lists return `ApiResponse<Page<T>>` (`{ items, pagination }`); errors return `ApiError`.

---

## 3. Roles and access

| Role | How they get it | Can |
| --- | --- | --- |
| Guest (signed out) | — | Browse, search, view hotel details, see prices |
| Customer | Signs up | Everything a guest can, plus request, view and cancel their own bookings and view receipts |
| Admin | Seeded, or promoted by another admin (Better Auth `admin` plugin, `role = "admin"`) | Admin area only: hotels, booking requests, finance |

- **[A]** An admin who opens a customer page is redirected to `/admin/bookings`. An admin is not a customer.
- The API enforces every rule. `proxy.ts` and role-based UI are UX only (architecture.md §9.3).
- Admin endpoints live under `/admin/*` in the API and require `role === "admin"`.

---

## 4. Domain model

Money is stored as **integer cents**. Stay dates are **`date`** (no time or time zone). Timestamps are `timestamptz`.

### 4.1 Better Auth tables (generated)

`user` (+ `role`, `banned`, `banReason`, `banExpires` from the admin plugin), `session` (+ `impersonatedBy`), `account`, `verification`. Generated with the Better Auth CLI into the Drizzle schema.

### 4.2 `hotel`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| slug | text unique | From the name. Used in URLs: `/hotels/harbor-house` |
| name | text | 2–80 chars |
| city | text | |
| country | text | |
| description | text | ≤ 2000 chars |
| amenities | text[] | Free text, trimmed, de-duplicated, ≤ 30 items |
| rooms | int | ≥ 1. Total bookable rooms |
| nightly_rate_cents | int | ≥ 100 |
| check_in_time | time | Default 15:00 |
| check_out_time | time | Default 11:00 |
| free_cancellation_hours | int | Default 48 |
| status | enum `published` \| `hidden` | Only `published` hotels appear to customers |
| rating_avg | numeric(2,1) | Cached from reviews, nullable |
| review_count | int | Cached, default 0 |
| created_at / updated_at | timestamptz | |

### 4.3 `hotel_image`

`id`, `hotel_id` → hotel (cascade), `path`, `alt`, `position` (0 = cover), `created_at`. 1–10 images per hotel. jpg, png or webp, ≤ 5 MB each.

### 4.4 `booking`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| ref | text unique | `HB-` + a Postgres sequence starting at 1000 (`HB-2041`) |
| user_id | → user | |
| hotel_id | → hotel | |
| check_in / check_out | date | `check_out > check_in` |
| nights | int | Derived and stored |
| guests | int | 1–4 **[A]** |
| nightly_rate_cents | int | **Snapshot** at request time |
| subtotal_cents | int | rate × nights |
| tax_cents | int | `round(subtotal × TAX_RATE)`. TAX_RATE = 0.12 **[A]** (the design shows $426 → $51) |
| total_cents | int | subtotal + tax |
| status | enum `pending` \| `approved` \| `rejected` \| `cancelled` | |
| rejection_reason | text | Required when rejected, 5–300 chars |
| decided_by / decided_at | → user / timestamptz | Admin who approved or rejected |
| cancelled_at | timestamptz | |
| created_at / updated_at | timestamptz | |

**"Completed"** is not stored. It is derived: `status = approved AND check_out < today`.

Indexes: `(hotel_id, status, check_in, check_out)`, `(user_id, created_at desc)`, `(status, created_at desc)`.

### 4.5 `transaction`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid pk | |
| booking_id | → booking | |
| type | enum `payment` \| `refund` | |
| amount_cents | int | Always positive. The sign comes from `type` |
| created_at | timestamptz | |

The design shows a "Paid" badge for payments and a "Refunded" badge for refunds. That status comes from `type`, so it is not stored separately.

### 4.6 `review` (seeded in v1)

`id`, `hotel_id`, `user_id`, `booking_id` (unique, nullable for seed data), `rating` 1–5, `comment`, `created_at`. Writing to it refreshes `hotel.rating_avg` and `hotel.review_count`.

### 4.7 Booking state machine

```
               ┌── approve (admin, rooms free) ──► approved ──► (check_out passes) = completed
pending ───────┼── reject (admin, reason)  ─────► rejected
               └── cancel (customer)       ─────► cancelled
approved ── cancel (customer, ≥ free_cancellation_hours before check-in) ──► cancelled (+ refund)
```

| Transition | Who | Side effect |
| --- | --- | --- |
| pending → approved | admin | Insert a `payment` transaction for `total_cents` |
| pending → rejected | admin | Store the reason. No transaction |
| pending → cancelled | owner | None |
| approved → cancelled | owner | Insert a `refund` transaction for `total_cents`. Allowed only if `now ≤ check_in at check_in_time − free_cancellation_hours` |

Any other transition returns `409 Conflict`. Every transition runs in one DB transaction.

### 4.8 Availability (overbooking guard)

A hotel is **available** for `[check_in, check_out)` when, **for every night** in the range, the count of `approved` bookings covering that night is less than `hotel.rooms`.

- **Pending** requests do **not** hold rooms. Many customers can request the same dates, and the admin decides. **[A]**
- **Approval** re-checks availability inside a transaction that first runs `SELECT … FROM hotel WHERE id = $1 FOR UPDATE`, so two concurrent approvals can't overbook. If the rooms are gone, the API returns `409`: "No rooms left for these dates. Reject this request instead."
- Search with dates and the booking request form both use the same availability function.

---

## 5. Features: Customer

### F-01 Sign up, sign in, sign out
*No design yet. It reuses the design's tokens (§8).*

- `/signup`: name, email, password (≥ 8 chars), confirm password.
- `/login`: email, password. Honors `?redirectTo=` (must be a relative path, architecture.md §9.4).
- **Continue with Google** on `/login` and `/signup`, shown only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured (both or neither; one alone stops the app at startup). One button signs in or creates the account. Full requirements: `openspec/specs/user-auth/spec.md`.
- Sign out from the avatar menu in the header. It clears the TanStack cache and goes to `/`.
- **AC**
  - Signing up creates a `customer` user and signs them in.
  - Wrong credentials show "Email or password is incorrect" and don't say which one is wrong.
  - A signed-in user who visits `/login` or `/signup` is redirected away.
  - After a successful sign-in, `redirectTo` returns the user to where they were (for example, the hotel page where they clicked "Request booking").
  - The first Google sign-in creates a customer account (name, email and picture from Google, email verified). Later Google sign-ins reach the same account. Admins land on `/admin/bookings`, others on `/`, unless `redirectTo` is set.
  - If the Google email already belongs to an email/password account, nothing is linked and no one is signed in. `/login` shows "This email already has a Stayly account. Sign in with your password."
  - A cancelled or failed Google sign-in returns to `/login` with "Google sign-in was cancelled or failed. Please try again." A suspended account gets "This account is suspended."
- **[Q]** Email verification and password reset need an email transport (Mailpit locally). Do we want them in v1?

### F-02 Header and navigation
- Customer header: **Stayly** logo, then **Browse** and **My bookings**, then the avatar (initials) and name, which opens a menu with Sign out.
- Signed out: **Sign in** and **Sign up** buttons instead of the avatar. "My bookings" is hidden.
- The active nav item is highlighted. At phone width the header wraps (as in the design).

### F-03 Browse home (`/`)
*Design: "Browse hotels".* A Server Component prefetches every section.

1. **Hero**: background image, "Winter escapes · up to 20% off" pill, headline, and a subtitle that includes the number of cities with published hotels ("Hand-picked hotels in **N** cities…").
   - **[A]** The promo pill text is a static constant in v1, with no CMS.
2. **Search form**: hotel name (text), location (select from the cities of published hotels), check-in date, check-out date, **Search** button.
   - Submitting writes `q`, `location`, `checkIn` and `checkOut` to the URL (nuqs) and scrolls to **All hotels**.
   - Dates are optional. When both are set, `checkOut > checkIn`, `checkIn ≥ today` and the stay is ≤ 30 nights.
3. **Trending destinations**: up to 6 cities, each with an image, city name, "N hotels" and "↑ X%".
   - Trend = booking requests created in the last 30 days compared with the 30 days before, per city. Show the top 6 by growth. Cities with fewer than 3 requests in the current window are left out. If fewer than 6 qualify, fill with the cities that have the most hotels.
   - The city image is the cover image of that city's top-rated hotel. **[A]**
   - Clicking a city sets `location`, clears `q` and scrolls to **All hotels**.
4. **Top rated hotels**: the top 4 published hotels by `rating_avg` (ties broken by `review_count`). Card: image, rank badge "#1", "Guest favourite" pill, name, ★ rating, "City, Country · N reviews", "$X / night". Has a "View all" link.
5. **Trending this week**: horizontal scroll, up to 5 hotels with the most booking requests in the last 7 days. Card: thumbnail, "Booked N× this week" pill, name, place, price and rating. Hidden if there are none.
6. **All hotels** (`#all`): a paginated grid (12 per page) of published hotels that match the filters.
   - Subtitle: "N hotels available", or "N hotels match your search" when filtered.
   - A clear-filter chip shows the active filters ("Lisbon · “harbor”") and resets them.
   - Empty state: "No hotels match your search. Try another name or location."
   - With dates set, hotels without availability are left out (§4.8).
   - Default sort: rating desc, then name. **[Q]** Do we want a sort control (price, rating)?
- **AC**
  - The first paint has data and no spinner (server prefetch + `HydrationBoundary`).
  - Every filter is in the URL. Reloading or sharing the link restores the same results.
  - Name search is case-insensitive substring matching, debounced 300 ms while typing.
  - Hidden hotels never appear.

### F-04 Hotel details (`/hotels/[slug]`)
*Design: "Hotel details + booking".*

- "← All hotels" back link. It keeps the previous search params.
- Title, "City, Country · ★ rating · N rooms".
- Gallery: the cover image large, plus 2 smaller images. **[Q]** A lightbox for all images: v1 or later?
- **About** (description), **Amenities** (grid of chips), **Policies**: "Check-in from {check_in_time}, check-out by {check_out_time}. Free cancellation up to {free_cancellation_hours} hours before arrival."
- A hidden or unknown slug returns `notFound()`.
- **AC**: the page renders on the server and is shareable. `generateMetadata` sets the title to the hotel name.

### F-05 Request a booking (panel on hotel details)
- Fields: check-in, check-out (taken from the URL's search dates if present), guests (1–4).
- A live price breakdown: "$142 × 3 nights", "Taxes & fees", **Total**. It is computed on the client for display. **The API recomputes and is the only source of truth.**
- An availability hint after the dates are picked: "Rooms available" or "Fully booked for these dates" (`GET /hotels/:id/availability`). The button is disabled while the hotel is fully booked.
- **Request booking**:
  - Signed out: go to `/login?redirectTo=/hotels/<slug>?checkIn=…&checkOut=…&guests=…`.
  - Signed in: `POST /bookings`. On success: toast "Request sent. Ref HB-2041." and go to `/bookings`.
- Note under the button: "The hotel reviews every request. You are only charged once it is approved."
- **Validation (API)**
  - The hotel is published. `check_in ≥ today`, `check_out > check_in`, nights ≤ 30, guests 1–4.
  - The hotel is available for those dates.
  - The same user can't have another `pending` or `approved` booking at the same hotel with overlapping dates (`409`).
  - A user can have at most 5 `pending` requests at a time (`429`/`409`). **[A]**
- **AC**: the price snapshot is stored on the booking. A later rate change doesn't change existing bookings.

### F-06 My bookings (`/bookings`)
*Design: "My bookings".*

- Tabs with counts: **All · N**, **Pending · N**, **Approved · N**, **Rejected · N**. The tab is in the URL (`?status=`).
  - **[A]** Cancelled bookings appear only under **All**, with a grey "Cancelled" badge.
- Each card: hotel image, name, place, "Dec 12 – Dec 15, 2026 · 3 nights · 2 guests", status badge, "Ref HB-2041", total.
  - Status badges: Pending review (amber), Approved (green), Approved with "· Completed" after check-out, Rejected (red, with "Reason: …" under the dates), Cancelled (grey).
- Actions by state:
  - Pending: **Cancel request** (confirm dialog, then `pending → cancelled`).
  - Approved, upcoming, inside the free-cancellation window: **Cancel booking** (the confirm dialog shows the refund amount) and **View receipt**.
  - Approved, past the window or completed: **View receipt** only.
  - Rejected: **Find another**, which links to `/?location=<city>`.
- Sort: newest request first. Paginated at 10 per page.
- **AC**
  - Cancelling updates the card and the tab counts without a full reload (invalidate `bookingKeys.lists()` and the counts).
  - A user can only see their own bookings. Another user's id returns `404`.

### F-07 Receipt (`/bookings/[ref]/receipt`)
*No design yet.*

- Ref, hotel, dates, nights, guests, rate × nights, taxes, total, payment date, and refund lines if any. "Print" button (print stylesheet).
- Only for `approved` or `cancelled`-after-approval bookings owned by the user.

---

## 6. Features: Admin

All admin pages are under `/admin/*`. The header shows **Stayly**, an **Admin** badge, then **Hotels**, **Bookings**, **Finance**, then the avatar and name with Sign out. `/admin` redirects to `/admin/bookings`.

### F-10 Hotels list (`/admin/hotels`)
*Design: "Admin · Hotels".*

- Table: Hotel, Location, Rooms, Rate / night, Status (Published green, Hidden grey), **Edit**.
- **[A]** A search box (name) and a status filter (All, Published, Hidden), both in the URL. Paginated at 20 per page.
- The side panel holds the **New hotel** form (F-11). On narrow screens it moves under the table (as in the design).

### F-11 Create / edit hotel
- Fields: Name, City, Country, Rate per night ($), Rooms, Description, Amenities (comma-separated in the design; **[A]** turned into removable chips as you type), Check-in time, Check-out time, Free-cancellation hours, Images (upload, reorder, set cover, alt text).
  - The design's form doesn't include the times, cancellation hours or images. We add them under a "More details" disclosure so the form stays as compact as the design.
- Buttons: **Save as hidden** (status `hidden`) and **Publish hotel** (status `published`).
- **Edit** opens the same form, filled in, in the side panel (`?edit=<id>` in the URL). At phone width the panel stacks under the table and scrolls into view. Status can be toggled there.
- Validation follows §4.2. The field rules are shared (`hotelFields` in `src/lib/domain/hotel.ts`): the API's request schema (`hotel.schema.ts`) and the admin form schema (`features/admin-hotels/schemas.ts`) are both built from them. Publishing also requires at least 1 image.
- **AC**
  - Changing the rate doesn't change existing bookings (snapshot).
  - Lowering `rooms` below the number already approved for some future night is rejected with `409`, and the message lists the first conflicting date.
  - Slugs are unique. A duplicate name gets `-2`, `-3`, and so on.
  - **[A]** Hotels are never hard-deleted. "Hide" is the only way to remove one from the catalog, because bookings and finance point to it.

### F-12 Booking requests (`/admin/bookings`)
*Design: "Admin · Booking requests".*

- Tabs with counts: **Pending · N** (default), **Approved · N**, **Rejected · N**, **All**. In the URL.
- Table: Ref, Guest, Hotel, Dates, Nights, Total, Requested (date), Status, Decision.
- Pending rows: **Approve** and **Reject** buttons.
  - **Approve**: an optimistic update, then the API re-checks availability (§4.8). On `409`, roll back and toast the message.
  - **Reject**: a dialog asks for a reason (required, 5–300 chars, shown to the customer).
- [A] Filters: hotel (select), and a search box for ref or guest name or email. Paginated at 20 per page. Sorted oldest pending first (FIFO). Other tabs are sorted newest first.
- [A] A conflict hint on pending rows: "Only 1 room left for these dates" or "Fully booked". It comes from the same availability calculation.
- Footer note: "Approving confirms the stay and records the payment. Rejecting asks for a short reason that the customer will see."
- **AC**
  - Approving inserts exactly one `payment` transaction. A double-click does not double-charge: the transition is idempotent and checked against the state.
  - Approve and reject both invalidate the booking lists, the tab counts and the finance queries.

### F-13 Finance (`/admin/finance`)
*Design: "Admin · Finance".*

- Header: "Finance", the period label ("Jun – Nov 2026 · all amounts in USD") and **Export CSV**.
- Period: the last 6 calendar months, including the current one, by default. **[A]** A range picker (from/to month) is in the URL.
- **KPI cards** (all for the selected period, grouped by `transaction.created_at` or `booking.created_at` as noted):
  | Card | Value | Sub-label |
  | --- | --- | --- |
  | Confirmed revenue | Σ payments − Σ refunds | "N approved bookings" |
  | Awaiting decision | Σ total of `pending` bookings (all current pending, ignores the period) | "N pending requests" |
  | Refunded | Σ refunds | "N cancellations" |
  | Average booking | Σ payments / count of payments | "Confirmed only" |
- **Revenue by month**: a bar chart of net revenue per month in the period, with a value label on each bar (`$2.1k`) and an accessible text summary.
- **Revenue by hotel**: table of Hotel, Bookings (payments count), Revenue (net), sorted by revenue desc.
- **Recent transactions**: Date, Booking ref, Guest, Hotel, Type, Status (Paid or Refunded), Amount (refunds shown as `−$284.00`). Paginated at 20 per page.
- **Export CSV**: downloads every transaction in the period (`GET /api/v1/admin/finance/transactions.csv?from&to`). Columns: date, ref, guest name, guest email, hotel, type, amount_usd.
- **AC**: the totals match the sum of the rows in the export for the same period. Amounts are formatted with `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`.

---

## 7. API surface

Route handlers in `src/app/api/v1/**/route.ts`. Paths below are relative to `/api/v1`, except Better Auth (`/api/auth/*`), uploads (`/api/uploads/*`) and the health check (`/api/health`), which live outside the version and are written in full. Every `/api/v1` route except the CSV download returns `ApiResponse<T>` (lists: `ApiResponse<Page<T>>`). Errors return `ApiError` with a status code: `400` validation, `401` unauthenticated, `403` wrong role, `404`, `409` state or availability conflict, `429` rate limit.

### Auth (Better Auth, `app/api/auth/[...all]/route.ts`)
`POST /api/auth/sign-up/email` · `POST /api/auth/sign-in/email` · `POST /api/auth/sign-out` · `GET /api/auth/get-session` · admin plugin routes (`/api/auth/admin/*`).

### Public
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/hotels` | `q, location, checkIn, checkOut, page, limit`. Published only |
| GET | `/hotels/top-rated` | `limit` (default 4) |
| GET | `/hotels/trending` | Last 7 days, `limit` (default 5) |
| GET | `/hotels/:slug` | Details + images |
| GET | `/hotels/:id/availability` | `checkIn, checkOut` → `{ available: boolean, roomsLeft: number }` |
| GET | `/destinations` | Cities with hotel count, trend %, image |
| GET | `/locations` | Distinct cities of published hotels (for the select) |
| GET | `/api/uploads/*` | Static images (outside `v1`) |
| GET | `/api/health` | `{ ok }`, 503 when the database is down (outside `v1`) |

### Customer (signed in)
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/bookings` | `{ hotelId, checkIn, checkOut, guests }` |
| GET | `/bookings` | `status, page, limit`. Own bookings only |
| GET | `/bookings/counts` | `{ all, pending, approved, rejected }` |
| GET | `/bookings/:ref` | Own booking, with transactions (for the receipt) |
| POST | `/bookings/:ref/cancel` | §4.7 rules |

### Admin
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/hotels` | `q, status, page, limit` |
| POST | `/admin/hotels` | Create |
| GET | `/admin/hotels/:id` | |
| PATCH | `/admin/hotels/:id` | Update, including status |
| POST | `/admin/hotels/:id/images` | multipart upload |
| PATCH | `/admin/hotels/:id/images` | Reorder, change alt text, set cover |
| DELETE | `/admin/hotels/:id/images/:imageId` | |
| GET | `/admin/bookings` | `status, hotelId, search, page, limit` (each row includes `roomsLeft` for pending rows) |
| GET | `/admin/bookings/counts` | |
| POST | `/admin/bookings/:id/approve` | |
| POST | `/admin/bookings/:id/reject` | `{ reason }` |
| GET | `/admin/finance/summary` | `from, to` → KPIs, by-month and by-hotel figures |
| GET | `/admin/finance/transactions` | `from, to, page, limit` |
| GET | `/admin/finance/transactions.csv` | `from, to` |

### Features (map to `src/features/*` and `src/server/modules/*`)

| Feature folder (frontend) | Server module (`src/server/modules/`) | Client side |
| --- | --- | --- |
| `auth` | — (Better Auth in `server/lib/better-auth.ts`, session helpers in `server/lib/auth.ts`; `features/auth/server.ts` hydrates the session) | Sign in/up/out hooks, `authQueries.me()`, login and sign-up forms, headers |
| `hotels` | `hotel/`: `hotel.service` (search, top rated, trending, destinations, locations, details, availability) | Browse/search, details, availability hint |
| `bookings` | `booking/`: `booking.service` (request, list, counts, receipt, cancel, approve, reject), `booking.pricing` (`quote()`) | Request panel, My bookings, receipt, cancel |
| `admin-hotels` | `hotel/`: `hotel-admin.service` (list, create, update, images), same `hotel.repository` | Admin hotel table, form, photo manager |
| `admin-bookings` | `booking/`: `bookingService.listForAdmin`, `countsForAdmin`, `approve`, `reject` | Request queue, approve/reject |
| `finance` | `finance/`: `finance.service` (summary, transactions, CSV) | KPIs, chart, tables, export |

### Routes (`src/app`)

```
(public)/page.tsx                    → F-03
(public)/hotels/[slug]/page.tsx      → F-04, F-05
(public)/login, (public)/signup      → F-01
(customer)/bookings/page.tsx         → F-06
(customer)/bookings/[ref]/receipt    → F-07
(admin)/admin/hotels/page.tsx        → F-10, F-11 (edit opens in the side panel via ?edit=<id>)
(admin)/admin/bookings/page.tsx      → F-12
(admin)/admin/finance/page.tsx       → F-13
```

Each protected route has `loading.tsx` and `error.tsx` (architecture.md §13).

---

## 8. Cross-cutting requirements

### UI and design system
- Port the design tokens to Tailwind theme variables. Font: **Inter**. Neutrals: `#fafafa` background, `#ffffff` surface, `#e5e5e5` border, `#d4d4d4` input border, `#525252` muted text, `#0a0a0a` text, `#171717` primary button. Radii: 8 px (controls), 12–14 px (cards), 999 px (pills).
- Status colors: amber `#fef3c7`/`#92400e` (pending), green `#dcfce7`/`#166534` (approved, paid, published), red `#fee2e2`/`#991b1b` (rejected), grey `#e5e5e5`/`#262626` (hidden, refunded, cancelled), orange `#ffedd5`/`#9a3412` (trending).
- Small in-house primitives in `components/ui` (Radix for Dialog and DropdownMenu), styled with the tokens above: Button, Field/Input/Select, Dialog, ChipTabs, Table, Badge, DropdownMenu, Skeleton, Pagination.
- Every page works at phone width (390 px). Tables scroll inside their card, and side panels stack under the content.
- Accessibility: real `<button>`/`<a>`/`<label>`, visible focus rings (2 px `#0a0a0a`), 44 px touch targets on primary actions, text contrast ≥ 4.5:1, and `alt` text on hotel images.

### Dates, time and money
- Show stay dates as `Dec 12 – Dec 15, 2026`. Omit the year when both dates are in the current year in admin tables (as in the design).
- "Today" for date validation is the server's date in `APP_TIMEZONE` (default `UTC`). **[A]**
- Money is always in cents in the API and formatted only in the UI.

### Security
- Every admin route handler checks the role (`apiHandler("admin", …)`); admin layouts redirect non-admins. Customer services check ownership.
- Rate limits: Better Auth's built-in limiter on auth routes. `POST /api/v1/bookings` is limited to 10 per minute per user.
- Better Auth `baseURL` = the app origin (same origin, so no extra trusted origins). Cookies are `httpOnly`, `sameSite=lax`, and `secure` outside local dev.
- Uploads: check the MIME type by reading the file's magic bytes, re-encode with `sharp` to webp (max 2000 px), and use random file names.

### Observability
- Structured JSON logs (pino) from route handlers and services. Log every booking state change with the actor's id.

### Testing (architecture.md §18)
- Services and route handlers: Vitest + a real Postgres (the Compose `db`, `stayly_test` database). Must cover the availability calculation, every state transition, the concurrent-approval race, role checks, and the finance totals.
- Web: MSW-backed tests for the main hook and component of each feature.
- Playwright e2e: sign up → search → request → admin approves → the customer sees Approved → finance shows the payment.

---

## 9. Later (v2 candidates)

- Email notifications (request received, approved, rejected, cancelled), with Mailpit locally.
- Email verification and password reset.
- Customers write reviews after a completed stay. This updates the cached rating.
- Real payments (Stripe: authorize on request, capture on approve).
- Multiple room types per hotel, and nightly rates by season.
- Admin user management screen (promote/ban, through the Better Auth admin plugin).
- Favorites / wishlist.

---

## 10. Local development (Docker)

### `docker-compose.yml` services

| Service | Image / build | Port | Notes |
| --- | --- | --- | --- |
| `db` | `postgres:17-alpine` | 5432 | Volume `pgdata`, healthcheck `pg_isready` |
| `migrate` | `Dockerfile` (target `tools`) | — | One-shot: apply migrations, then seed if `SEED=true` (idempotent). `depends_on: db (healthy)`. Volume `uploads` |
| `web` | `Dockerfile` (target `runner`, Next `output: "standalone"`) | 3000 | `depends_on: migrate (completed)`. Volume `uploads` |

- `docker compose up --build` gives a working app at `http://localhost:${WEB_PORT}` (default 3000).
- Local dev without containers for the app: `docker compose up -d db`, then `pnpm db:migrate && pnpm db:seed && pnpm dev`.

### Environment (`.env.example`)

```
# db
POSTGRES_USER=stayly
POSTGRES_PASSWORD=stayly
POSTGRES_DB=stayly
DB_PORT=5432
DATABASE_URL=postgres://stayly:stayly@localhost:5432/stayly   # Compose overrides the host for containers

# app (server)
BETTER_AUTH_SECRET=change-me-32-chars-min
BETTER_AUTH_URL=http://localhost:3000     # the app's public origin
TAX_RATE=0.12
APP_TIMEZONE=UTC
UPLOAD_DIR=./data/uploads                 # /data/uploads in containers
SEED=true

# app (public, inlined at build time)
WEB_PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Seed data
- Admin: `admin@stayly.local` / `admin12345` (local only). Customers: `avery@stayly.local` plus ~10 others.
- The 9 hotels from the design (Harbor House, Alpine Lodge, The Meridian, Coral Bay Resort, Azure Villas, Thames House, Northern Light, Casa Verde, Seaside Inn) with their cities, rates and room counts. Seaside Inn is `hidden`, as in the admin design. Images are the design's photos in `seed/images/`.
- Reviews that produce the design's ratings, and ~60 bookings spread across Jun–Nov 2026 in every status, with matching transactions, so the trending, top-rated and finance views all have data.

---

## 11. Build order (milestones)

1. **Foundation**: single Next.js app, Docker Compose, Postgres + Drizzle, Better Auth at `/api/auth`, the server layer (`src/server/lib`: `apiHandler()` wrapper, `AppError` classes, responses, session helpers, storage; `src/server/modules` per domain), the client layer per `architecture.md` (providers, http, query clients, `proxy.ts`, env, ESLint boundaries), seed.
2. **Auth**: F-01, F-02.
3. **Catalog (read)**: F-03, F-04.
4. **Booking requests**: F-05, F-06, F-07, plus the availability engine.
5. **Admin hotels**: F-10, F-11 (including uploads).
6. **Admin decisions**: F-12.
7. **Finance**: F-13.
8. **Hardening**: e2e flow, accessibility pass, phone-width pass, `pnpm check` clean.

---

## 12. Open questions

1. **[Q]** Email verification and password reset in v1 (needs Mailpit)? (F-01)
2. **[Q]** Sort control on All hotels? (F-03)
3. **[Q]** Gallery lightbox in v1? (F-04)
4. **[Q]** Should pending requests hold a room? The current spec says no: only approval counts (§4.8).
5. **[Q]** Cancelling an approved booking inside the free-cancellation window is **blocked** in this spec. Should we allow it with no refund instead?
6. **[Q]** Is the 12% tax rate right, and should it be one global rate or per hotel?
