# PostPilot — Page-by-Page Implementation Checklist (MVP)

Companion to `PostPilot Engineering Spec.dc.html`. One section per route. "Mock in v1" = acceptable to fake/stub for demo; "Production-ready in v1" = must be real for launch.

---

## Dashboard — `/app`

**Purpose:** Fast overview of connected platforms, upcoming posts, recent performance, and best posting-time guidance; primary landing page.

**Components:** StatCard ×5–6, BestTimeCard (hero, 3-slot), PostCard list (Upcoming Posts), TrendChartCard (views bar chart), InsightNote list, EmptyState (no accounts / no posts / no analytics).

**Data required:** workspace KPIs (scheduled this week, published this month, total views, avg engagement, top platform), top-3 recommendation slots + confidence, next 3–5 upcoming PostTargets (thumbnail, title, time, platforms, status), 12–14pt views trend, top post + top day, 3 rule-derived insight strings.

**User actions:** click "Create Post" CTA → composer; click a Best-Time CTA → prefill schedule in composer; click an upcoming post → calendar/detail; click "View calendar/analytics/recommendations" links.

**Validation rules:** none (read-only page).

**States:** *Loading* — skeleton KPI cards + skeleton list. *Empty* — no accounts connected → "Connect your first account" CTA; accounts connected but 0 posts → "Upload your first video"; posts exist but &lt;90 days / insufficient data → "No analytics yet — publish content to start receiving recommendations" in place of BestTimeCard. *Error* — KPI panel shows retry state independently per Suspense boundary (one failed widget shouldn't blank the page).

**API endpoints:** `GET /api/analytics/overview`, `GET /api/recommendations?platform=combined`, `GET /api/calendar?from=today&to=+7d`, `GET /api/accounts`.

**Edge cases:** brand-new workspace with zero data; account disconnected mid-session (KPIs should degrade, not error); mixed-status upcoming posts (draft + scheduled + needs-review in same list); very large view counts (format as 128.4K / 1.2M).

**Mock in v1:** insight strings (rule templates over real numbers is fine to start; no ML needed). **Production-ready in v1:** KPI numbers, upcoming posts list, best-time hero (even if heuristic), all empty states.

---

## Create Post / Composer — `/app/create/[draftId]`

**Purpose:** Create one post and adapt it to YouTube + TikTok in a single workflow; schedule, draft, or publish immediately.

**Components:** MediaDropzone, BaseContentForm, PlatformSelector (toggle cards), PlatformFieldPanel ×2 (YouTube/TikTok tabs), SmartAdaptationPanel, ScheduleControl, PlatformPreview (switchable), footer action bar.

**Data required:** draft (if editing existing), connected accounts + capabilities, media upload state, current recommendation slot (for "use recommended time"), platform character/field limits.

**User actions:** drag-drop or select video; edit base title/caption/tags/campaign; toggle platforms on/off; edit per-platform fields; apply a smart-adaptation suggestion; choose now/draft/schedule; pick date/time/timezone or accept recommended time; switch preview platform; Save Draft / Schedule / Publish Now.

**Validation rules:** internal title required; ≥1 platform selected; media upload complete before schedule/publish; YouTube — title 1–100 chars required, description ≤5000, made-for-kids required boolean; TikTok — caption ≤2200 (warn &gt;150), privacy required; schedule time must be future + platform min lead time; valid IANA timezone. Warnings (non-blocking): caption too long for TikTok, YouTube title missing, aspect-ratio mismatch, identical copy across platforms.

**States:** *Loading* — media upload progress bar, draft fetch skeleton. *Empty* — no media yet → dropzone prompt; no accounts connected → banner "Connect an account to publish" with link to Accounts. *Error* — upload failure (retry chunk), validation errors inline per field, publish-now failure toast with link to failed target.

**API endpoints:** `POST /api/media/presign`, `POST /api/media/:id/complete`, `POST /api/posts`, `PATCH /api/posts/:id`, `POST /api/posts/:id/schedule`, `POST /api/posts/:id/publish-now`, `GET /api/recommendations/apply` context, `GET /api/accounts`.

**Edge cases:** platform disconnected while composing (disable its panel + warn); media exceeds platform duration/size limit; user deselects a platform after customizing it (preserve overrides in case re-selected); scheduling in the past due to timezone mix-up; duplicate rapid-click on Publish Now (idempotency key).

**Mock in v1:** hashtag/caption AI suggestions can be simple heuristic rules, not a real model; custom-thumbnail upload can be a placeholder control. **Production-ready in v1:** upload pipeline, validation, platform toggle/override logic, scheduling, publish-now, preview accuracy.

---

## Calendar — `/app/calendar`

**Purpose:** Visualize and rearrange the content pipeline; editorial command center.

**Components:** CalendarGrid (month/week/agenda), view-mode switcher, filter bar (platform/status/campaign), day cell with PostChip, DetailDrawer (preview, time, platforms, edit/duplicate/cancel), recommended-window highlight overlay.

**Data required:** PostTargets in visible range (thumbnail, title, time, platforms, status), recommendation heatmap (for day/window highlighting), filter facet values.

**User actions:** switch month/week/agenda; drag a post to a new day/time; click a post → open drawer; filter by platform/status/campaign; from drawer: edit (→ composer), duplicate, cancel scheduled post.

**Validation rules:** rescheduled time must be future + platform lead time; cannot drag a Published or Failed post (read-only in those states).

**States:** *Loading* — grid skeleton per visible range. *Empty* — no posts in range → "Nothing scheduled — plan your next post" with Create Post CTA. *Error* — drag-reschedule failure reverts the chip with a toast.

**API endpoints:** `GET /api/calendar?from&to`, `PATCH /api/targets/:id/reschedule`, `POST /api/targets/:id/cancel`, `POST /api/posts/:id/duplicate`, `GET /api/recommendations?platform=combined` (for overlay).

**Edge cases:** post targeting multiple platforms shown as one chip with both badges; overlapping posts same day/time (stack, don't clip); drag across month boundary in month view; cancelling a post that's mid-publish (lock while status=publishing).

**Mock in v1:** week-view hourly grid can initially reuse month-view data without a distinct hourly layout. **Production-ready in v1:** month view, agenda view, drag-to-reschedule, detail drawer, filters, status colors.

---

## Content Library — `/app/library`

**Purpose:** Central store of all drafts, uploaded media, and content assets; entry point to reuse/repurpose.

**Components:** search input, filter bar (status/platform/type/campaign/date), content grid (PostCard variant with thumbnail + metadata), "top performer" / "needs adaptation" tags, EmptyState.

**Data required:** paginated list of Posts with status, platforms, last-edited date, scheduled date if any, and a performance tag computed from analytics (top performer threshold).

**User actions:** search by title; filter; open an item → composer (pre-filled); duplicate an item.

**Validation rules:** none (read/browse page); search input debounced.

**States:** *Loading* — grid skeleton. *Empty* — no content yet → "Upload your first video" CTA; filtered-to-zero → "No content matches these filters" with clear-filters action. *Error* — failed page fetch → retry button, keep previously loaded items visible.

**API endpoints:** `GET /api/posts?status=&platform=&campaign=&q=&cursor=`.

**Edge cases:** very large libraries (cursor pagination, not offset); item with no thumbnail yet (processing state); item scheduled but its media was deleted (should not happen — guard on delete).

**Mock in v1:** "top performer" threshold can be a simple percentile rule rather than a tuned model. **Production-ready in v1:** search, filters, pagination, status accuracy, open-in-composer.

---

## Analytics — `/app/analytics`

**Purpose:** Cross-platform performance dashboard; understand what's working.

**Components:** platform filter tabs, date-range picker, compare-to-previous toggle, StatCard ×5, TrendChartCard ×2 (views, engagement), platform-comparison bar widget, content performance table (sortable), PlatformBadge/StatusBadge in rows.

**Data required:** KPI set + period-over-period deltas, two time series (views, engagement), per-platform view totals, paginated recent-post performance rows (views/likes/comments/shares/watch time/engagement/status).

**User actions:** switch platform filter; change date range; toggle comparison; sort/paginate the table; click a row → post detail or library.

**Validation rules:** date range must be valid (from ≤ to); range capped at data availability (e.g. disable beyond 90 days if that's the retention window in v1).

**States:** *Loading* — chart + table skeletons. *Empty* — no published posts yet → "No analytics yet — connect platforms and publish content to start receiving recommendations". *Error* — stale-data badge if last sync &gt;24h; failed fetch shows retry without clearing cached view.

**API endpoints:** `GET /api/analytics/overview`, `GET /api/analytics/timeseries?metric=&interval=`, `GET /api/analytics/posts?cursor=`.

**Edge cases:** post with data on only one platform (don't show N/A as 0); very new post with partial-day data skewing rates; TikTok/YouTube metric field mismatches (normalize into common schema, show "—" for unsupported fields per platform).

**Mock in v1:** watch-time/avg-watch-duration can be YouTube-only at first if TikTok tier doesn't expose it — label clearly rather than fake a number. **Production-ready in v1:** KPI accuracy, both trend charts, platform comparison, the performance table with real pagination/sorting.

---

## Recommendations — `/app/recommendations`

**Purpose:** Turn analytics into concrete best-time scheduling guidance; the hero differentiator.

**Components:** BestTimeCard ×3 (YouTube/TikTok/Combined) with confidence + sample size, HeatmapCard with platform tabs (YouTube/TikTok/Combined), CalculationExplainer panel, RecommendedActions list, one-click action buttons (schedule/apply/export).

**Data required:** best (day, hour) + confidence + sample size per platform and combined; full day×hour score grid per tab; plain-language method description; 2–3 templated recommended-action strings; export payload.

**User actions:** switch heatmap tab; hover a cell for detail; "Schedule next post at best time" → opens composer prefilled; "Apply best time to selected draft" → picks a draft, applies slot; "Export report" → downloads PDF/CSV.

**Validation rules:** applying a time still runs the composer's schedule validation (future time, lead time, timezone).

**States:** *Loading* — heatmap + card skeletons. *Empty/cold-start* — insufficient history (below sample-size threshold) → show benchmark-based recommendation clearly labeled "based on general benchmarks, not yet your own data" instead of hiding the feature. *Error* — recompute failure keeps last-known-good recommendation with a "last updated" timestamp rather than blanking.

**API endpoints:** `GET /api/recommendations?platform=youtube|tiktok|combined`, `POST /api/recommendations/apply`, `GET /api/recommendations/export`.

**Edge cases:** ties between two equally-strong slots (pick most recent/higher sample size, don't flicker); very sparse data producing noisy heatmap (apply the empirical-Bayes shrinkage from the spec so weak cells don't look falsely hot); user has only one platform connected (hide Combined tab, or show it disabled with explanation).

**Mock in v1:** cold-start benchmark values can be static per-category constants shipped at launch. **Production-ready in v1:** the heuristic scoring itself, confidence/sample-size display, heatmap rendering, apply-to-composer flow.

---

## Accounts — `/app/accounts`

**Purpose:** Manage platform connections and account health.

**Components:** ConnectionCard ×2 (YouTube, TikTok) with avatar/handle, status badge, last-synced time, capability chips (publishing/analytics/recommendations), action buttons (connect/reconnect/disconnect/test); "Coming soon" grid (Instagram, LinkedIn, X, Facebook).

**Data required:** per-account status, handle/avatar, lastSyncedAt, capability flags, scope/permission issues.

**User actions:** Connect (starts OAuth redirect); Reconnect (re-run OAuth on a flagged account); Disconnect (confirm dialog, then revoke); Test connection (ping, shows pass/fail toast).

**Validation rules:** disconnect requires confirmation if account has scheduled posts (warn they'll be cancelled/paused); reconnect must match the same external account (prevent silently swapping identities without warning).

**States:** *Loading* — card skeletons during initial fetch. *Empty* — nothing connected → prominent "Connect your first account" empty state (blocks most of the app functionally). *Error* — test-connection failure shows the platform's error reason inline; disconnect failure keeps the card in its prior state with a toast.

**API endpoints:** `GET /api/accounts`, `GET /api/accounts/:provider/connect`, `GET /api/accounts/:provider/callback`, `POST /api/accounts/:id/test`, `DELETE /api/accounts/:id`.

**Edge cases:** OAuth callback error/deny (return to page with a dismissible error, not a crash); account connected in another browser tab mid-session (poll or refetch on focus); reconnect flow started but abandoned (leave prior state untouched until callback completes).

**Mock in v1:** "coming soon" platform cards are static, non-interactive (just visual roadmap signaling). **Production-ready in v1:** full OAuth connect/reconnect/disconnect/test for YouTube + TikTok, accurate capability/health display.

---

## Settings — `/app/settings/*`

**Purpose:** Account, workspace, and product configuration.

**Components:** left tab list (Profile, Workspace, Team, Notifications, Billing, Publishing Defaults, Timezone & Calendar, AI Recommendations), per-tab form panels, toggle/select controls.

**Data required:** user profile, workspace metadata, member list + roles (Team), notification preferences, billing/plan info, default publish mode, timezone, recommendation-engine weighting preferences.

**User actions:** edit profile fields, change workspace name, invite/remove members (Team), toggle notification types, manage plan (Billing), set default publish mode + auto-apply-recommended toggle, set timezone, adjust AI weighting toggles (e.g. weight engagement over views) and recommendation history window.

**Validation rules:** email format; workspace slug uniqueness; timezone must be valid IANA string; role changes blocked for the sole Owner (can't demote/remove the last owner).

**States:** *Loading* — tab content skeleton per section. *Empty* — Team tab with only the owner → "Invite your first teammate". *Error* — inline field errors; save-failure toast keeps unsaved edits in the form (don't discard on failure).

**API endpoints:** `GET/PATCH /api/me`, `GET/PATCH /api/workspace`, `GET/POST/DELETE /api/workspace/members`, `GET/PATCH /api/settings/notifications`, `GET /api/billing`, `GET/PATCH /api/settings/publishing`, `GET/PATCH /api/settings/ai`.

**Edge cases:** last-owner protection; invite sent to an email already a member; downgrading plan while over its account-connection limit (block with explanation); AI weighting changes should trigger a recommendation recompute, not apply silently until next scheduled run.

**Mock in v1:** Billing tab can show a static plan summary without live payment-provider integration; Team invites can be stubbed (UI complete, email send deferred). **Production-ready in v1:** Profile, Publishing Defaults, Timezone, and AI Recommendation preference persistence — these directly affect other pages' behavior.
