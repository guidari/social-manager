# PostPilot — MVP Engineering Delivery Plan

**Companion to:** `PostPilot Engineering Spec` · `PostPilot Database Schema` · `PostPilot API Contract` · `PostPilot Component Inventory`
**Purpose:** Break the MVP into epics, user stories, and sequenced implementation tickets a small startup team (assume 2 full-stack engineers + 1 part-time designer) can execute in order, with explicit dependencies and acceptance criteria per ticket.

---

## How to Read This Plan

Each of the 11 groups below is one **Epic** (or two closely related epics where a group is large). Every epic lists its **user stories** (the "why," in product terms) and then a sequenced set of **tickets** (the "how," implementation-sized — roughly 0.5–2 days each for a mid-level engineer). Tickets carry explicit `Depends on:` references to other ticket IDs; a ticket with no unmet dependency is workable immediately once its group is reached. Groups themselves are already in build order — later groups assume everything in earlier groups is done, with one exception: Group 9 (Polish/QA) is numbered where it historically sat, but it "cuts across everything" and its final hardening tickets (QA-902, QA-906, QA-907) don't actually close out until Groups 10–11 (Content Library, Settings) land too — see each ticket's `Depends on:`.

**Ticket ID prefixes:** `AUTH` (App Shell/Auth) · `DB` (Database & Models) · `ACCT` (Account Integrations) · `COMP` (Composer) · `SCHED` (Scheduling) · `CAL` (Calendar) · `ANLY` (Analytics) · `REC` (Recommendations) · `QA` (Polish/QA/Observability) · `LIB` (Content Library) · `SET` (Settings).

---

## Build Order Overview

1. **App Shell / Auth** — nothing to build on top of yet; must exist first.
2. **Database & Models** — every later group persists through this; do it right before any domain feature.
3. **Account Integrations** — composer and scheduling need a real connected account to publish to.
4. **Composer** — needs accounts (2) and models (2) to create real drafts.
5. **Scheduling** — needs a working composer (4) to have something to schedule.
6. **Calendar** — needs scheduling (5) to have anything to visualize/move.
7. **Analytics** — needs published posts flowing through scheduling (5) to have metrics to ingest.
8. **Recommendations** — needs analytics (7) as its data source.
9. **Polish / QA / Observability** — cuts across everything; runs continuously but hardens in a final pass before launch, *after* groups 10–11 land.
10. **Content Library** — needs Composer (4) for post data and Analytics (7) for performance tags; otherwise independent of Scheduling/Calendar/Recommendations.
11. **Settings** — needs Auth/Workspace (1) for Profile/Team, Account Integrations (3) for Billing's usage count, Scheduling (5) for Publishing Defaults, and Recommendations (8) for AI tuning.

---

## 1 · App Shell / Auth

**Epic:** As a new user, I can create an account, log in, and land inside a working (empty) authenticated app shell, so that every later feature has somewhere to live.

**Depends on:** nothing — this is the starting point.

**User stories:**
- As a visitor, I can sign up with email/password and immediately land in the app.
- As a returning user, I can log in and see my workspace.
- As any authenticated user, I see a consistent Sidebar/TopBar shell around every page so navigation feels stable while features are added incrementally.

### AUTH-101 — Repo, CI, and environment scaffold
**Type:** Implementation ticket
**Details:** Initialize Next.js 14 App Router + TypeScript strict project; set up ESLint/Prettier; configure CI (lint, typecheck, build) on PR; provision dev/staging Postgres + Redis.
**Acceptance criteria:**
- `main` branch has passing CI on an empty app.
- `.env.example` documents every required variable.
- A PR against `main` blocks merge on lint/typecheck/build failure.
**Depends on:** none.

### AUTH-102 — Design tokens & shared UI primitives
**Type:** Implementation ticket
**Details:** Install Tailwind + shadcn/ui; wire the PostPilot palette (`#3D5AFE` primary, `#FAF9F7` surface) and Inter font; build the 12 Shared Form Components (Button, TextInput/TextArea, Select, DatePicker/TimePicker, Toggle, Tabs, Modal, Sheet, Toast, Skeleton, Badge, EmptyState) per the Component Inventory.
**Acceptance criteria:**
- Each shared component renders in isolation (Storybook or a `/dev/components` route) with its documented prop variants.
- Components match the props/behavior specified in `PostPilot Component Inventory.md` §10.
**Depends on:** AUTH-101.

### AUTH-103 — User & session auth (email/password)
**Type:** Implementation ticket
**Details:** Implement `users` table (per DB schema), signup/login/logout routes, httpOnly session cookie, password hashing (bcrypt/argon2).
**Acceptance criteria:**
- `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout` behave exactly per `PostPilot API Contract.md` §1, including error codes.
- Session cookie is httpOnly + Secure + SameSite=Lax; no token is ever readable from client JS.
- Wrong-password and wrong-email both return the same generic `401` message.
**Depends on:** AUTH-101.

### AUTH-104 — Workspace + membership model & `can()` policy
**Type:** Implementation ticket
**Details:** Implement `workspaces` and `workspace_members` tables; a workspace is auto-created on signup with the creator as `owner`; implement the `can(user, action, resource)` policy helper used by every subsequent API route.
**Acceptance criteria:**
- New signup produces exactly one workspace with the user as `owner`.
- `can()` is unit-tested for all four roles × the core actions (view, edit, publish, manage-accounts, billing).
- Attempting an action outside a role's grant returns `403 FORBIDDEN` from an API route, never a silent no-op.
**Depends on:** AUTH-103.

