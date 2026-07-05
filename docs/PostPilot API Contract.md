# PostPilot — MVP Internal API Contract

**Companion to:** `PostPilot Engineering Spec` · `PostPilot Database Schema`
**Backend:** Node.js API (separate service, consumed by a Next.js frontend over HTTPS/JSON)
**Base URL:** `https://api.postpilot.app/v1`
**Auth:** Session cookie (httpOnly, `Secure`, `SameSite=Lax`) issued at login; every non-public route also requires an active workspace, resolved from `X-Workspace-Id` header or the user's last-used workspace.

---

## Conventions

- All request/response bodies are JSON. `Content-Type: application/json` on all POST/PATCH.
- All timestamps are ISO 8601 UTC strings (`2026-07-05T14:30:00Z`). The frontend converts to workspace/user timezone for display.
- List endpoints use cursor pagination: `?cursor=<opaque>&limit=<n, default 20, max 100>` → response includes `nextCursor: string | null`.
- Standard error envelope on all 4xx/5xx:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Human-readable summary", "fields": { "title": "Required" } } }
  ```
- Common error codes: `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (422), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500), `UPSTREAM_PLATFORM_ERROR` (502).
- Mutations that enqueue background work (publish, schedule) accept an optional `Idempotency-Key` header; replays with the same key return the original result instead of double-executing.
- The frontend should use TanStack Query with the path as query key; all mutations should invalidate the relevant list query on success.

---

## 1. Auth

### `POST /auth/signup`
**Auth:** none (public)

**Request:**
```json
{ "email": "string", "password": "string (min 8 chars)", "name": "string" }
```

**Response `201`:**
```json
{
  "user": { "id": "uuid", "email": "string", "name": "string" },
  "workspace": { "id": "uuid", "name": "string", "slug": "string" },
  "session": { "expiresAt": "iso8601" }
}
```
Sets `postpilot_session` httpOnly cookie.

**Errors:** `422 VALIDATION_ERROR` (weak password, invalid email); `409 CONFLICT` (email already registered).

**Frontend notes:** On success, redirect to `/onboarding`. Do not store the session token in JS-accessible storage — it's cookie-only.

---

### `POST /auth/login`
**Auth:** none (public)

**Request:** `{ "email": "string", "password": "string" }`

**Response `200`:** `{ "user": {...}, "session": { "expiresAt": "iso8601" } }`

