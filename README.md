# Stayly: reference architecture + spec-driven development

Stayly is a small hotel-booking app. Guests browse hotels and request rooms, and admins approve bookings, manage hotels and see finance. The app itself is the example. The point of this repository is:

1. **An architectural guide.** One Next.js app is both the frontend and the backend, with clear layers and boundaries that lint enforces.
2. **A working example** of that architecture: auth, catalog, bookings, admin and finance, tested and running in Docker.
3. **A spec-driven development (SDD) workflow with [OpenSpec](https://github.com/Fission-AI/OpenSpec).** Every feature goes from design to plan to spec to build to verify to archive. The workflow is written so that **a person and an AI agent can both follow it**.

> **AI agents:** read [For AI agents](#for-ai-agents) first. The rules in `AGENTS.md` (also loaded as `CLAUDE.md`) are binding.

---

## Contents

- [Quick start](#quick-start)
- [Documentation map](#documentation-map)
- [Architecture overview](#architecture-overview)
- [The development workflow](#the-development-workflow)
  - [Step 1: Design the concept (new projects)](#step-1-design-the-concept-new-projects)
  - [Step 2: Build only from the component library](#step-2-build-only-from-the-component-library)
  - [Step 3: Plan and specify with OpenSpec](#step-3-plan-and-specify-with-openspec)
  - [Step 4: Apply: build from the tasks](#step-4-apply-build-from-the-tasks)
  - [Step 5: Test, verify, archive, next feature](#step-5-test-verify-archive-next-feature)
- [Worked example: Google sign-in](#worked-example-google-sign-in)
- [For AI agents](#for-ai-agents)
- [Commands reference](#commands-reference)
- [Known gaps](#known-gaps)

---

## Quick start

**Prerequisites:**
- Node ≥ 20.9
- pnpm 10 (`corepack enable`)
- Docker
- The OpenSpec CLI (`openspec --version`; this repo was built with 2.1.0)

```bash
cp .env.example .env            # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
```

**Run everything in Docker** (app + Postgres, with migrations and seed data):

```bash
docker compose up -d --build    # app on http://localhost:${WEB_PORT} (3000 by default)
```

**Or develop locally against the Compose database:**

```bash
docker compose up -d db
pnpm install
pnpm db:migrate && pnpm db:seed
pnpm dev
```

**Demo accounts** (from the seed):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@stayly.local` | `admin12345` |
| Customer | `avery@stayly.local` | `avery12345` |

**Optional: Google sign-in.** Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (both or neither), and register `<BETTER_AUTH_URL>/api/auth/callback/google` as the OAuth redirect URI. See `.env.example`.

> Uploaded images live in `./data/uploads` for `pnpm dev`, and in the `uploads` Docker volume in Docker. If you seed from the host and run the app in Docker, copy the images across: `docker compose cp data/uploads/. web:/data/uploads/`.

**Check everything:** `pnpm check` runs lint, typecheck and the tests against the Compose database.

---

## Documentation map

Read these in this order:

| File | What it is | When to read it |
|---|---|---|
| **README.md** (this file) | The overview and the workflow | First |
| **AGENTS.md** (= `CLAUDE.md`) | The binding rules, short | Before writing any code |
| **architecture.md** | The full architecture guide with real code excerpts (§2 folders, §3 dependency rules, §6 services, §7 API, §9 auth, §17 lint guardrails, §21 checklists) | When building or reviewing |
| **features-spec.md** | The original product spec (F-01 … F-13), written before OpenSpec | For feature behavior not yet migrated to OpenSpec specs |
| **openspec/specs/** | **What the system does today**: the source of truth for behavior | Before changing any behavior |
| **openspec/changes/** | Changes in flight, plus `archive/` for finished ones | When planning or building a feature |
| **openspec/config.yaml** | OpenSpec project config (schema: `spec-driven`) | When tuning the workflow |

---

## Architecture overview

One Next.js 16 app. **Next.js is the backend**: route handlers under `src/app/api/v1` are the API, and pages call the same services directly on the server.

### Layers

```
  BROWSER                                  SERVER (Next.js)
  -------                                  ----------------
  features/<x>/components  (UI)
        |  hooks (TanStack Query)
        v
  features/<x>/api  (axios, /api/v1) --HTTP-->  app/api/v1/**/route.ts
                                                  apiHandler(access, ...)  auth, errors, logging
                                                  parse with <x>.schema    Zod -> 400 on bad input
                                                        |
  app/(pages)  Server Components  ----direct call----> server/modules/<x>/<x>.service.ts
   (read-only data or prefetch)                           business rules, transactions, AppErrors
                                                        |
                                                        v
                                                 server/modules/<x>/<x>.repository.ts
                                                   Drizzle queries only, returns DTOs/null
                                                        |
                                                        v
                                                    PostgreSQL

  shared by both sides:  src/lib/domain/*   constants, field schemas, pure helpers
  client -- import type only -->  server/modules/<x>/<x>.types.ts   (DTOs)
  outside /api/v1:  /api/auth (Better Auth) . /api/health . /api/uploads
```

### Folder structure

```
src/
  app/                      routing only
    (public) (customer) (admin)   page groups: read params -> call a service or prefetch -> render
    api/v1/**/route.ts            the versioned API: thin handlers
    api/auth/[...all]             Better Auth
    api/health, api/uploads       infra endpoints (unversioned)
  server/                   server-only ("server-only" import in every file)
    modules/<x>/            one folder per domain: hotel, booking, finance
      <x>.schema.ts         Zod request schemas
      <x>.types.ts          request/response DTO types
      <x>.repository.ts     SQL (Drizzle) only
      <x>.service.ts        business rules (+ e.g. hotel-admin.service.ts)
    lib/                    api-handler, errors, response, auth, better-auth, storage, logger, dates, rate-limit
    config/env.ts           validated server env
    db/                     client + Drizzle schema
  features/<x>/             frontend only: api/, hooks/, components/, queries.ts, search-params.ts, index.ts
  components/ui/            the component library (see Step 2)
  lib/                      shared client+server helpers; lib/domain = shared business rules
  types/api.ts              ApiResponse<T>, Page<T>
openspec/                   specs (truth) + changes (plans)
test/                       Vitest: services, route handlers, rules
```

### The rules that matter most

These are enforced by `eslint.config.mjs` and `pnpm check`. The full list is in `AGENTS.md`.

- **Route handler** = `apiHandler(access, …)` → parse with a module schema → call a service → `ok()` / `created()`. It contains no SQL and no business rules.
- **Service** = `(actor, input)` → JSON-safe DTO (ISO strings, integer cents). It throws `AppError` subclasses, never imports `next/*`, and owns transactions.
- **Repository** = queries only. It returns rows/DTOs or `null`, and never throws `AppError`s.
- **Client code** never imports runtime server code. It may `import type` DTOs from `server/modules/*/*.types.ts`.
- **Data flow:**
  - read-only page data: call the service in a Server Component
  - interactive data: prefetch, then a TanStack Query hook
  - writes: `useMutation` → fetcher → route → service (no Server Actions)
- **Conventions:**
  - Lists return `Page<T>`.
  - API responses are `{ message, statusCode, data }`.
  - Money is integer cents; dates are `YYYY-MM-DD`.
  - List filters live in the URL (nuqs).

**Adding an endpoint:** schema → types → repository → service → `app/api/v1/.../route.ts` → client fetcher → query keys → hook. See architecture.md §21.

---

## The development workflow

Every feature follows the same loop. Steps 1–2 set up the visual foundation once per project. Steps 3–5 repeat for each feature.

```
  (new project only)
  +-----------------+     +----------------------+
  | 1. DESIGN       | --> | 2. COMPONENT LIBRARY |
  | concept, tokens |     | tokens -> ui/ kit    |
  +-----------------+     +----------+-----------+
                                     |
            +------------------------+
            v
  +-----------------+     +-----------------+     +------------------------+
  | 3. PLAN (spec)  | --> | 4. APPLY        | --> | 5. VERIFY + ARCHIVE    |
  | explore,        |     | build task by   |     | pnpm check, Docker,    |
  | propose         |     | task            |     | manual checks, archive |
  +-----------------+     +-----------------+     +-----------+------------+
            ^                                                  |
            +----------------- next feature -------------------+
```

**Gates** are points where a human decides. An AI agent must stop and ask at each one:
- approving the design
- approving the proposal/spec before building
- any change to spec'd behavior discovered while building
- confirming manual verification before archiving

### Step 1: Design the concept (new projects)

Use this step when the project is new or needs a visual concept. Skip it for features that fit the existing design.

1. **Create the design with Claude Design (`/claude design`).** Describe the product, its users and its main screens. For Stayly that meant a "Hotel Booking App" canvas covering browse, hotel detail, request booking, my bookings, and the admin booking queue, hotels and finance.
2. **Iterate until the screens and visual language are settled.** That covers type, colors, radii, spacing, status colors, and how states look (empty, loading, error).
3. **Write down the design tokens and the inventory of UI parts.** For Stayly this is `features-spec.md` §8 *UI and design system*: Inter, the neutral palette, status colors, and radii of 8 px, 12–14 px and 999 px.
4. **Gate:** a human approves the design before any feature is built on it.

### Step 2: Build only from the component library

Design consistency comes from one source of tokens and one set of components. Feature code doesn't style raw HTML.

- **Tokens:** these live in `src/app/globals.css` under `@theme`, as Tailwind theme variables ported from the design. Examples are `--color-ink`, `--color-line`, `--color-amber-bg`/`--color-amber-fg` and `--radius-card`. Use the token classes (`bg-surface`, `text-muted`, `border-line`, …), **never raw hex values**.
- **Components:** these live in `src/components/ui/`, the project's component library. They're small in-house primitives, using Radix for the accessible parts:
  - `Button` (`buttonStyles` for links that look like buttons)
  - `Field` / `Input`
  - `Dialog`
  - `DropdownMenu`
  - `ChipTabs`
  - `Table`
  - `Badge`
  - `Pagination`
  - `Skeleton`
  - `States` / `ErrorState`
  - `Avatar`
  - `Stars`

  Page scaffolding is in `src/components/layout/` (`Page`, `AppHeader`, `NavLinks`).
- **Rules:**
  - Reuse `components/ui` before creating anything. If a feature needs something new (say, a date picker), **add it to the library first**, built from the tokens, then use it. One-off styled elements inside a feature are not allowed.
  - Feature components compose library components and contain no design decisions of their own.
  - Accessibility is part of the library contract:
    - real `<button>` / `<a>` / `<label>` elements
    - visible focus rings
    - 44 px touch targets on primary actions
    - contrast of at least 4.5:1
  - Every page works at 390 px width.
- **Why:** a spec says *what* the UI must do, and the library decides *how it looks*. That keeps the look identical across features built by different people and agents.

### Step 3: Plan and specify with OpenSpec

OpenSpec separates **what the system does now** (`openspec/specs/<capability>/spec.md`) from **what we propose to change** (`openspec/changes/<change>/`). Nothing gets built without an approved change.

**3a. Explore (optional, thinking only).** Run the `openspec-explore` skill, or just discuss. The agent reads the code and the existing specs, draws diagrams, and raises risks and decisions. It never writes code or files in this mode. Use this step when the idea is fuzzy.

**3b. Propose.** Run the `openspec-propose` skill with a one-line description, for example "add Google sign-in". The agent:
1. asks about any choice that changes behavior, scope or security, before writing anything
2. creates the change: `openspec new change "<kebab-name>"`
3. writes the artifacts in dependency order:

| Artifact | Answers | Contents |
|---|---|---|
| `proposal.md` | **Why** and **what** | Motivation, the list of changes, the capabilities affected, and the impact |
| `specs/<capability>/spec.md` | **What must be true** | A *delta*: `## ADDED` / `MODIFIED` / `REMOVED` / `RENAMED Requirements`. Each requirement uses SHALL/MUST and has testable `#### Scenario:` blocks (WHEN/THEN). |
| `design.md` | **How** | Key decisions with the alternatives considered, risks with their mitigations, and migration/rollback |
| `tasks.md` | **Steps** | Checkbox tasks grouped by layer. **Each task says how to verify it**, and each group carries its own tests and docs. |

4. validates the change: `openspec validate <change> --strict`

**Spec-writing rules:**
- A spec describes observable behavior (inputs, outputs, errors, security). It never names classes, libraries or files; those belong in `design.md`.
- Name each capability for a lasting behavior (`user-auth`), not for the piece of work (`add-login`). If a capability already exists, reuse its path.
- A MODIFIED requirement copies the **whole** existing block and then edits it. A partial copy loses scenarios at archive time.

**Gate:** a human reviews the proposal, spec and design. Decisions made in conversation are recorded in the artifacts, not left in chat.

### Step 4: Apply: build from the tasks

Run the `openspec-apply-change` skill (`openspec-apply-change <change>`). The agent:
- reads all the artifacts, then works through `tasks.md` **in order**
- for each task: implements → runs the task's own verification → ticks `- [x]` → re-checks progress (`openspec instructions apply --change <name> --json`)
- follows `AGENTS.md`, `architecture.md` and the component library (Step 2) for all code
- **pauses instead of improvising** when:
  - a task is unclear
  - the code contradicts the design (for example, a library behaves differently)
  - the work would grow beyond the spec or quietly narrow it

  Small factual corrections go back into the artifacts. For example, in the worked example below, the real error code was `BANNED_USER`, not `banned`, and that was fixed in `design.md`.
- never ticks a task that isn't fully done and verified

### Step 5: Test, verify, archive, next feature

A feature is **done** only when all of these hold:

1. **Automated:** `pnpm check` (lint + typecheck + Vitest against the Compose database) passes with zero errors, including the new tests the tasks required.
2. **Running system:** `docker compose up -d --build` passes and the feature works in the containers. Re-run the existing smoke checks so other features haven't regressed.
3. **Every spec scenario is verified.** Each `#### Scenario` is covered either by an automated test or by an explicit manual check. Manual checks involving real third parties (Google, payments) or a real browser are done by a human, who reports the result.
4. **All tasks ticked:** `openspec list` shows `N/N`.
5. **Gate:** a human confirms the verification. Then archive with the `openspec-archive-change` skill or `openspec archive <change>`:
   - the delta specs are **synced** into `openspec/specs/`, so the main spec now describes the new behavior
   - the change moves to `openspec/changes/archive/YYYY-MM-DD-<change>/` as a permanent record of why and how
6. Fix any doc links that pointed into the change folder, commit, and **start the next feature at Step 3**.

Don't archive with open tasks or unverified scenarios. If you must, archive explicitly "with warnings" and say why.

---

## Worked example: Google sign-in

This is the full loop as it happened in this repository. It's archived at `openspec/changes/archive/2026-11-17-add-google-sign-in/`, and the resulting spec is `openspec/specs/user-auth/spec.md`.

| Step | What happened |
|---|---|
| Explore | We mapped the OAuth flow against the current auth code and found that no database migration was needed. We identified the open decisions: how to enable it, account linking, and admins. |
| Propose | The decisions taken: enabled by env vars, and Google allowed for admins. Linking was first set to "link to existing accounts". The agent then found that this allows **account pre-hijacking** (local emails are never verified) and that the safe alternative in Better Auth is the default, while turning it off uses a deprecated option. So the decision was revised to **don't link** and recorded in `design.md` D5. |
| Spec | 6 requirements, 12 scenarios: configured-only, new customer account, no takeover of password accounts, same landing as password sign-in, readable errors, email/password unaffected. |
| Apply | 15 tasks across config, shared rules, UI and the landing page, docs, and integration. The real Better Auth error codes were checked in `node_modules`, and the design was corrected. The button is built from `components/ui/Button`. |
| Verify | `pnpm check`: 40 tests pass. Docker without credentials: no button, `404 PROVIDER_NOT_FOUND`, and 49/49 smoke checks pass. Docker with real credentials: Google accepts the client. A human ran the browser and Google scenarios and confirmed them. |
| Archive | The spec was synced to `openspec/specs/user-auth/spec.md` (validated), and the change was moved to the archive. |

---

## For AI agents

Follow this exactly. If anything here conflicts with a direct user instruction, the user wins; ask if unsure.

1. **Read first:** `AGENTS.md`, then the relevant parts of `architecture.md`, then `openspec list --specs` and the specs relevant to the task. Behavior questions are answered by `openspec/specs/` first and `features-spec.md` second. Where the docs and the code disagree, the code is current; point out the mismatch.
2. **No unplanned behavior changes.** Any feature or behavior change goes through Step 3. Without an approved change in `openspec/changes/`, don't build it. Pure refactors and docs may skip specs (`skip_specs: true`), but say so.
3. **Stop at every gate** (design, proposal, scope/design deviation, pre-archive verification) and ask a direct question. Answers to questions are not permission to write files outside the agreed scope.
4. **UI:**
   - only `src/components/ui` + `components/layout` + token classes from `globals.css`
   - missing primitive → propose adding it to the library first
   - never raw hex values or one-off styled elements in features
5. **Server:** keep the layers (route → service → repository). Run `pnpm check` before claiming anything works.
6. **Verify honestly:**
   - run the task's verification
   - report failures with their output
   - never tick a task you didn't verify
   - say plainly which checks need a human (real OAuth, payments, visual review)
7. **Never:**
   - enter real passwords or secrets
   - print secret values (check whether they're set, not what they are)
   - commit, push or delete data without being asked
   - leave test data behind; clean up what you created
8. **Finish** each feature with Step 5, then report: what changed, how it was verified, what a human still needs to check, and where the archive is.

---

## Commands reference

| Purpose | Command |
|---|---|
| Dev server | `pnpm dev` |
| Lint / typecheck / tests | `pnpm lint` · `pnpm typecheck` · `pnpm test` · **`pnpm check`** (all three) |
| Database | `pnpm db:generate` (after changing a table; commit the migration) · `pnpm db:migrate` · `pnpm db:seed` |
| Docker | `docker compose up -d --build` · `docker compose ps` · `docker compose logs web` |
| Specs (current truth) | `openspec list --specs` · `openspec show <spec> --type spec` |
| Changes (in flight) | `openspec list` · `openspec status --change <name>` · `openspec show <name>` |
| Create / validate a change | `openspec new change "<name>"` · `openspec validate <name> --strict` |
| Apply progress | `openspec instructions apply --change <name> --json` |
| Archive | `openspec archive <name>` (or the `openspec-archive-change` skill) |
| Agent skills | `openspec-explore` · `openspec-propose` · `openspec-apply-change` · `openspec-update-change` · `openspec-sync-specs` · `openspec-archive-change` |
| Install/refresh agent skills | `openspec init --tools <tool>` (e.g. `claude`) · `openspec update` |

---

## Known gaps

- **Behavior not yet in OpenSpec.** Most of it (catalog, bookings, admin, finance, email/password auth) is still described only in `features-spec.md`. Migrating it into `openspec/specs/` one capability at a time is a good first change for newcomers.
- **No email verification or password reset.** That's why Google sign-in doesn't link to existing password accounts (see the `user-auth` spec).
- **No end-to-end browser tests.** Playwright is planned but not installed, so browser-only checks are currently manual.