### AUTH-105 — Authenticated app shell (Sidebar, TopBar, routing)
**Type:** Implementation ticket
**Details:** Build `AppShell`, `Sidebar`, `TopBar`, `PageContainer` per Component Inventory §1; wire the 8 route stubs (`/app`, `/app/create`, `/app/calendar`, `/app/library`, `/app/analytics`, `/app/recommendations`, `/app/accounts`, `/app/settings`) as empty pages behind auth.
**Acceptance criteria:**
- Visiting any `/app/*` route while logged out redirects to `/login`.
- Sidebar highlights the active route; collapses to icon rail under the tablet breakpoint per spec.
- All 8 routes render without error (empty-state placeholder is fine at this stage).
**Depends on:** AUTH-102, AUTH-104.

### AUTH-106 — Onboarding flow (timezone + first-run redirect)
**Type:** Implementation ticket
**Details:** `/onboarding` route: set workspace default timezone, then redirect toward Account connection (stub link until group 3 lands).
**Acceptance criteria:**
- First login after signup routes through `/onboarding` before `/app`.
- Timezone selection persists to `workspaces.default_timezone`.
- Returning users skip onboarding.
**Depends on:** AUTH-105.

### AUTH-107 — Signup / register page
**Type:** Implementation ticket
**Details:** `/signup` route (email, password, name) mirroring `/login`; on success, redirects to `/onboarding`.
**Acceptance criteria:** field-level and conflict errors surface like `/login`'s; `/login`↔`/signup` cross-link; already-logged-in visitors are redirected to `/app`.
**Depends on:** AUTH-102, AUTH-103.

### AUTH-108 — Password reset + email verification
**Type:** Implementation ticket
**Details:** `/forgot-password` + `/reset-password?token=` routes and endpoints with short-lived single-use tokens; stands up a minimal transactional email provider (reused later for notification work); email-verification banner + link.
**Acceptance criteria:**
- Known and unknown emails get an identical generic response from forgot-password (no account enumeration).
- Reset links expire quickly and are single-use; completing a reset invalidates other active sessions.
**Depends on:** AUTH-103.

### AUTH-109 — WorkspaceSwitcher + MobileNavDrawer
**Type:** Implementation ticket
**Details:** Fills the Component Inventory §2 (Navigation) gap AUTH-105 left open: `WorkspaceSwitcher` (multi-membership dropdown off `GET /me`) and `MobileNavDrawer` (the real slide-in nav below the mobile breakpoint, not just the icon rail).
**Acceptance criteria:**
- A 2+-workspace user can switch active workspace from the Sidebar.
- Below the mobile breakpoint, a slide-in drawer replaces the Sidebar, matching QA-906's documented collapse behavior.
**Depends on:** AUTH-105.

---

## 2 · Database & Models

**Epic:** As the engineering team, we have the full Prisma schema and migrations in place before any domain feature is built, so nothing gets re-modeled mid-flight.

**Depends on:** AUTH-104 (workspaces/users must exist first — this epic adds everything else from `PostPilot Database Schema.md`).

**User stories:**
- As a developer, I can run one migration command on a fresh environment and get the complete MVP schema.
- As a developer, I have typed Prisma Client access to every entity before writing the first domain API route.

### DB-201 — Full Prisma schema + migration
**Type:** Implementation ticket
**Details:** Author the complete `schema.prisma` from `PostPilot Database Schema.md` (all 13 tables, enums, indexes, constraints); generate and run the initial migration against dev/staging.
**Acceptance criteria:**
- `prisma migrate dev` succeeds from a clean database.
- All 13 tables exist with the exact columns/types/indexes/constraints documented in the schema doc.
- `prisma generate` produces a typed client with no `any` escapes needed in application code.
**Depends on:** AUTH-104.

### DB-202 — Seed script for local/dev data
**Type:** Implementation ticket
**Details:** Script that seeds a demo workspace with a user, two mock `social_accounts` (unconnected), a few `content_drafts` in various statuses, and sample `analytics_snapshots`/`recommendation_summaries` for UI development before real integrations exist.
**Acceptance criteria:**
- `npm run seed` populates a usable demo workspace in under 10 seconds.
- Seeded data covers every `status` enum value at least once (so empty/loading/error UI can be dev-tested against real shapes).
**Depends on:** DB-201.

### DB-203 — Encryption helper for `account_tokens`
**Type:** Implementation ticket
**Details:** Implement the encrypt/decrypt utility (KMS or libsodium-based) used to store `access_token_enc`/`refresh_token_enc`; never expose plaintext tokens through any serializer.
**Acceptance criteria:**
- Tokens are unreadable in a raw DB dump (encrypted at rest).
- A unit test confirms `account_tokens` fields never appear in any API response serializer, even for `owner`/`admin` roles.
**Depends on:** DB-201.

### DB-204 — Settings schema additions (weights, publishing defaults, notification prefs)
**Type:** Implementation ticket
**Details:** Adds the nullable columns Group 11 (Settings) needs that weren't in DB-201's original 13-table scope: `workspaces.recommendation_weights` (jsonb), `workspaces.recommendation_history_window_days` (int), `workspaces.default_publish_mode` (enum), `workspaces.auto_apply_recommended` (boolean), `users.notification_preferences` (jsonb).
**Acceptance criteria:** migration adds all 5 columns with sensible defaults; existing rows and reads are unaffected.
**Depends on:** DB-201.

---

