# PostPilot Engineering Specification
## Multi-Platform Social Publishing & Posting-Time Optimization SaaS

**Document version:** v1.0 (MVP)  
**Status:** Internal engineering use  
**Scope:** YouTube + TikTok, solo creator MVP

---

## 1. Product Structure

### 1.1 Route Map

| Route | Screen / Purpose | Auth |
|-------|------------------|------|
| `/login` · `/signup` | Auth entry, OAuth + email | public |
| `/onboarding` | First-run: connect accounts, timezone | member |
| `/app` (dashboard) | Home: KPIs, best-time hero, upcoming, insights | member |
| `/app/create` · `/app/create/[draftId]` | Unified composer + per-platform adaptation | editor |
| `/app/calendar` | Month/week/agenda planner + detail drawer | member |
| `/app/library` | Content library grid + filters | member |
| `/app/analytics` | Cross-platform performance dashboard | member |
| `/app/recommendations` | Best posting time heatmaps + actions | member |
| `/app/accounts` | Connected integrations + health | admin |
| `/app/settings/*` | Profile, workspace, team, billing, publishing, timezone, AI prefs | varies |

### 1.2 Page-by-Page Feature Breakdown

**Dashboard**
- 6 KPI cards: scheduled/week, published/month, total views, avg engagement, top platform, next window
- Best-Time hero: YT / TikTok / cross-platform slots + confidence + CTA
- Upcoming Posts panel: thumb, title, time, platform badges, status
- Performance snapshot: views trend, top post, top day
- Quick Insights assistant panel: rule-derived, non-chat

**Create Post / Composer**
- Media upload: drag-drop, progress, preview
- Base content form
- Platform selection cards: toggle YT/TikTok
- Per-platform accordion/tabs
  - YouTube: title, description, visibility, made-for-kids, tags, thumbnail
  - TikTok: caption + char count, privacy, comment/duet/stitch
- Smart adaptation panel: shorten/hashtags/warnings
- Scheduling module: now/draft/schedule + date/time/tz + "use recommended"
- Switchable YT/TikTok live previews
- Footer actions

**Calendar**
- Month / week / agenda views
- Drag-to-reschedule
- Per-day post chips with platform + status color
- Filters: platform, status, campaign
- Recommended-window highlighting
- Detail drawer: preview, time, platforms, edit/duplicate

**Analytics**
- Platform + date filters, compare-to-previous toggle
- 5 KPI cards
- Views & engagement trend charts
- Performance-by-platform bars
- Recent-post performance table: views/likes/comments/engagement/status

**Recommendations**
- Hero cards: best YT/TikTok/shared time + confidence + sample size
- Day × hour heatmap with YT/TikTok/Combined tabs
- "How it's calculated" explainer
- Recommended actions
- One-click schedule / apply-to-draft / export

**Library · Accounts · Settings**
- Library: searchable grid, status filters, top-performer tags, open-in-composer
- Accounts: connection cards with capability flags + health + reconnect, "coming soon" platforms
- Settings: profile, workspace, team, notifications, billing, publishing defaults, timezone, AI prefs

### 1.3 Core User Flows

**Onboarding → first publish**
Sign up → set timezone → connect YouTube (OAuth) → connect TikTok (OAuth) → land on empty dashboard → Create Post → upload video → adapt per platform → open Recommendations / accept suggested time → schedule → confirmation → appears in Calendar

**Recommendation-driven scheduling**
Recommendations → pick best window → "Apply best time to draft" → composer opens with time prefilled → confirm → job enqueued

**Publish lifecycle**
Draft → Scheduled → (worker fires) Publishing → Published / Failed → analytics ingested over next 24–72h → feeds recommendation recompute

**Reconnect / token-expiry recovery**
Sync job hits 401 → account flagged `needs_review` → dashboard/accounts banner → user re-runs OAuth → tokens refreshed → queued jobs resume

### 1.4 Roles & Permissions

MVP is single-workspace/solo, but model roles now so agency/team scope is additive. Roles are per-workspace membership.

| Role | Can | Cannot |
|------|-----|--------|
| Owner | Everything + billing + delete workspace | — |
| Admin | Manage integrations, members, settings | Billing, delete workspace |
| Editor | Create/edit/schedule/publish content | Manage accounts / members |
| Reviewer | View, comment, approve (needs_review → scheduled) | Edit media, publish directly |