**Errors:** `401 UNAUTHENTICATED` (bad credentials — same message for wrong email or password, don't leak which); `429 RATE_LIMITED` (after 5 failed attempts/15min per IP+email).

**Frontend notes:** On `401`, show one generic "Incorrect email or password" — never distinguish.

---

### `POST /auth/logout`
**Auth:** session required

**Request:** none

**Response `204`:** no body. Clears session cookie.

**Errors:** none beyond standard `401` if already logged out (treat as success client-side).

---

### `GET /auth/oauth/google/start` *(login/signup via Google, optional MVP nice-to-have)*
**Auth:** none

**Response `302`:** redirect to Google consent. Not required for MVP scope but stubbed for parity with platform OAuth pattern below.

---

### `GET /me`
**Auth:** session required

**Response `200`:**
```json
{
  "user": { "id": "uuid", "email": "string", "name": "string", "avatarUrl": "string|null", "timezone": "string" },
  "memberships": [ { "workspaceId": "uuid", "workspaceName": "string", "role": "owner|admin|editor|reviewer" } ],
  "activeWorkspaceId": "uuid"
}
```

**Errors:** `401 UNAUTHENTICATED`.

**Frontend notes:** Call once on app shell mount (RSC root layout); cache in a top-level provider. Drives the workspace switcher and role-gated UI.

---

## 2. Accounts / Integrations

### `GET /accounts`
**Auth:** session + workspace (any role)

**Response `200`:**
```json
{
  "accounts": [
    {
      "id": "uuid", "provider": "youtube|tiktok", "handle": "string",
      "avatarUrl": "string|null", "status": "active|needs_review|disconnected",
      "capabilities": { "publish": true, "analytics": true },
      "lastSyncedAt": "iso8601|null"
    }
  ]
}
```

**Errors:** `401`, `403 FORBIDDEN` (no active workspace membership).

**Frontend notes:** Poll or refetch-on-focus (window focus event) — connections can change in another tab mid-OAuth flow.

---

### `GET /accounts/:provider/connect`
**Auth:** session + workspace (role: `admin` or `owner`)

**Request:** none (provider is path param: `youtube` | `tiktok`)

**Response `302`:** redirect to the provider's OAuth consent screen; `state` param encodes `{ workspaceId, userId, nonce }` signed server-side.

**Errors:** `403 FORBIDDEN` (editor/reviewer cannot initiate connect); `400` (unsupported provider).

**Frontend notes:** Trigger via a full navigation (`window.location.href`), not `fetch` — this is a browser redirect flow, not an XHR.

---

### `GET /accounts/:provider/callback`
**Auth:** none at the route level (validated via signed `state`); session must exist from the original tab

**Request:** query params `code`, `state` (from provider redirect)

**Response `302`:** redirect to `/app/accounts?connected=youtube` on success, or `/app/accounts?error=<code>` on failure (`access_denied`, `state_mismatch`, `token_exchange_failed`).

**Frontend notes:** `/app/accounts` reads the `connected`/`error` query params on mount to show a toast, then strips them from the URL.

---

### `POST /accounts/:id/test`
**Auth:** session + workspace (any role)

**Request:** none

**Response `200`:** `{ "ok": true, "scopes": ["string"] }` or `{ "ok": false, "error": "string" }`

**Errors:** `404 NOT_FOUND`; `502 UPSTREAM_PLATFORM_ERROR` (provider unreachable — distinct from `ok: false`, which means the provider responded with an auth failure).

**Frontend notes:** Show as a lightweight inline spinner → checkmark/x on the ConnectionCard; don't block the page.

---

### `DELETE /accounts/:id`
**Auth:** session + workspace (role: `admin` or `owner`)

**Request:** none

**Response `204`:** revokes token upstream where the provider supports it, deletes `account_tokens` row, sets `social_accounts.status = 'disconnected'`.

**Errors:** `403 FORBIDDEN`; `409 CONFLICT` if the client didn't pass `?force=true` and the account has future `scheduled_posts` (response body lists affected post IDs so the UI can confirm).

**Frontend notes:** Always call once without `force`, catch `409`, show a confirm dialog listing affected posts, then retry with `?force=true`.

---

## 3. Content Drafts

### `GET /posts`
**Auth:** session + workspace (any role)

**Request (query):** `?status=&platform=&campaign=&q=&cursor=&limit=`

**Response `200`:**
```json
{
  "posts": [
    {
      "id": "uuid", "internalTitle": "string", "status": "draft|scheduled|publishing|published|failed|needs_review",
      "campaign": "string|null", "tags": ["string"], "mediaAsset": { "id": "uuid", "thumbnailUrl": "string|null" } | null,
      "targets": [ { "id": "uuid", "platform": "youtube|tiktok", "status": "string", "scheduledAt": "iso8601|null" } ],
      "createdAt": "iso8601", "updatedAt": "iso8601"
    }
  ],
  "nextCursor": "string|null"
}
```

**Errors:** `401`, `403`.

**Frontend notes:** Backs both the Dashboard "upcoming" query (`status=scheduled&limit=5`) and the full Content Library grid — same shape, different filters.

---

### `POST /posts`
**Auth:** session + workspace (role: `editor` or higher)

**Request:**
```json
{
  "internalTitle": "string (required)",
  "baseCaption": "string|null",
  "tags": ["string"],
  "campaign": "string|null",
  "mediaAssetId": "uuid|null",
  "targets": [ { "platform": "youtube|tiktok", "socialAccountId": "uuid", "overrides": { "title": "string", "description": "string", "visibility": "public|unlisted|private", "madeForKids": true } } ]
}
```

**Response `201`:** `{ "post": { ...same shape as GET /posts item... } }`

**Errors:** `422 VALIDATION_ERROR` (missing internalTitle; unknown socialAccountId); `403 FORBIDDEN` (reviewer role).

**Frontend notes:** Called on first autosave from the composer (debounced ~800ms after the user starts typing), returning the `id` used for all subsequent `PATCH` calls — this is what makes `/app/create/[draftId]` populate its route param.

---

### `GET /posts/:id`
**Auth:** session + workspace (any role)

**Response `200`:** `{ "post": {...}, "targets": [ {...with full overrides...} ], "media": {...} | null }`

**Errors:** `404 NOT_FOUND`.

**Frontend notes:** Used to hydrate the composer when opening an existing draft or clicking a Calendar/Library item.

---

### `PATCH /posts/:id`
**Auth:** session + workspace (role: `editor` or higher)

**Request:** any subset of the `POST /posts` body (partial update); target-level overrides can be updated by including that target's `id` in the `targets` array.

**Response `200`:** `{ "post": {...} }`

**Errors:** `422 VALIDATION_ERROR`; `404`; `409 CONFLICT` (attempting to edit a target that's already `publishing`/`published`).

**Frontend notes:** This is the composer's primary autosave call — debounce per field group (base form vs. each platform panel) to avoid request storms.

---

### `POST /posts/:id/duplicate`
**Auth:** session + workspace (role: `editor` or higher)

**Request:** none

**Response `201`:** `{ "post": { ...new draft, status: "draft", targets: [] or copied unscheduled... } }`

**Errors:** `404`.

**Frontend notes:** Used from both Library and Calendar drawers; navigate to `/app/create/[newDraftId]` on success.

---

### `DELETE /posts/:id`
**Auth:** session + workspace (role: `editor` or higher)

**Response `204`.**

**Errors:** `409 CONFLICT` if any target is `scheduled`/`publishing`/`published` and `?force` wasn't passed (cancel/unpublish is a separate concern — deleting a live post is a hard stop by default).

---

## 4. Media Uploads

### `POST /media/presign`
**Auth:** session + workspace (role: `editor` or higher)

**Request:** `{ "filename": "string", "mime": "string", "sizeBytes": "number" }`

**Response `200`:**
```json
{
  "mediaAssetId": "uuid",
  "uploadMethod": "multipart",
  "parts": [ { "partNumber": 1, "url": "string (presigned S3 URL)" } ],
  "partSizeBytes": 8388608
}
```

**Errors:** `422 VALIDATION_ERROR` (unsupported mime type, size over plan limit); `403` (workspace storage quota exceeded → `code: "QUOTA_EXCEEDED"`).

**Frontend notes:** Feed the returned URLs directly into an uppy/tus multipart upload; the client uploads straight to S3, never through the API server.

---

### `POST /media/:id/complete`
**Auth:** session + workspace (role: `editor` or higher)

**Request:** `{ "parts": [ { "partNumber": 1, "etag": "string" } ] }` (from S3 multipart responses)

**Response `202`:** `{ "mediaAsset": { "id": "uuid", "status": "processing" } }` — finalizes the S3 multipart upload and enqueues the `media-probe` job (ffprobe for duration/dimensions).

**Errors:** `422` (part list doesn't match what was presigned); `502` (S3 completion failed — client should retry).

**Frontend notes:** Poll `GET /media/:id` (below) every 2s, or subscribe via the notifications WebSocket if available, until `status` becomes `ready` before enabling the composer's Schedule/Publish actions.

---

### `GET /media/:id`
**Auth:** session + workspace (any role)

**Response `200`:**
```json
{ "id": "uuid", "status": "uploading|processing|ready|failed", "thumbnailUrl": "string|null", "durationSec": "number|null", "width": "number|null", "height": "number|null" }
```

**Errors:** `404`.

**Frontend notes:** Lightweight polling target; keep this endpoint cheap (no joins) since the composer may hit it repeatedly during processing.

---

## 5. Scheduling & Publishing

### `POST /posts/:id/schedule`
**Auth:** session + workspace (role: `editor` or higher)

**Request:**
```json
{ "targets": [ { "targetId": "uuid", "scheduledAt": "iso8601", "timezone": "string (IANA)" } ] }
```

**Response `200`:** `{ "targets": [ { "id": "uuid", "status": "scheduled", "scheduledAt": "iso8601" } ] }` — enqueues a delayed `publish` job per target.

**Errors:** `422 VALIDATION_ERROR` (`scheduledAt` in the past, or inside the platform's minimum lead time — response includes `fields: { "scheduledAt": "Must be at least 10 minutes from now" }`); `409 CONFLICT` (target's account is `disconnected`).

**Frontend notes:** Send `Idempotency-Key` (e.g. the draft id + a client-generated nonce) so a double-click can't create duplicate jobs. On success, redirect to `/app/calendar` or show an inline confirmation with a "View in calendar" link.

---

### `POST /posts/:id/publish-now`
**Auth:** session + workspace (role: `editor` or higher)

**Request:** `{ "targetIds": ["uuid"] }` (omit to publish all eligible targets)

**Response `202`:** `{ "targets": [ { "id": "uuid", "status": "publishing" } ] }` — enqueues immediate `publish` jobs.

**Errors:** `422` (target has failing validation — e.g. missing `madeForKids`); `409` (target already publishing/published).

**Frontend notes:** Immediately reflect `publishing` state optimistically; then poll `GET /posts/:id` or listen for a push notification to flip to `published`/`failed`.

---

### `PATCH /targets/:id/reschedule`
**Auth:** session + workspace (role: `editor` or higher)

**Request:** `{ "scheduledAt": "iso8601" }`

**Response `200`:** `{ "target": { "id": "uuid", "scheduledAt": "iso8601", "status": "scheduled" } }` — removes and re-adds the delayed job (same validation as `schedule`).

**Errors:** `422`; `409` (target not in `scheduled` state, e.g. already publishing).

**Frontend notes:** This is what the Calendar's drag-and-drop calls. On `409`/`422`, the calendar must revert the chip's optimistic position — keep the pre-drag `scheduledAt` in local state until the request resolves.

---

### `POST /targets/:id/cancel`
**Auth:** session + workspace (role: `editor` or higher)

**Request:** none

**Response `200`:** `{ "target": { "id": "uuid", "status": "draft", "scheduledAt": null } }` — removes the queued job.

**Errors:** `409 CONFLICT` (target already `publishing`/`published` — can't cancel something already running/done).

---

### `GET /calendar`
**Auth:** session + workspace (any role)

**Request (query):** `?from=iso8601&to=iso8601&platform=&status=&campaign=`

**Response `200`:**
```json
{
  "days": [
    { "date": "2026-07-06", "targets": [ { "id": "uuid", "postId": "uuid", "internalTitle": "string", "platform": "youtube|tiktok", "scheduledAt": "iso8601", "status": "string", "thumbnailUrl": "string|null" } ] }
  ]
}
```

**Errors:** `422` (`from` after `to`, or range exceeds 90 days).

**Frontend notes:** Cap the requested range to the visible calendar viewport (month/week) plus a small buffer; don't fetch the whole year at once.

---

## 6. Analytics

### `GET /analytics/overview`
**Auth:** session + workspace (any role)

**Request (query):** `?platform=youtube|tiktok|all&from=&to=&compare=true|false`

**Response `200`:**
```json
{
  "kpis": {
    "totalViews": 128400, "avgEngagementRate": 0.047, "postsPublished": 12,
    "topPlatform": "youtube"
  },
  "deltas": { "totalViews": 0.12, "avgEngagementRate": -0.03 } 
}
```
`deltas` present only when `compare=true`; values are fractional change vs. the equal-length prior period.

**Errors:** `422` (invalid range); returns `200` with zeroed KPIs (not an error) when the workspace has no published posts yet — frontend renders the empty state based on `postsPublished === 0`, not on an error.

**Frontend notes:** Never treat "no data" as an error state; check the zero-count field explicitly.

---

### `GET /analytics/timeseries`
**Auth:** session + workspace (any role)

**Request (query):** `?metric=views|engagement&interval=day|week&platform=&from=&to=`

**Response `200`:** `{ "series": [ { "date": "2026-07-01", "value": 4210 } ] }`

**Errors:** `422` (unknown metric).

**Frontend notes:** Feed straight into Recharts; pad missing days with `value: 0` server-side so the chart doesn't need client-side gap-filling.

---

### `GET /analytics/posts`
**Auth:** session + workspace (any role)

**Request (query):** `?platform=&from=&to=&cursor=&limit=&sort=views|engagementRate&order=asc|desc`

**Response `200`:**
```json
{
  "rows": [
    { "postId": "uuid", "targetId": "uuid", "internalTitle": "string", "platform": "youtube|tiktok", "views": 12400, "likes": 900, "comments": 42, "shares": 18, "engagementRate": 0.052, "status": "published", "publishedAt": "iso8601" }
  ],
  "nextCursor": "string|null"
}
```

**Errors:** `422` (bad sort field).

**Frontend notes:** Backs the Analytics performance table; `sort`/`order` should be reflected in the URL query string so table state survives refresh/back-button.

---

## 7. Recommendations

### `GET /recommendations`
**Auth:** session + workspace (any role)

**Request (query):** `?platform=youtube|tiktok|combined`

**Response `200`:**
```json
{
  "heatmap": [ { "dayOfWeek": 0, "hour": 18, "score": 0.82, "confidence": 0.71, "sampleSize": 14 } ],
  "best": { "dayOfWeek": 3, "hour": 19, "confidence": 0.88, "sampleSize": 22 },
  "isColdStart": false,
  "computedAt": "iso8601"
}
```
When `isColdStart: true`, `best` and `heatmap` are populated from category benchmarks, not workspace data — frontend must show the "based on general benchmarks" label.

**Errors:** `422` (unknown platform); `403` if `platform=combined` requested but fewer than 2 platforms connected (response includes `code: "INSUFFICIENT_PLATFORMS"`).

**Frontend notes:** Cache aggressively (recomputed weekly server-side) — safe to treat as static for the session; refetch on window focus is unnecessary here unlike Accounts.

---

### `POST /recommendations/apply`
**Auth:** session + workspace (role: `editor` or higher)

**Request:** `{ "draftId": "uuid", "dayOfWeek": 3, "hour": 19, "targetIds": ["uuid"] }`

**Response `200`:** `{ "scheduledAt": "iso8601" }` — server resolves the next occurrence of that (day, hour) in the workspace timezone and returns it; does **not** itself schedule the post (frontend still calls `POST /posts/:id/schedule` with this value so the standard validation path runs).

**Errors:** `404` (draft not found); `422` (dayOfWeek/hour out of range).

**Frontend notes:** This is a pure "resolve a slot to a concrete datetime" helper — keep the composer's actual scheduling logic single-pathed through `/schedule` rather than duplicating validation here.

---

### `GET /recommendations/export`
**Auth:** session + workspace (any role)

**Request (query):** `?platform=youtube|tiktok|combined&format=pdf|csv`

**Response `200`:** binary file stream, `Content-Type: application/pdf` or `text/csv`, `Content-Disposition: attachment; filename="postpilot-recommendations.pdf"`.

**Errors:** `422` (unknown format).

**Frontend notes:** Trigger via a plain `<a href>` navigation or `window.open`, not `fetch` + blob — simpler and lets the browser handle the download natively.

---

## Cross-Domain Notes for Frontend Implementation

- **Session handling:** all API calls from Next.js should go through a thin `apiFetch()` wrapper that attaches `X-Workspace-Id` from a client-side workspace store and redirects to `/login` on any `401`.
- **Optimistic updates:** reschedule (drag-drop) and cancel are the two mutations worth doing optimistically; everything else (schedule, publish-now, disconnect) has real latency/risk and should show a pending state instead.
- **Polling vs. push:** MVP uses polling (media processing, publish status) rather than WebSockets to keep the backend simpler; if adopted later, these are the first three candidates to convert to push.
- **Error toasts vs. inline errors:** `VALIDATION_ERROR` on a form submit → inline field errors using the `fields` map; everything else (`FORBIDDEN`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`) → toast with the `message`.