## 3 · Account Integrations

**Epic:** As a creator, I can connect my YouTube and TikTok accounts and see their connection health, so PostPilot has somewhere to publish and pull analytics from.

**Depends on:** DB-201, DB-203, AUTH-105 (Accounts page needs the shell).

**User stories:**
- As a user, I can connect a YouTube channel via OAuth and see it listed with a healthy status.
- As a user, I can connect a TikTok account the same way.
- As a user, if a connection breaks (expired token), I'm told clearly and can reconnect in one click.

### ACCT-301 — `PlatformAdapter` interface
**Type:** Implementation ticket
**Details:** Define the common interface (`connect`, `handleCallback`, `publish`, `fetchMetrics`, `refreshToken`) that both provider adapters implement, per Engineering Spec §5.
**Acceptance criteria:**
- Interface is provider-agnostic (no YouTube/TikTok-specific types leak into the interface itself).
- A no-op mock adapter passes the interface's type checks, usable in tests before real credentials exist.
**Depends on:** DB-201.

### ACCT-302 — YouTube OAuth connect/callback
**Type:** Implementation ticket
**Details:** Implement `GET /accounts/youtube/connect` and `/callback` (Google OAuth 2.0 + PKCE, `access_type=offline`); store encrypted tokens via DB-203; create/update the `social_accounts` row.
**Acceptance criteria:**
- Full OAuth round trip connects a real YouTube channel in a test Google Cloud project.
- Denied consent redirects back to `/app/accounts?error=access_denied` without crashing.
- Reconnecting the same channel updates the existing row rather than duplicating it (unique constraint from DB-201 enforced).
**Depends on:** ACCT-301, DB-203.

### ACCT-303 — TikTok OAuth connect/callback
**Type:** Implementation ticket
**Details:** Same shape as ACCT-302 for TikTok Login Kit (`video.upload`/`video.publish`, `user.info.basic` scopes).
**Acceptance criteria:** mirrors ACCT-302's three criteria for TikTok.
**Depends on:** ACCT-301, DB-203.

### ACCT-304 — Token-refresh background job
**Type:** Implementation ticket
**Details:** BullMQ repeatable job that refreshes tokens ahead of `expires_at`; flags `social_accounts.status = needs_review` after repeated failure.
**Acceptance criteria:**
- A token artificially set to expire in 5 minutes is refreshed automatically without user action.
- After 3 consecutive refresh failures, account flips to `needs_review` and an `audit_logs` row is written.
**Depends on:** ACCT-302, ACCT-303.