Enforce with a single `can(user, action, resource)` policy helper checked in every API route + server action; never trust the client.

---

## 2. Frontend Architecture

### 2.1 Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ App Router, React Server Components; route handlers for the API layer; server actions for mutations where a full endpoint is overkill |
| Language | TypeScript, `strict`. Shared types generated from Prisma + Zod schemas (single source of truth) |
| Styling / UI | Tailwind + shadcn/ui (Radix primitives). Design tokens from prototype: indigo `#3D5AFE` primary, warm neutral `#FAF9F7` surface, Inter type |
| Server state | TanStack Query for client fetching/caching/optimistic updates; RSC for initial loads |
| Client state | Zustand for composer draft state + calendar view; URL search params for filters (shareable/back-button safe) |
| Forms | react-hook-form + Zod resolver; same Zod schema reused server-side |
| Charts | Recharts (or visx) for trends; custom CSS-grid heatmap for recommendations |
| Uploads | Direct-to-S3 presigned multipart via uppy/tus for resumable large video |

### 2.2 Reusable Component Library

Wrap shadcn primitives in a thin `/components/ui` layer, then build domain components in `/components/app`.

**Primitives:**
Button, Card, Badge, Table, Tabs, Dialog/Modal, Sheet (drawer), Tooltip, Popover, Select, Calendar/DatePicker, Toggle, Switch, Progress, Skeleton, Toast

**Domain:**
StatCard, PlatformBadge, StatusBadge, PostCard, BestTimeCard, InsightNote, HeatmapGrid, TrendChartCard, PlatformPreview (YT/TikTok), MediaDropzone, PlatformFieldPanel, ScheduleControl, ConnectionCard, EmptyState

### 2.3 Component Hierarchy (Key Pages)

**Composer** — `/app/create/[draftId]`
```
<ComposerLayout>
  ├─ <MediaDropzone />                 // uppy, presigned upload, progress
  ├─ <BaseContentForm />               // rhf + zod (title, caption, tags, campaign)
  ├─ <PlatformSelector />              // toggles → drives which panels render
  ├─ <PlatformFieldPanel platform="youtube" />
  ├─ <PlatformFieldPanel platform="tiktok" />
  ├─ <SmartAdaptationPanel />          // suggestions + validation warnings
  └─ <aside> (sticky)
      ├─ <ScheduleControl />           // now / draft / schedule + recommended time
      └─ <PlatformPreview switchable />
```

**Recommendations** — `/app/recommendations`
```
<RecommendationsPage>
  ├─ <BestTimeCard × 3 >               // YT / TikTok / cross-platform
  ├─ <HeatmapCard>
  │   ├─ <PlatformTabs />              // YT | TikTok | Combined
  │   └─ <HeatmapGrid days×hours />    // score → opacity
  ├─ <CalculationExplainer />
  └─ <RecommendedActions />           // one-click schedule / apply / export
```

### 2.4 Form Architecture & Validation

One Zod schema per platform, composed into a discriminated union. The composer validates the shared base, then each active platform's sub-schema; publish is blocked until all active platforms pass.

| Screen | Validation Rules |
|--------|------------------|
| Composer (base) | Internal title required; ≥1 platform selected; media attached & upload complete before schedule |
| YouTube panel | Title 1–100 chars (required); description ≤5000; visibility enum; made-for-kids boolean required; ≤500 tag chars; aspect-ratio check on media |
| TikTok panel | Caption ≤2200 but warn >150; privacy enum; duration ≤ account max; vertical aspect warning |
| Schedule | Scheduled time must be future + ≥ platform min lead time; valid IANA timezone |
| Auth / settings | Email format, password strength, unique workspace slug |

Warnings (soft, non-blocking) vs errors (hard, block publish) are distinct: the SmartAdaptationPanel surfaces warnings like "TikTok caption longer than recommended", "YouTube title missing", "asset may not match platform aspect ratio".

### 2.5 Responsive & State Coverage

Desktop-first (primary), but every page collapses gracefully: sidebar → icon rail → drawer; multi-column composer/analytics stack to single column; tables become stacked cards under `md`. Calendar drops to agenda list on mobile.

| State | Treatment |
|-------|-----------|
| Loading | Skeletons matching card/table/chart shapes; RSC streaming with Suspense boundaries per panel |
| Empty | "Connect your first account", "Upload your first video", "No analytics yet — publish content to start receiving recommendations". Each with a primary CTA |
| Error | Inline field errors; page-level error boundary with retry; toast for mutation failures; publish-failure banner links to the failed post |
| Degraded | Stale analytics badge when last sync > 24h; "reconnect required" banner when tokens expire |

---

## 3. Backend Architecture

### 3.1 Service Topology

A modular monolith to start — one Next.js app for API + UI, one separate long-running Node worker process. Split into services only when a boundary proves it needs to scale independently.

- **Web / API (Next.js):** Auth, CRUD, presigned uploads, enqueues jobs. Stateless, horizontally scalable.
- **Worker (Node + BullMQ):** Publishing, analytics sync, recommendation recompute, token refresh, notifications.
- **Datastores:** Postgres (source of truth via Prisma), Redis (BullMQ queues + cache), S3 (media).

### 3.2 Database Schema (Prisma-oriented)

| Entity | Key Fields | Relationships |
|--------|-----------|----------------|
| User | id, email, name, avatarUrl, passwordHash?, timezone | has many Membership |
| Workspace | id, name, slug, plan, defaultTimezone | has many Membership, SocialAccount, Post |
| Membership | id, userId, workspaceId, role (enum) | User ↔ Workspace join |
| SocialAccount | id, workspaceId, provider (youtube/tiktok), handle, externalId, status, scopes[], lastSyncedAt, capabilities | has one OAuthToken; has many PostTarget, MetricSnapshot |
| OAuthToken | id, socialAccountId, accessToken (enc), refreshToken (enc), expiresAt, scope | 1–1 SocialAccount |
| MediaAsset | id, workspaceId, s3Key, mime, sizeBytes, durationSec, width, height, status | used by Post |
| Post | id, workspaceId, authorId, internalTitle, baseCaption, tags[], campaign, status, mediaAssetId | has many PostTarget |
| PostTarget | id, postId, socialAccountId, platform, overrides (jsonb: title/desc/caption/privacy…), scheduledAt, status, externalPostId, publishedAt, failureReason | Post ↔ SocialAccount; the unit the scheduler acts on |
| MetricSnapshot | id, postTargetId, capturedAt, views, likes, comments, shares, watchTimeSec, engagementRate | time series per PostTarget |
| Recommendation | id, workspaceId, platform (or combined), dayOfWeek, hour, score, confidence, sampleSize, computedAt | rebuilt by recompute job |
| AuditLog / Notification | actor, action, resource, meta, createdAt / userId, type, read | cross-cutting |

Indexes: `PostTarget(status, scheduledAt)` for the scheduler poll; `MetricSnapshot(postTargetId, capturedAt)`; `Recommendation(workspaceId, platform)`. Tokens encrypted at rest (KMS/libsodium), never returned to the client.

### 3.3 Background Jobs (BullMQ Queues)

| Queue | Trigger & Behavior |
|-------|-------------------|
| publish | Delayed job per PostTarget scheduled at exact time; uploads media + creates post via platform API; retries w/ backoff; sets Published/Failed |
| analytics-sync | Repeatable (hourly for <72h-old posts, then daily) — pulls metrics, writes MetricSnapshot |
| recompute-recommendations | Weekly per workspace + on-demand after N new snapshots; rebuilds Recommendation rows |
| token-refresh | Runs ahead of expiresAt; refreshes OAuth tokens; flags account on failure |
| media-probe / notify | ffprobe uploaded media for duration/aspect; fan-out notifications (publish success/fail, review requests) |

### 3.4 Scheduler Architecture

Use `BullMQ delayed jobs` as the primary mechanism: when a PostTarget is scheduled, enqueue a `publish` job with `delay = scheduledAt − now` and `jobId = postTarget.id` (idempotent; rescheduling removes + re-adds). A safety-net cron ("sweeper") runs every minute to enqueue any `status=scheduled && scheduledAt<=now` targets missed due to downtime. The worker claims a job, re-checks DB state (guard against double-publish / cancellation), performs upload+publish, and transitions status atomically. All external calls are idempotent-keyed so retries never double-post.