### ACCT-305 — Accounts page UI
**Type:** Implementation ticket
**Details:** Build `ConnectionCard`, `ComingSoonPlatformCard`, `OAuthConnectButton`, `AccountHealthBadge` per Component Inventory §8; wire to `GET/POST/DELETE /accounts*` per API Contract §2.
**Acceptance criteria:**
- Connect/reconnect/disconnect/test flows work end-to-end against ACCT-302/303/304.
- Disconnect with active scheduled posts shows the confirm dialog listing affected posts (per API Contract's `409` + `force` pattern) before it's built in group 5 — for now, confirm dialog appears but the "affected posts" list is empty until Scheduling exists; ticket is still completable and re-verified in QA-903.
**Depends on:** ACCT-302, ACCT-303, ACCT-304, AUTH-102.

### ACCT-306 — Complete onboarding account-connection step
**Type:** Implementation ticket
**Details:** Replaces AUTH-106's "stub link until group 3 lands" with a real embedded connect step: `OAuthConnectButton`s for YouTube + TikTok inline in `/onboarding`, plus a "skip for now" path.
**Acceptance criteria:** connecting from onboarding updates `social_accounts` identically to connecting later from `/app/accounts`; skipping still lands on `/app`.
**Depends on:** AUTH-106, ACCT-302, ACCT-303.

---

## 4 · Composer

**Epic:** As a creator, I can upload one video, customize it per platform, and publish it immediately to YouTube and/or TikTok, so PostPilot delivers its core "publish once, adapt everywhere" value before scheduling even exists.

**Depends on:** ACCT-302, ACCT-303 (need real accounts to publish to), DB-201.

**User stories:**
- As a user, I can drag a video into the composer and watch it upload with progress.
- As a user, I can write one caption and adjust it per platform without retyping.
- As a user, I can publish immediately to both platforms in one action.
- As a user, I'm warned (not blocked) about soft issues like an over-length TikTok caption.

### COMP-401 — Media presign/upload pipeline
**Type:** Implementation ticket
**Details:** `POST /media/presign`, `POST /media/:id/complete`, `GET /media/:id`; S3 multipart presigned URLs; `media-probe` job (ffprobe) on completion.
**Acceptance criteria:**
- A 200MB test video uploads via resumable multipart and reaches `status: ready` with correct `durationSec`/`width`/`height`.
- Interrupting and resuming an upload (simulated network drop) completes without corrupting the file.
**Depends on:** DB-201.

### COMP-402 — `MediaDropzone` component
**Type:** Implementation ticket
**Details:** Client component wrapping uppy/tus against COMP-401; drag-over state, progress bar, thumbnail preview once processed.
**Acceptance criteria:** matches Component Inventory's `MediaDropzone` prop contract; visibly reflects `uploading` → `processing` → `ready`/`failed`.
**Depends on:** COMP-401, AUTH-102.

### COMP-403 — `content_drafts` CRUD
**Type:** Implementation ticket
**Details:** `POST/GET/PATCH/DELETE /posts`, `POST /posts/:id/duplicate` per API Contract §3.
**Acceptance criteria:**
- Creating a draft with only `internalTitle` succeeds (media/platforms optional at creation).
- `PATCH` updates persist and are reflected on next `GET`.
- Duplicate produces a new draft with `status: draft` and no target rows.
**Depends on:** DB-201.

### COMP-404 — Base content form + autosave
**Type:** Implementation ticket
**Details:** `BaseContentForm` (title/caption/tags/campaign) with react-hook-form + Zod; debounced autosave to COMP-403's `PATCH`.
**Acceptance criteria:**
- Typing in any field triggers a save within ~800ms of the user pausing, not on every keystroke.
- Validation error (missing internal title) shows inline and blocks downstream Schedule/Publish actions.
**Depends on:** COMP-403, AUTH-102.

### COMP-405 — Platform selector + per-platform field panels
**Type:** Implementation ticket
**Details:** `PlatformSelector`, `PlatformFieldPanel` (YouTube + TikTok variants) per Component Inventory §4; overrides persisted via COMP-403's target-level `PATCH`.
**Acceptance criteria:**
- Toggling a platform on reveals its panel; toggling off preserves entered overrides in state (not discarded) in case re-enabled, per the documented edge case.
- YouTube panel enforces title 1–100 chars + required made-for-kids boolean before it validates green; TikTok panel enforces caption ≤2200 with a soft warning above 150.
**Depends on:** COMP-404.

### COMP-406 — `SmartAdaptationPanel` (rule-based warnings)
**Type:** Implementation ticket
**Details:** Heuristic (non-ML) warning generator: caption-too-long, missing-title, aspect-ratio-mismatch, identical-copy-across-platforms.
**Acceptance criteria:**
- Each of the 4 documented warning types triggers correctly against representative test inputs.
- Warnings are dismissible per session and never block Publish/Schedule (soft only).
**Depends on:** COMP-405.

### COMP-407 — Platform preview
**Purpose ticket for `PlatformPreview` component.**
**Acceptance criteria:**
- Switching the preview tab shows a visually distinct, recognizable-as-YouTube vs. recognizable-as-TikTok mock using the current merged content.
**Depends on:** COMP-405.

### COMP-408 — Publish-now flow
**Type:** Implementation ticket
**Details:** `POST /posts/:id/publish-now`; worker calls each `PlatformAdapter.publish()`; per-target independent success/failure (partial-publish case from Engineering Spec §5).
**Acceptance criteria:**
- Publishing to both platforms with one broken token still successfully publishes to the healthy one and marks only the broken target `failed` with a human-readable `failureReason`.
- Duplicate rapid-click (same `Idempotency-Key`) does not create two publish attempts.
**Depends on:** COMP-406, ACCT-301, ACCT-304.

---

## 5 · Scheduling

**Epic:** As a creator, I can schedule a post for a future time (instead of publishing immediately) and trust it will actually go out, so I can plan content in advance.

**Depends on:** COMP-408 (needs a working immediate-publish path to extend into delayed publish).

**User stories:**
- As a user, I can pick a future date/time and have my post publish automatically then.
- As a user, I can reschedule or cancel a scheduled post before it fires.
- As the system, a server restart or downtime never causes a scheduled post to be silently dropped.

### SCHED-501 — `scheduled_posts` lifecycle + delayed publish queue
**Type:** Implementation ticket
**Details:** Extend COMP-408's target model into full BullMQ delayed-job scheduling (`schedule(target)` pattern from Engineering Spec §3.4); idempotent `jobId = scheduled_post.id`.
**Acceptance criteria:**
- A post scheduled 2 minutes out publishes automatically without further user action.
- Restarting the worker process mid-wait does not lose or double-fire the job.
**Depends on:** COMP-408, DB-201.

### SCHED-502 — Sweeper cron (missed-job safety net)
**Type:** Implementation ticket
**Details:** Minute-interval cron that catches any `status=scheduled && scheduledAt<=now` row without a corresponding live job (covers worker downtime).
**Acceptance criteria:**
- Simulated downtime (worker paused past a post's scheduled time) results in the post publishing within 1 minute of the worker resuming, not silently stuck in `scheduled`.
**Depends on:** SCHED-501.

### SCHED-503 — Schedule / reschedule / cancel endpoints
**Type:** Implementation ticket
**Details:** `POST /posts/:id/schedule`, `PATCH /targets/:id/reschedule`, `POST /targets/:id/cancel` per API Contract §5.
**Acceptance criteria:**
- Scheduling in the past or inside the platform's minimum lead time returns `422` with a field-level message.
- Cancel on an already-`publishing` target returns `409`, not a silent no-op.
**Depends on:** SCHED-501.

### SCHED-504 — `ScheduleControl` composer component
**Type:** Implementation ticket
**Details:** Now/Draft/Schedule mode picker + date/time/timezone inputs wired to SCHED-503.
**Acceptance criteria:** matches documented props; blocks submission client-side on the same rules SCHED-503 enforces server-side (defense in depth, not the only check).
**Depends on:** SCHED-503, AUTH-102.

### SCHED-505 — Publishing-jobs audit trail
**Type:** Implementation ticket
**Details:** Write a `publishing_jobs` row per attempt (per DB schema §10); surface latest attempt's failure reason in the UI.
**Acceptance criteria:**
- Every publish attempt (immediate or scheduled) produces a `publishing_jobs` row with correct `attempt`/`status`/timestamps.
- A failed publish's `error_message` is human-readable in the Calendar detail drawer (built in group 6).
**Depends on:** SCHED-501.

---

## 6 · Calendar

**Epic:** As a creator, I can see everything scheduled across both platforms on a calendar and rearrange it visually, so planning a content cadence doesn't require reading a list of dates.

**Depends on:** SCHED-501, SCHED-503 (nothing to display or move without real scheduled posts).

**User stories:**
- As a user, I can see a month view of everything scheduled, in progress, or published.
- As a user, I can drag a post to a new day/time and have it actually reschedule.
- As a user, I can filter the calendar by platform, status, or campaign.
- As a user, I can click a post to see its details and edit/duplicate/cancel it.

### CAL-601 — `GET /calendar` range endpoint
**Type:** Implementation ticket
**Details:** Per API Contract §5, grouped-by-day response for a date range, with platform/status/campaign filters.
**Acceptance criteria:**
- Requesting a 31-day month range returns all `scheduled_posts` in range grouped correctly by local calendar day in the workspace timezone.
- Range >90 days returns `422`.
**Depends on:** SCHED-501.

### CAL-602 — `CalendarGrid` + `PostChip` (month view, read-only)
**Type:** Implementation ticket
**Details:** Render month grid with day cells and `PostChip`s from CAL-601; no drag yet.
**Acceptance criteria:** visually matches spec (thumb, time, platform badge, status color) for every status value from the DB-202 seed data.
**Depends on:** CAL-601, AUTH-102.

### CAL-603 — Drag-to-reschedule
**Type:** Implementation ticket
**Details:** Add drag/drop to CAL-602; on drop, optimistic move + call SCHED-503's `PATCH /targets/:id/reschedule`; revert on error.
**Acceptance criteria:**
- Dragging a post to a new valid day updates it in the DB and the UI does not flicker back.
- Dragging onto an invalid target (past date, or a `published`/`failed` post) is either prevented client-side or reverts cleanly on the server's `409`/`422`.
**Depends on:** CAL-602, SCHED-503.

### CAL-604 — Week + agenda views
**Type:** Implementation ticket
**Details:** `CalendarViewSwitcher` + week/agenda render modes reusing CAL-601's data.
**Acceptance criteria:** switching views preserves the current filters and does not re-fetch unnecessarily broad ranges.
**Depends on:** CAL-602.

### CAL-605 — Filter bar
**Type:** Implementation ticket
**Details:** `CalendarFilterBar` (platform/status/campaign), URL-synced.
**Acceptance criteria:** filter state survives a page refresh (URL params), and combining 2+ filters is an AND, not an OR.
**Depends on:** CAL-602.

### CAL-606 — `PostDetailDrawer`
**Type:** Implementation ticket
**Details:** Side drawer: full preview, scheduled time, target platforms, Edit → composer / Duplicate / Cancel, and — per SCHED-505 — the failure reason if the target failed.
**Acceptance criteria:** all four documented actions work; Cancel is disabled with a tooltip explanation for non-cancelable statuses.
**Depends on:** CAL-602, SCHED-505.

### CAL-607 — Recommended-window highlighting (stub until group 8)
**Type:** Implementation ticket
**Details:** Overlay component wired to the `/recommendations` endpoint; ship as a no-op (renders nothing) until group 8 delivers real data — avoids a rework later.
**Acceptance criteria:** component renders without error when the recommendations endpoint returns an empty/cold-start payload.
**Depends on:** CAL-602.

---

## 7 · Analytics

**Epic:** As a creator, I can see how my published content is performing across both platforms in one place, so I know what's working.

**Depends on:** SCHED-501 (need published posts to have anything to measure).

**User stories:**
- As a user, I can see total views, engagement, and trends over a date range.
- As a user, I can compare performance to the previous period.
- As a user, I can see a sortable table of individual post performance.
- As a user, I understand when data is stale or a platform doesn't expose a given metric, instead of seeing a wrong number.

### ANLY-701 — `analytics_snapshots` ingestion job
**Type:** Implementation ticket
**Details:** `analytics-sync` repeatable BullMQ job on the decaying cadence (t+1h/+3h/+12h/+24h, then daily); calls each `PlatformAdapter.fetchMetrics()`; writes immutable snapshot rows.
**Acceptance criteria:**
- A freshly published test post accrues at least one snapshot within its first sync window.
- Re-running the job for the same post/timestamp does not create a duplicate row (unique constraint from DB-201 holds).
**Depends on:** SCHED-501, ACCT-301.

### ANLY-702 — Nightly rollup job
**Type:** Implementation ticket
**Details:** Aggregates snapshots into per-post latest + per-workspace daily totals for fast dashboard reads.
**Acceptance criteria:** a workspace with 100+ snapshot rows still loads the Dashboard's KPI cards in under 300ms server-side.
**Depends on:** ANLY-701.

### ANLY-703 — `GET /analytics/overview` + `/timeseries` + `/posts`
**Type:** Implementation ticket
**Details:** Three read endpoints per API Contract §6, backed by ANLY-702's rollups (overview/timeseries) and raw snapshots (posts table).
**Acceptance criteria:** matches the documented response shapes exactly, including `deltas` only appearing when `compare=true`, and zero-data returning `200` with zeroed KPIs (never treated as an error).
**Depends on:** ANLY-702.

### ANLY-704 — Analytics page UI
**Type:** Implementation ticket
**Details:** `AnalyticsFilterBar`, `TrendChartCard` ×2, `PlatformComparisonBar`, `PostPerformanceTable`, `StatCard` ×5 per Component Inventory §6.
**Acceptance criteria:**
- Changing platform/date-range/compare updates all widgets consistently from one set of query params.
- Stale-data badge appears when `lastSyncedAt` on any connected account is >24h old.
**Depends on:** ANLY-703, AUTH-102.

### ANLY-705 — Dashboard performance snapshot (reuses ANLY components)
**Type:** Implementation ticket
**Details:** `PerformanceSnapshot` + `QuickInsightsPanel` on `/app`, reusing `TrendChartCard` and rule-derived insight strings from ANLY-703 data.
**Acceptance criteria:** Dashboard's mini trend chart and Analytics page's full trend chart never disagree on the same date range (same underlying endpoint).
**Depends on:** ANLY-703.

---

## 8 · Recommendations

**Epic:** As a creator, I'm told the best times to post based on my own performance history, so scheduling is a data-informed decision instead of a guess — the product's core differentiator.

**Depends on:** ANLY-701 (needs real snapshot history as its input signal).

**User stories:**
- As a user, I can see the single best time to post per platform and combined.
- As a user, I can see a full heatmap of scores across the week.
- As a user, I understand why a time is recommended (not a black box).
- As a new user without enough history yet, I still get a reasonable benchmark-based suggestion instead of a blank page.
- As a user, I can apply a recommended time directly into a draft's schedule with one click.

### REC-801 — Recompute job (heuristic scoring)
**Type:** Implementation ticket
**Details:** Weekly + on-demand BullMQ job implementing the bucketing/scoring/confidence/combined-slot algorithm from Engineering Spec §3.6; writes `recommendation_summaries` rows.
**Acceptance criteria:**
- Given a seeded set of snapshots with a clear best hour, the job's top-scoring cell matches the expected hour in a unit test.
- Sparse cells (1–2 posts) are visibly shrunk toward the platform mean rather than producing a false 100% confidence score.
- If a workspace has set `workspaces.recommendation_weights`/`recommendation_history_window_days` (DB-204), the job uses those; otherwise it falls back to the spec's default weights (no regression for workspaces that never touch SET-906).
**Depends on:** ANLY-701, DB-201, DB-204.

### REC-802 — Cold-start benchmark seeding
**Type:** Implementation ticket
**Details:** Static per-category benchmark constants used when a workspace's own sample size is below threshold; `is_cold_start` flag set accordingly.
**Acceptance criteria:** a brand-new workspace with zero published posts still gets a `best` slot back from `GET /recommendations`, clearly flagged `isColdStart: true`.
**Depends on:** REC-801.

### REC-803 — `GET /recommendations` + `/apply` + `/export`
**Type:** Implementation ticket
**Details:** Per API Contract §7; `/apply` resolves a (day, hour) to a concrete next-occurrence datetime without itself scheduling (frontend still calls SCHED-503).
**Acceptance criteria:** matches documented response shapes; `combined` platform returns `403 INSUFFICIENT_PLATFORMS` when fewer than 2 accounts are connected.
**Depends on:** REC-802.

### REC-804 — Recommendations page UI
**Type:** Implementation ticket
**Details:** `BestTimeCard` ×3, `HeatmapGrid`, `PlatformTabs`, `CalculationExplainer`, `RecommendedActionsList` per Component Inventory §7.
**Acceptance criteria:**
- Heatmap hover shows exact score/confidence/sample size per cell.
- Cold-start state visibly labels itself "based on general benchmarks."
**Depends on:** REC-803, AUTH-102.

### REC-805 — Dashboard `BestTimeHero`
**Type:** Implementation ticket
**Details:** Compact 3-slot hero on `/app` reusing REC-803's data; clicking a slot navigates to the composer with the time prefilled via REC-803's `/apply`.
**Acceptance criteria:** clicking "Schedule at this time" lands in the composer with `ScheduleControl` pre-populated and still passes through SCHED-503's normal validation.
**Depends on:** REC-803, COMP-408, SCHED-504.

### REC-806 — Wire `RecommendedWindowOverlay` (completes CAL-607)
**Type:** Implementation ticket
**Details:** Replace CAL-607's stub with real heatmap data.
**Acceptance criteria:** Calendar cells within a high-confidence window show the documented subtle highlight, verified visually against REC-801's output for a seeded workspace.
**Depends on:** REC-803, CAL-607.

### REC-807 — "Use recommended time" in composer
**Type:** Implementation ticket
**Details:** Shortcut button inside `ScheduleControl` (SCHED-504) that pulls the top slot from REC-803.
**Acceptance criteria:** one click fills in a valid future datetime that passes SCHED-503's validation without further editing.
**Depends on:** REC-803, SCHED-504.

---

## 9 · Polish / QA / Observability

**Epic:** As the team preparing to launch, we have confidence the MVP is stable, monitorable, and handles its documented edge cases — this group runs partly in parallel with 3–8 but has a dedicated hardening pass before launch.

**Depends on:** all of groups 1–8 for the final hardening tickets; individual tickets below note lighter dependencies where they can start earlier.

**User stories:**
- As an engineer, I get paged/notified before users notice something is broken.
- As a user, every documented empty/loading/error state actually appears correctly, not just in the happy path.
- As the team, we know the app performs acceptably with realistic data volumes before real users hit it.

### QA-901 — Error boundaries + Suspense loading states
**Type:** Implementation ticket
**Details:** Page-level error boundaries with retry; per-widget Suspense boundaries so one failed panel doesn't blank a whole page, per the Implementation Checklist's state matrix.
**Acceptance criteria:** killing one API endpoint in dev shows only its widget in an error state; the rest of the page still renders.
**Depends on:** AUTH-105 (can start once the shell exists; verified per-page as each group lands).

### QA-902 — Empty-state audit
**Type:** Implementation ticket
**Details:** Verify every documented empty state (Dashboard, Composer, Calendar, Library, Analytics, Recommendations cold-start, Accounts, Settings Team tab) against a fresh zero-data workspace.
**Acceptance criteria:** all 8 documented empty states render with the correct copy and CTA from the Implementation Checklist — checked off one by one against that doc.
**Depends on:** groups 3–8 complete, plus group 10 (Content Library) and group 11 (Settings) — this ticket can't check the Library or Settings-Team-tab empty states before those groups exist.

### QA-903 — Cross-domain edge cases
**Type:** Implementation ticket
**Details:** Re-verify the specific edge cases called out across earlier docs that depend on multiple groups together: disconnect-with-scheduled-posts confirm dialog (ACCT-305 revisited), partial multi-platform publish (COMP-408), token-expiry banner cascading to Dashboard/Accounts (ACCT-304).
**Acceptance criteria:** each cross-domain edge case has a passing manual or automated test.
**Depends on:** ACCT-305, COMP-408, ACCT-304, SCHED-501.

### QA-904 — Logging & error tracking
**Type:** Implementation ticket
**Details:** Structured logging on the API + worker; error tracking (e.g. Sentry) wired to both processes; alert on `publish` job final-failure rate and token-refresh failure rate.
**Acceptance criteria:** a forced publish failure in staging appears in the error tracker within seconds with the `scheduled_post_id` attached for traceability.
**Depends on:** AUTH-101.

### QA-905 — Ops dashboard (internal)
**Type:** Implementation ticket
**Details:** Minimal internal view (or a Grafana/Metabase board, not necessarily in-app) of queue depth, job success/failure rates, active workspaces, connected-account health across all workspaces.
**Acceptance criteria:** an on-call engineer can answer "is publishing healthy right now" in under 30 seconds without querying the DB by hand.
**Depends on:** SCHED-505, ACCT-304.

### QA-906 — Responsive pass
**Type:** Implementation ticket
**Details:** Verify the documented responsive collapse behavior (sidebar → icon rail → drawer, tables → stacked cards, calendar → agenda) across all 8 routes at tablet and mobile widths.
**Acceptance criteria:** no horizontal scroll or clipped content on any route at 375px and 768px widths; the drawer collapse specifically requires AUTH-109.
**Depends on:** groups 1–8 complete, AUTH-109, plus group 10 (Content Library) and group 11 (Settings).

### QA-907 — Load/volume sanity check
**Type:** Implementation ticket
**Details:** Seed a workspace with ~500 posts and ~5,000 analytics snapshots; verify Calendar, Library, and Analytics pages remain responsive (cursor pagination actually used, no full-table scans).
**Acceptance criteria:** all three pages load in under 1.5s server-response time against the seeded volume.
**Depends on:** CAL-601, ANLY-703, COMP-403, LIB-901.

### QA-908 — Pre-launch security pass
**Type:** Implementation ticket
**Details:** Confirm `can()` policy coverage on every route (no route trusts a client-supplied role), confirm token encryption (DB-203) holds under a raw DB dump, confirm rate limiting on `/auth/login` and publish/schedule mutations.
**Acceptance criteria:** a scripted audit hitting every documented API endpoint with a wrong-role session receives `403` on every write route it shouldn't access.
**Depends on:** AUTH-104, DB-203, all domain API tickets.

### QA-909 — Global 404 / not-found pages
**Type:** Implementation ticket
**Details:** Next.js `not-found.tsx` at the root and inside `/app/*` for bad/deleted resource ids (e.g. an invalid `draftId`), plus a branded 404 for unknown routes — distinct from QA-901's per-widget error boundaries, which cover failed data fetches, not missing resources/routes.
**Acceptance criteria:** a deleted/nonexistent draft id shows a friendly not-found state with a way back; an unknown route shows a branded 404, logged in or out.
**Depends on:** AUTH-105.

---

## 10 · Content Library

**Epic:** As a creator, I have a central place to browse, search, and reopen everything I've drafted, scheduled, or published, so content is reusable instead of buried in the Calendar or forgotten.

**Depends on:** COMP-403 (needs `content_drafts`/`GET /posts` as its data source), ANLY-703 (needs analytics for performance tags).

**User stories:**
- As a user, I can search and filter my content library by status/platform/campaign/date.
- As a user, I can see which of my posts are top performers or need per-platform adaptation.
- As a user, I can reopen any item into the composer, or duplicate it.

### LIB-901 — Content Library page (grid, search, filter bar, pagination)
**Type:** Implementation ticket
**Details:** `/app/library` per the Implementation Checklist: search input, filter bar (status/platform/type/campaign/date), content grid (PostCard variant), EmptyState — wired to the existing `GET /posts` (COMP-403); no new backend work.
**Acceptance criteria:**
- Search + filters combine as AND; cursor pagination is used, not offset.
- Item click opens the composer pre-filled; duplicate action available.
- Correct empty states for zero content vs. filtered-to-zero.
**Depends on:** COMP-403, AUTH-102.

### LIB-902 — Performance tags on Library items (top performer / needs adaptation)
**Type:** Implementation ticket
**Details:** Computed "top performer" (simple percentile rule over `GET /analytics/posts`, mock-in-v1 per the Checklist) and "needs adaptation" tags per item.
**Acceptance criteria:** tags derive from a single batched analytics lookup, not per-item calls; a workspace with no analytics history shows untagged items, not an error or a false positive.
**Depends on:** LIB-901, ANLY-703.

---

## 11 · Settings

**Epic:** As a user, I can manage my profile, workspace, team, notification preferences, billing, publishing defaults, and AI recommendation tuning in one place, so the product's configurable behavior has a home instead of being hardcoded or absent.

**Depends on:** AUTH-104 (Profile/Team need workspace + roles), DB-204 (settings columns), SCHED-504 (Publishing Defaults feeds ScheduleControl), REC-801 (AI tuning configures the recompute job).

**User stories:**
- As a user, I can edit my profile and workspace name.
- As an owner/admin, I can invite, remove, and change the role of teammates.
- As a user, I can control which notifications I receive.
- As a user, I can see my current plan and usage.
- As a user, I can set my default publish mode and whether recommended times auto-apply.
- As a user, I can tune the weighting the recommendation engine uses.

### SET-901 — Profile & Workspace settings tabs
**Type:** Implementation ticket
**Details:** `SettingsTabList` shell + `ProfileForm` + `WorkspaceForm` per Component Inventory §9; adds `PATCH /me` and `GET/PATCH /workspace`.
**Acceptance criteria:** deep-linking to a tab works; profile edits reflect in the TopBar immediately; non-owner/admin sees Workspace as read-only, not hidden.
**Depends on:** AUTH-104, AUTH-102.

### SET-902 — Team management tab
**Type:** Implementation ticket
**Details:** `TeamMembersTable` (invite/remove/change-role) per Component Inventory §9; `GET/POST/DELETE /workspace/members`. Invite email delivery may be stubbed per the Checklist, but the UI (pending state, resend/cancel) must be complete.
**Acceptance criteria:** last-owner protection (can't demote/remove the sole Owner); removed members lose access immediately.
**Depends on:** AUTH-104, SET-901.

### SET-903 — Notification preferences tab
**Type:** Implementation ticket
**Details:** `NotificationPreferences` toggle list per Component Inventory §9; `GET/PATCH /settings/notifications`, persisted to `users.notification_preferences` (DB-204).
**Acceptance criteria:** toggles persist immediately and survive a refresh. (Storage only — no delivery pipeline reads these yet; that's separate notification-delivery work.)
**Depends on:** SET-901, DB-204.

### SET-904 — Billing tab
**Type:** Implementation ticket
**Details:** `BillingPanel` per Component Inventory §9 — static plan summary + usage, mock in v1 (no live payment provider required); `GET /billing` reads `workspaces.plan`.
**Acceptance criteria:** plan + usage numbers match the DB; "Manage billing" behaves predictably even as a placeholder.
**Depends on:** SET-901.

### SET-905 — Publishing Defaults + Timezone tab
**Type:** Implementation ticket
**Details:** `PublishingDefaultsForm` (default mode, auto-apply-recommended) + timezone control per Component Inventory §9; `GET/PATCH /settings/publishing`, persisted to `workspaces.default_publish_mode`/`auto_apply_recommended` (DB-204). `ScheduleControl` reads these as new-draft defaults.
**Acceptance criteria:** a new composer draft starts in the configured default mode; auto-apply-recommended pre-fills schedule time from REC-803 and still validates.
**Depends on:** SET-901, DB-204, SCHED-504.

### SET-906 — AI Recommendation tuning tab
**Type:** Implementation ticket
**Details:** `AITuningPanel` (weighting sliders + history window) per Component Inventory §9; `GET/PATCH /settings/ai`, persisted via DB-204; REC-801 reads these overrides (see REC-801's amended acceptance criteria).
**Acceptance criteria:** saving new weights triggers an immediate recompute (not just the next weekly run); untouched workspaces see no change from today's hardcoded-weight behavior.
**Depends on:** SET-901, DB-204, REC-801.

---

## Dependency Graph (Group Level)

```
1 App Shell/Auth
   │
   ▼
2 Database & Models
   │
   ▼
3 Account Integrations
   │
   ▼
4 Composer ──────────────┬──────────────┐
   │                     │              │
   ▼                     │              │
5 Scheduling              │              │
   │                     │              │
   ▼                     │              │
6 Calendar                │  (7 also depends directly on 5,     │
   │                     │   not on 6 — Calendar and Analytics  │
   ▼                     │   can be built in parallel by two    │
7 Analytics ◄─────────────┘   engineers once Scheduling lands)  │
   │                                                            │
   ▼                                                            ▼
8 Recommendations                                    10 Content Library
   │                                                            │
   ▼                                                            │
11 Settings ◄────────────────────────────────────────────────────┘
   (needs 1, 3, 5, 8 — see Group 11's Depends on)
   │
   ▼
9 Polish / QA / Observability (numbered where it historically sat;
   its final hardening tickets — QA-902/906/907 — actually close
   out only after 10 and 11 above are done)
```

**Parallelization note for a 2-engineer team:** once group 5 (Scheduling) is done, one engineer can take group 6 (Calendar) while the other starts group 7 (Analytics) — neither depends on the other, only on Scheduling. Both must complete before group 8 (Recommendations), which needs Analytics's data and benefits from Calendar's highlight slot (REC-806) already stubbed.