```
schedule(target) → publishQueue.add('publish', {targetId}, {delay, jobId: targetId, attempts:5, backoff:{type:'exponential', delay:30_000}})
worker: load target → assert status==scheduled → set 'publishing'
        → upload media → platform.createPost() → store externalPostId → set 'published'
        → schedule analytics-sync(target) at +1h
   catch → increment attempt; on final fail set 'failed' + failureReason + notify
```

### 3.5 Analytics Ingestion

After publish, the `analytics-sync` repeatable job polls each platform's analytics endpoint on a decaying cadence (t+1h, +3h, +12h, +24h, then daily to 90d). Each poll writes an immutable `MetricSnapshot` so we keep the full growth curve (enables "first-24h view velocity" insights). A nightly rollup aggregates snapshots into per-post latest + per-workspace daily totals for fast dashboard reads. Platform rate limits are respected via per-provider concurrency + a token-bucket limiter in Redis.

### 3.6 Recommendation Engine (Best Posting Time)

MVP is a transparent, explainable heuristic — not a black-box ML model. This matches the "smarter than a scheduler, not gimmicky AI" positioning and is defensible in the UI's explainer panel.

| Step | Details |
|------|---------|
| Input | Last 90 days of MetricSnapshots joined to PostTarget.publishedAt (converted to workspace timezone) |
| Bucketing | Map each post to a (dayOfWeek × hour) cell, per platform |
| Score | Weighted, normalized blend: `0.4·engagementRate + 0.35·viewsVelocity24h + 0.25·watchTime` (weights configurable in AI settings), z-scored within platform |
| Confidence | Function of sample size per cell + variance; sparse cells shrink toward the platform mean (empirical-Bayes) to avoid overfitting 1–2 posts |
| Combined slot | Cross-platform = argmax of the harmonic mean of per-platform cell scores (rewards slots good for both, not just one) |
| Output | Persist full grid → Recommendation rows; hero cards read top cell per platform + combined. Recompute weekly / on-demand |

Cold-start: before enough first-party data, seed with platform/category benchmarks and label recommendations "based on general benchmarks" until sample size crosses a threshold. Post-MVP: swap the heuristic for a gradient-boosted model behind the same Recommendation table + API — no frontend change.

---

## 4. API Design

All authenticated routes require a session and resolve the active `workspaceId` from the session/header; every handler runs the `can()` policy check. Payloads below are abbreviated to the significant fields.

### 4.1 AUTH

| M | Path | Purpose · Request → Response |
|---|------|------------------------------|
| POST | `/api/auth/signup` | Create account. `{email,password,name}` → `{user, workspace, session}` |
| POST | `/api/auth/login` | `{email,password}` → `{user, session}` (sets httpOnly cookie) |
| POST | `/api/auth/logout` | Invalidate session → `204` |
| GET | `/api/me` | → `{user, memberships, activeWorkspace}` |

### 4.2 SOCIAL ACCOUNTS & INTEGRATIONS

| M | Path | Purpose · Request → Response |
|---|------|------------------------------|
| GET | `/api/accounts` | List connections + health → `[{id,provider,handle,status,capabilities,lastSyncedAt}]` |
| GET | `/api/accounts/:provider/connect` | Begin OAuth → 302 to provider consent (state stored) |
| GET | `/api/accounts/:provider/callback` | OAuth redirect; exchange code, store enc tokens → 302 /app/accounts |
| POST | `/api/accounts/:id/test` | Ping platform w/ token → `{ok, scopes, error?}` |
| DELETE | `/api/accounts/:id` | Disconnect, revoke, purge tokens → `204` |

### 4.3 MEDIA & POSTS (DRAFT CRUD)

| M | Path | Purpose · Request → Response |
|---|------|------------------------------|
| POST | `/api/media/presign` | `{filename,mime,sizeBytes}` → `{uploadUrls[],mediaAssetId}` (multipart) |
| POST | `/api/media/:id/complete` | Finalize multipart; enqueue media-probe → `{mediaAsset}` |
| GET | `/api/posts` | List/filter (status,platform,campaign,q) → `[Post]` |
| POST | `/api/posts` | Create draft. `{internalTitle,baseCaption,tags,mediaAssetId,targets:[{platform,accountId,overrides}]}` → `{post}` |
| GET | `/api/posts/:id` | → `{post, targets, media}` |
| PATCH | `/api/posts/:id` | Update draft / per-target overrides → `{post}` |
| POST | `/api/posts/:id/duplicate` | Clone as new draft → `{post}` |
| DELETE | `/api/posts/:id` | → `204` |

### 4.4 SCHEDULING & PUBLISHING

| M | Path | Purpose · Request → Response |
|---|------|------------------------------|
| POST | `/api/posts/:id/schedule` | `{targets:[{targetId,scheduledAt,timezone}]}` → enqueues jobs → `{targets:[{status:'scheduled'}]}` |
| POST | `/api/posts/:id/publish-now` | Enqueue immediate publish → `{targets}` |
| PATCH | `/api/targets/:id/reschedule` | Drag-drop calendar move. `{scheduledAt}` → re-adds delayed job → `{target}` |
| POST | `/api/targets/:id/cancel` | Cancel scheduled → removes job → `{status:'draft'}` |
| GET | `/api/calendar` | Range query `?from&to` → targets grouped by day for calendar |

### 4.5 ANALYTICS & RECOMMENDATIONS

| M | Path | Purpose · Request → Response |
|---|------|------------------------------|
| GET | `/api/analytics/overview` | `?platform&from&to&compare` → `{kpis, deltas}` |
| GET | `/api/analytics/timeseries` | `?metric=views|engagement&interval=day` → `[{date,value}]` |
| GET | `/api/analytics/posts` | Per-post performance table → `[{post,platform,views,likes,comments,shares,engagementRate}]` |
| GET | `/api/recommendations` | `?platform=youtube|tiktok|combined` → `{heatmap:[{day,hour,score}], best:{day,hour,confidence,sampleSize}}` |
| POST | `/api/recommendations/apply` | `{draftId, slot}` → prefills draft schedule → `{target}` |
| GET | `/api/recommendations/export` | → PDF/CSV report of current recommendations |

Conventions: cursor pagination (`?cursor&limit`), consistent error envelope `{error:{code,message,fields?}}`, idempotency keys on publish/schedule, rate limiting per workspace.

---

## 5. Third-Party Integrations

### 5.1 YouTube (Data API v3)

**OAuth:** Google OAuth 2.0 authorization-code + PKCE, `access_type=offline` for refresh token. Scopes: `youtube.upload`, `youtube.readonly`, `yt-analytics.readonly`.

**Tokens:** short-lived access + long-lived refresh; refresh proactively before expiry.

**Publish:** resumable upload to `videos.insert` (media + snippet: title/description/tags + status: privacy, madeForKids); store returned videoId as externalPostId. Custom thumbnail via `thumbnails.set`.

**Analytics:** YouTube Analytics API — views, estimatedMinutesWatched, likes, comments, shares, averageViewDuration per video/day.

**Sync jobs:** per-video metric pull on decaying cadence; quota-aware batching (Data API has strict daily quota units).

### 5.2 TikTok (Content Posting API)

**OAuth:** TikTok Login Kit OAuth 2.0 authorization-code. Scopes: `video.upload` / `video.publish`, `user.info.basic`, `video.list` (+ insights where available).

**Tokens:** access + refresh (client_key/secret); handle scope-review status per app approval.

**Publish:** initialize upload → chunked video upload → publish with caption, privacy_level, comment/duet/stitch flags; poll `publish status` until success; store publish_id / video_id.

**Analytics:** video metrics — views, likes, comments, shares, watch time / avg watch (subject to API access tier).

**Sync jobs:** poll publish status right after post; metric pulls on decaying cadence; respect per-app rate limits.

### 5.3 Failure Handling

| Case | Handling |
|------|----------|
| Token expired / revoked (401) | Flag account `needs_review`, pause its jobs, banner + reconnect CTA, notify user |
| Rate limit / quota (429) | Exponential backoff + Redis token bucket; defer sync, never drop publish |
| Upload / processing failure | Retry (5 attempts); on final fail set target `failed` + human-readable failureReason |
| Content policy rejection | Surface platform message verbatim; no retry; mark failed |
| Partial multi-platform publish | Per-target status is independent — one platform succeeding never blocks or rolls back the other; UI shows mixed state |

Abstract both behind a common `PlatformAdapter` interface (`connect / publish / fetchMetrics / refreshToken`) so future Instagram/LinkedIn/X/Facebook adapters drop in without touching the scheduler or UI.

---

## 6. MVP Build Roadmap

### Phase 1: Foundations (Weeks 1–2)
**Goal:** App skeleton, auth, workspace model, design system, CI/CD.

**Frontend:**
- Next.js + Tailwind + shadcn setup
- Layout shell (sidebar + top bar)
- Auth pages
- Design tokens
- Component-library primitives
- Empty-state components

**Backend:**
- Prisma schema (User/Workspace/Membership)
- Auth (NextAuth or custom sessions)
- `can()` policy layer
- Postgres + Redis provisioned
- Worker process scaffold

**Dependencies:** none

**Deliverable:** User can sign up, log in, land on an empty authenticated dashboard.

---

### Phase 2: Account Connections (Weeks 3–4)
**Goal:** Connect & manage YouTube + TikTok with healthy token lifecycle.

**Frontend:**
- Accounts page
- Connection cards + capability flags + health
- Connect/reconnect/disconnect/test flows
- "Coming soon" section
- Onboarding step

**Backend:**
- PlatformAdapter interface
- YT + TikTok OAuth (connect/callback)
- Encrypted OAuthToken storage
- Token-refresh queue
- Test-connection endpoint

**Dependencies:** Phase 1; approved YT/TikTok developer apps + scopes

**Deliverable:** User connects both platforms; tokens auto-refresh; health visible.

---

### Phase 3: Composer + Drafts (Weeks 5–7)
**Goal:** Create one post, adapt per platform, save as draft, publish now.

**Frontend:**
- Composer layout
- MediaDropzone (resumable upload)
- Base form + per-platform panels (rhf+zod)
- Platform selector
- Previews
- Smart-adaptation warnings
- Content Library grid

**Backend:**
- Media presign/complete + probe
- Post/PostTarget CRUD
- Publish queue + worker publish path (immediate)
- Per-platform validation
- Duplicate

**Dependencies:** Phase 2 (needs connected accounts + adapters)

**Deliverable:** User uploads a video, customizes for YT + TikTok, publishes immediately to both.

---

### Phase 4: Scheduling + Calendar (Weeks 8–10)
**Goal:** Schedule posts for the future and manage the pipeline visually.

**Frontend:**
- ScheduleControl (date/time/tz)
- Calendar month/week/agenda
- Drag-to-reschedule
- Detail drawer
- Filters
- Status system

**Backend:**
- Delayed publish jobs + sweeper cron
- Schedule/reschedule/cancel endpoints
- Calendar range query
- Idempotent status transitions
- Publish-failure notifications

**Dependencies:** Phase 3 (publish path)

**Deliverable:** User schedules to both platforms; posts auto-publish at the right time; calendar reflects state.

---

### Phase 5: Analytics Dashboard (Weeks 11–13)
**Goal:** Ingest cross-platform performance and present it clearly.

**Frontend:**
- Analytics page (KPIs + deltas, trend charts, platform comparison, post table)
- Dashboard performance snapshot
- Stale-data states

**Backend:**
- analytics-sync repeatable jobs
- MetricSnapshot storage
- Nightly rollups
- overview/timeseries/posts endpoints
- Quota-aware fetching

**Dependencies:** Phase 3–4 (published posts to measure)

**Deliverable:** Real metrics flow in and render across dashboard + analytics.

---

### Phase 6: Posting-Time Recommendations (Weeks 14–16)
**Goal:** Turn analytics into actionable best-time guidance — the hero feature.

**Frontend:**
- Recommendations page (hero cards, heatmap + tabs, explainer, actions)
- Dashboard best-time hero
- "Use recommended time" in composer
- Export

**Backend:**
- recompute-recommendations job (heuristic scoring + confidence)
- Recommendation table
- recommendations + apply + export endpoints
- Cold-start benchmarks

**Dependencies:** Phase 5 (needs MetricSnapshots)

**Deliverable:** User sees per-platform + cross-platform best times and schedules directly from them.

---

## Post-MVP (Noted, Not Built)

Additional platform adapters (Instagram, LinkedIn, X, Facebook) · approval workflows & team review · agency multi-client workspace switching · ML-based recommendation model · A/B posting-time testing · content repurposing suggestions. All are additive behind existing interfaces (PlatformAdapter, Recommendation table, role system) — no rearchitecting required.
