# PostPilot — MVP Frontend Component Inventory

**Companion to:** `PostPilot Engineering Spec` · `PostPilot Implementation Checklist` · `PostPilot API Contract`
**Stack:** Next.js 14+ App Router (React Server Components + Client Components), Tailwind + shadcn/ui primitives, TanStack Query, react-hook-form + Zod.

---

## Conventions

- **Server-rendered (RSC):** no `useState`/event handlers of its own; renders from props/fetched data; ships zero client JS for that component.
- **Client:** needs interactivity (`'use client'`) — forms, drag/drop, hover, live updates, local UI state.
- **Reusable globally:** true if this component has no PostPilot-domain assumptions baked in and could be lifted into any product's shared UI layer as-is (mostly the Shared Form Components group + a few structural pieces). Domain components (know about "platform", "post", "recommendation") are marked false even if used on 2+ pages — they're app-specific, not general-purpose.

---

## 1. Layout Components

### AppShell
**Purpose:** Root authenticated layout — positions Sidebar, TopBar, and page content; owns the responsive breakpoint that collapses Sidebar to an icon rail.
**Props:** `children: ReactNode`
**State handled internally:** sidebar collapsed/expanded (persisted to localStorage), mobile drawer open/closed.
**Data passed from parent:** none — mounted once at `/app/layout.tsx`.
**Server or client:** Server shell wrapping a Client boundary for the collapse/drawer state.
**Reusable globally:** false (assumes Sidebar/TopBar composition specific to this app).

### Sidebar
**Purpose:** Primary left navigation — route links, workspace switcher, collapse toggle.
**Props:** `activeRoute: string`, `collapsed: boolean`, `onToggleCollapse: () => void`
**State handled internally:** hover states on nav items (CSS-only where possible).
**Data passed from parent:** current route (from Next.js `usePathname`), workspace list (from `/me`).
**Server or client:** Client (interactive toggle, active-route highlighting).
**Reusable globally:** false.

### TopBar
**Purpose:** Page title, contextual primary action (e.g. "Create Post" button), user avatar menu.
**Props:** `title: string`, `primaryAction?: { label: string; onClick: () => void }`
**State handled internally:** avatar dropdown open/closed.
**Data passed from parent:** page title (set per-route), current user (avatar/name).
**Server or client:** Client (dropdown interactivity).
**Reusable globally:** false (composition is app-specific; the dropdown itself could be extracted — see `Popover` in Shared).

### PageContainer
**Purpose:** Consistent max-width, padding, and vertical rhythm wrapper for every route's content.
**Props:** `children: ReactNode`, `maxWidth?: 'md'|'lg'|'xl'`
**State handled internally:** none.
**Data passed from parent:** none.
**Server or client:** Server.
**Reusable globally:** true — pure layout primitive, no domain logic.

### SectionCard
**Purpose:** The generic white bordered-card wrapper used to group content within a page (KPI rows, panels, tables all sit inside one of these).
**Props:** `title?: string`, `subtitle?: string`, `actions?: ReactNode`, `children: ReactNode`
**State handled internally:** none.
**Data passed from parent:** none.
**Server or client:** Server.
**Reusable globally:** true.

---

## 2. Navigation Components

### SidebarNavItem
**Purpose:** A single route link in the Sidebar — icon, label, active-state styling, optional badge (e.g. "needs review" count).
**Props:** `href: string`, `icon: ReactNode`, `label: string`, `active: boolean`, `badgeCount?: number`
**State handled internally:** none (active state is a prop, driven by the parent's route check).
**Data passed from parent:** `active` boolean, badge count (from workspace-level counts query).
**Server or client:** Server-renderable, but typically lives inside the Client Sidebar tree.
**Reusable globally:** true (generic nav-item pattern).

### WorkspaceSwitcher
**Purpose:** Dropdown to switch the active workspace (multi-workspace users) and jump to "Create workspace."
**Props:** `workspaces: {id, name}[]`, `activeWorkspaceId: string`, `onSwitch: (id: string) => void`
**State handled internally:** open/closed dropdown state.
**Data passed from parent:** workspace list + active id from `/me`.
**Server or client:** Client.
**Reusable globally:** false (workspace concept is app-specific), though the underlying dropdown shell is generic.

### MobileNavDrawer
**Purpose:** Slide-in nav drawer replacing the Sidebar under the mobile breakpoint.
**Props:** `open: boolean`, `onClose: () => void`, `children: ReactNode` (reuses SidebarNavItem list)
**State handled internally:** open animation state.
**Data passed from parent:** same nav data as Sidebar.
**Server or client:** Client.
**Reusable globally:** true as a drawer shell (pairs with the shared `Sheet` primitive), but the nav content it wraps is app-specific.

### Breadcrumbs
**Purpose:** Shows the path back to a list view from a detail screen (e.g. Library → Post Detail).
**Props:** `items: { label: string; href?: string }[]`
**State handled internally:** none.
**Data passed from parent:** breadcrumb trail computed per-route.
**Server or client:** Server.
**Reusable globally:** true.

---

## 3. Dashboard Components

### StatCard
**Purpose:** A single KPI tile (label, big number, optional delta vs. previous period). Used on both Dashboard and Analytics.
**Props:** `label: string`, `value: string | number`, `delta?: number`, `format?: 'number'|'percent'|'compact'`, `loading?: boolean`
**State handled internally:** none.
**Data passed from parent:** the raw KPI value + delta from `/analytics/overview` or `/calendar`.
**Server or client:** Server (pure display), with a client `Skeleton` swapped in while `loading`.
**Reusable globally:** true — generic metric-tile pattern, no PostPilot-specific assumptions.

### BestTimeHero
**Purpose:** The 3-slot "best time to post" callout (YouTube / TikTok / Combined) with confidence + CTA, shown on Dashboard and mirrored (larger) on Recommendations.
**Props:** `slots: { platform: 'youtube'|'tiktok'|'combined'; dayOfWeek: number; hour: number; confidence: number; isColdStart: boolean }[]`, `onApply: (slot) => void`
**State handled internally:** hover/focus states on each slot card.
**Data passed from parent:** resolved slots from `GET /recommendations`.
**Server or client:** Client (click handler triggers navigation/composer prefill).
**Reusable globally:** false.

### UpcomingPostsList
**Purpose:** Compact list of the next scheduled posts with thumbnail, time, platform badges, status.
**Props:** `posts: PostSummary[]`, `onSelect: (postId: string) => void`
**State handled internally:** none.
**Data passed from parent:** `GET /posts?status=scheduled&limit=5` result.
**Server or client:** Server list, client-wrapped only for the row click handler.
**Reusable globally:** false.

### PerformanceSnapshot
**Purpose:** Small views-trend chart + "top post" + "top day" callouts summarizing recent performance on the Dashboard (lighter version of the full Analytics page).
**Props:** `series: {date: string; value: number}[]`, `topPost: PostSummary | null`, `topDay: string | null`
**State handled internally:** chart hover tooltip state (delegated to Recharts internals).
**Data passed from parent:** `GET /analytics/timeseries` + `GET /analytics/posts?sort=views&limit=1`.
**Server or client:** Client (chart library requires it).
**Reusable globally:** false (composition specific), though it wraps the reusable `TrendChartCard`.

### QuickInsightsPanel
**Purpose:** 2–3 rule-derived insight strings ("Your TikTok engagement is up 12% this week") with light iconography — not a chat interface.
**Props:** `insights: { icon: ReactNode; text: string }[]`
**State handled internally:** none.
**Data passed from parent:** computed insight strings (derived server-side from analytics deltas).
**Server or client:** Server.
**Reusable globally:** false.

---

## 4. Composer Components

### MediaDropzone
**Purpose:** Drag-and-drop / click-to-upload target for the post's video, with progress bar and thumbnail preview once processed.
**Props:** `mediaAsset: MediaAsset | null`, `onUploadStart: (file: File) => void`, `uploadProgress: number`, `status: 'idle'|'uploading'|'processing'|'ready'|'failed'`
**State handled internally:** drag-over highlight state.
**Data passed from parent:** current media asset (if editing existing draft), upload progress from the uppy/tus instance owned by the parent's logic hook.
**Server or client:** Client (drag/drop + file APIs).
**Reusable globally:** false (tightly coupled to the presign/complete upload flow), though the drag-over visual shell is a common pattern.

### BaseContentForm
**Purpose:** The platform-agnostic fields — internal title, base caption, tags, campaign.
**Props:** `defaultValues: {internalTitle, baseCaption, tags, campaign}`, `onChange: (values) => void`
**State handled internally:** react-hook-form field state + validation errors.
**Data passed from parent:** draft defaults when editing.
**Server or client:** Client (form state).
**Reusable globally:** false (field set is domain-specific), but built from reusable `TextInput`/`TextArea`/`TagInput`.

### PlatformSelector
**Purpose:** Toggle cards for YouTube/TikTok — turning a platform on reveals its field panel and preview tab.
**Props:** `connectedAccounts: SocialAccount[]`, `selected: string[]`, `onToggle: (accountId: string) => void`
**State handled internally:** none (fully controlled).
**Data passed from parent:** connected accounts list, current selection.
**Server or client:** Client.
**Reusable globally:** false.

### PlatformFieldPanel
**Purpose:** Per-platform override fields — YouTube (title/description/visibility/made-for-kids/tags/thumbnail) or TikTok (caption/privacy/duet/stitch/comments), rendered as a tab or accordion section.
**Props:** `platform: 'youtube'|'tiktok'`, `values: PlatformOverrides`, `onChange: (values) => void`, `characterLimits: {field: string; max: number}[]`
**State handled internally:** local field focus/touched state for inline validation display.
**Data passed from parent:** current override values, platform char/field limits (static config).
**Server or client:** Client.
**Reusable globally:** false.

### SmartAdaptationPanel
**Purpose:** Surfaces non-blocking warnings and one-click suggestions ("Shorten TikTok caption", "Add hashtags", "YouTube title missing").
**Props:** `warnings: { id: string; severity: 'warning'; message: string; fixLabel?: string; onFix?: () => void }[]`
**State handled internally:** dismissed-warning ids (session-only).
**Data passed from parent:** warnings computed from current form values by the parent's validation hook.
**Server or client:** Client.
**Reusable globally:** false, though the visual "warning row with a fix button" shell is a reusable pattern worth extracting later.

### ScheduleControl
**Purpose:** Now / Draft / Schedule mode picker; date/time/timezone inputs; "use recommended time" shortcut.
**Props:** `mode: 'now'|'draft'|'schedule'`, `scheduledAt: string | null`, `timezone: string`, `recommendedSlot: {dayOfWeek, hour, confidence} | null`, `onChange: (patch) => void`
**State handled internally:** date-picker popover open/closed.
**Data passed from parent:** recommended slot (from `/recommendations`), workspace default timezone.
**Server or client:** Client.
**Reusable globally:** false (built on the reusable `DatePicker`/`TimePicker` shared components).

### PlatformPreview
**Purpose:** Renders a mocked YouTube or TikTok post preview so the user sees roughly what will publish; switchable between connected platforms.
**Props:** `platform: 'youtube'|'tiktok'`, `content: { title, caption, thumbnailUrl, channelName }`
**State handled internally:** none (pure render of whichever platform tab is active, tab state owned by parent).
**Data passed from parent:** merged base + override content per platform.
**Server or client:** Server-renderable (static preview markup), likely rendered inside a client tab container.
**Reusable globally:** false.

### ComposerFooterActions
**Purpose:** Sticky footer bar with Save Draft / Schedule / Publish Now buttons, showing validation-blocked state.
**Props:** `canPublish: boolean`, `isSaving: boolean`, `onSaveDraft`, `onSchedule`, `onPublishNow`
**State handled internally:** none.
**Data passed from parent:** aggregate validation result from the composer's form state.
**Server or client:** Client.
**Reusable globally:** false, built from the shared `Button`.

---

## 5. Calendar Components

### CalendarGrid
**Purpose:** Renders the month/week/agenda grid of days, each containing that day's `PostChip`s; owns the drag-and-drop reordering logic.
**Props:** `view: 'month'|'week'|'agenda'`, `days: { date: string; posts: PostSummary[] }[]`, `onDropPost: (postId, newDate) => void`, `highlightedSlots?: {dayOfWeek, hour}[]`
**State handled internally:** drag source/target tracking, optimistic post position during drag.
**Data passed from parent:** `GET /calendar` result for the visible range, recommendation heatmap for highlighting.
**Server or client:** Client (drag/drop).
**Reusable globally:** false.

### CalendarViewSwitcher
**Purpose:** Month / Week / Agenda tab control.
**Props:** `value: 'month'|'week'|'agenda'`, `onChange: (view) => void`
**State handled internally:** none.
**Data passed from parent:** current view (often synced to URL search param by parent).
**Server or client:** Client.
**Reusable globally:** true (generic tri-state tab switcher), built on the shared `Tabs` primitive.

### CalendarFilterBar
**Purpose:** Platform/status/campaign filter controls above the grid.
**Props:** `filters: {platform?, status?, campaign?}`, `onChange: (filters) => void`, `campaignOptions: string[]`
**State handled internally:** none (controlled; syncs to URL params in parent).
**Data passed from parent:** available campaign values (from a lightweight facet query).
**Server or client:** Client.
**Reusable globally:** false.

### PostChip
**Purpose:** The small draggable pill representing one scheduled post inside a day cell — thumbnail sliver, time, platform badge, status color.
**Props:** `post: PostSummary`, `draggable: boolean`, `onClick: () => void`
**State handled internally:** drag-active visual state.
**Data passed from parent:** post summary fields.
**Server or client:** Client (drag handle + click).
**Reusable globally:** false.

### PostDetailDrawer
**Purpose:** Side drawer opened from a PostChip click — larger preview, scheduled time, target platforms, Edit/Duplicate/Cancel actions.
**Props:** `post: PostDetail | null`, `open: boolean`, `onClose`, `onEdit`, `onDuplicate`, `onCancel`
**State handled internally:** confirm-cancel sub-dialog state.
**Data passed from parent:** full post detail from `GET /posts/:id`.
**Server or client:** Client (drawer open state, action handlers).
**Reusable globally:** false, built on the shared `Sheet` primitive.

### RecommendedWindowOverlay
**Purpose:** Subtle background tint on calendar cells/hours that fall within a high-confidence recommended posting window.
**Props:** `slots: {dayOfWeek, hour, score}[]`, `view: 'month'|'week'`
**State handled internally:** none.
**Data passed from parent:** recommendation heatmap subset relevant to the visible range.
**Server or client:** Server (pure conditional styling).
**Reusable globally:** false.

---

## 6. Analytics Components

### AnalyticsFilterBar
**Purpose:** Platform tabs + date-range picker + compare-to-previous toggle above the Analytics dashboard.
**Props:** `platform: 'all'|'youtube'|'tiktok'`, `range: {from, to}`, `compare: boolean`, `onChange: (patch) => void`
**State handled internally:** date-range popover open state.
**Data passed from parent:** current filter values (URL-synced).
**Server or client:** Client.
**Reusable globally:** false, built on shared `Tabs`/`DateRangePicker`.

### TrendChartCard
**Purpose:** Titled card wrapping a line/bar chart for a single metric over time (used for both views and engagement, on Dashboard and Analytics).
**Props:** `title: string`, `series: {date, value}[]`, `metricFormat: 'number'|'percent'`, `loading?: boolean`
**State handled internally:** chart tooltip hover (Recharts-internal).
**Data passed from parent:** `GET /analytics/timeseries` result.
**Server or client:** Client (charting library).
**Reusable globally:** true — generic time-series chart card, no PostPilot-specific logic beyond the data shape.

### PlatformComparisonBar
**Purpose:** Horizontal bar comparing totals (e.g. views) between YouTube and TikTok for the selected period.
**Props:** `data: { platform: 'youtube'|'tiktok'; value: number }[]`, `metricLabel: string`
**State handled internally:** none.
**Data passed from parent:** `GET /analytics/overview` per-platform breakdown.
**Server or client:** Client (uses the same chart library as TrendChartCard for consistent rendering).
**Reusable globally:** false (assumes exactly the two-platform PostPilot shape today).

### PostPerformanceTable
**Purpose:** Sortable, paginated table of individual posts with views/likes/comments/shares/engagement/status.
**Props:** `rows: PostPerformanceRow[]`, `sort: {field, order}`, `onSortChange`, `onRowClick: (postId) => void`, `nextCursor: string | null`, `onLoadMore`
**State handled internally:** none beyond hover-row styling (sort/pagination are controlled by parent, URL-synced).
**Data passed from parent:** `GET /analytics/posts` page.
**Server or client:** Client (sort/click interactivity), built on the shared `Table` primitive.
**Reusable globally:** false, though it's a thin domain wrapper over the reusable `Table`.

---

## 7. Recommendation Components

### BestTimeCard
**Purpose:** Single hero card showing one platform's (or Combined's) best slot, confidence, and sample size, with an action button.
**Props:** `platform: 'youtube'|'tiktok'|'combined'`, `dayOfWeek: number`, `hour: number`, `confidence: number`, `sampleSize: number`, `isColdStart: boolean`, `onAction: () => void`
**State handled internally:** none.
**Data passed from parent:** one slot from `GET /recommendations`.
**Server or client:** Server (pure display) with a client button handler wrapper.
**Reusable globally:** false.

### HeatmapGrid
**Purpose:** Day × hour grid where cell opacity/color encodes score; hover shows exact score/confidence/sample size.
**Props:** `cells: { dayOfWeek, hour, score, confidence, sampleSize }[]`, `onHoverCell?: (cell) => void`
**State handled internally:** hovered-cell id (for tooltip).
**Data passed from parent:** heatmap array from `GET /recommendations`.
**Server or client:** Client (hover tooltip).
**Reusable globally:** false, though the underlying "scored grid" rendering approach could generalize.

### PlatformTabs
**Purpose:** YouTube / TikTok / Combined tab switcher above the heatmap.
**Props:** `value: 'youtube'|'tiktok'|'combined'`, `onChange`, `disabledTabs?: string[]`
**State handled internally:** none.
**Data passed from parent:** current tab, and which tabs are disabled (e.g. Combined when <2 platforms connected).
**Server or client:** Client.
**Reusable globally:** true as a tab shell (built on shared `Tabs`), domain values passed in as props.

### CalculationExplainer
**Purpose:** Plain-language "how this is calculated" panel — explains the scoring/confidence methodology, builds trust in the heuristic.
**Props:** `methodologyText: string`, `isColdStart: boolean`
**State handled internally:** expand/collapse (if long).
**Data passed from parent:** static copy + cold-start flag.
**Server or client:** Server, with a client collapse toggle if needed.
**Reusable globally:** false.

### RecommendedActionsList
**Purpose:** 2–3 templated action rows ("Schedule your next post for Thu 7pm") with one-click buttons (schedule / apply-to-draft / export).
**Props:** `actions: { id: string; label: string; onClick: () => void }[]`
**State handled internally:** loading state per action while its click handler runs.
**Data passed from parent:** templated action definitions built server-side from the current recommendation set.
**Server or client:** Client.
**Reusable globally:** false.

---

## 8. Account / Integration Components

### ConnectionCard
**Purpose:** One connected platform's card — avatar/handle, status badge, capability chips, last-synced time, connect/reconnect/disconnect/test actions.
**Props:** `account: SocialAccount`, `onConnect`, `onReconnect`, `onDisconnect`, `onTest`, `testResult?: {ok: boolean; error?: string} | null`
**State handled internally:** test-in-progress spinner, disconnect-confirm sub-dialog.
**Data passed from parent:** account object from `GET /accounts`.
**Server or client:** Client (action handlers).
**Reusable globally:** false.

### ComingSoonPlatformCard
**Purpose:** Static, non-interactive card signaling a future integration (Instagram, LinkedIn, X, Facebook).
**Props:** `platformName: string`, `icon: ReactNode`
**State handled internally:** none.
**Data passed from parent:** static roadmap list (hardcoded config, not an API call).
**Server or client:** Server.
**Reusable globally:** true (generic "coming soon" tile pattern).

### OAuthConnectButton
**Purpose:** Button that kicks off the OAuth redirect flow for a given provider.
**Props:** `provider: 'youtube'|'tiktok'`, `label: string`
**State handled internally:** none (triggers a full-page navigation, not a fetch).
**Data passed from parent:** provider identity.
**Server or client:** Client (needs the click handler / `window.location` navigation).
**Reusable globally:** false, built on the shared `Button`.

### AccountHealthBadge
**Purpose:** Small colored badge summarizing account status (`active` / `needs_review` / `disconnected`) used on ConnectionCard and in Settings/Dashboard banners.
**Props:** `status: 'active'|'needs_review'|'disconnected'`
**State handled internally:** none.
**Data passed from parent:** status string.
**Server or client:** Server.
**Reusable globally:** false (values are domain-specific), though it's a thin wrapper over the reusable `Badge`.

---

## 9. Settings Components

### SettingsTabList
**Purpose:** Left-hand vertical tab list for Settings (Profile, Workspace, Team, Notifications, Billing, Publishing Defaults, Timezone, AI Recommendations).
**Props:** `tabs: {id, label}[]`, `activeTab: string`, `onChange: (id) => void`
**State handled internally:** none.
**Data passed from parent:** tab config (static) + active tab (URL-synced).
**Server or client:** Client.
**Reusable globally:** true as a vertical-tabs shell (built on shared `Tabs`).

### ProfileForm
**Purpose:** Name, avatar, email, timezone fields for the current user.
**Props:** `defaultValues: {name, email, avatarUrl, timezone}`, `onSubmit: (values) => Promise<void>`
**State handled internally:** react-hook-form state, save-in-progress.
**Data passed from parent:** current user from `/me`.
**Server or client:** Client.
**Reusable globally:** false.

### WorkspaceForm
**Purpose:** Workspace name/slug editing (owner/admin only).
**Props:** `defaultValues: {name, slug}`, `onSubmit`, `readOnly: boolean`
**State handled internally:** form state, slug-availability check debounce.
**Data passed from parent:** workspace record, current user's role (drives `readOnly`).
**Server or client:** Client.
**Reusable globally:** false.

### TeamMembersTable
**Purpose:** List of workspace members with role, invite/remove/change-role actions.
**Props:** `members: {id, name, email, role}[]`, `currentUserRole: string`, `onInvite`, `onRemove`, `onChangeRole`
**State handled internally:** invite-modal open state.
**Data passed from parent:** member list from `GET /workspace/members`.
**Server or client:** Client (row actions), built on the shared `Table`.
**Reusable globally:** false.

### NotificationPreferences
**Purpose:** Toggle list for notification types (publish success/fail, review requests, weekly summary).
**Props:** `preferences: Record<string, boolean>`, `onChange: (key, value) => void`
**State handled internally:** none (fully controlled).
**Data passed from parent:** current preference values.
**Server or client:** Client.
**Reusable globally:** false, built on the shared `Switch`.

### BillingPanel
**Purpose:** Current plan summary and upgrade/downgrade entry point.
**Props:** `plan: 'free'|'pro'|'agency'`, `usage: {accountsConnected, limit}`, `onManageBilling: () => void`
**State handled internally:** none.
**Data passed from parent:** `GET /billing` result.
**Server or client:** Server (static summary) with a client button for the billing-portal handoff.
**Reusable globally:** false.

### PublishingDefaultsForm
**Purpose:** Default publish mode (draft/schedule/now) and "auto-apply recommended time" toggle.
**Props:** `defaultValues: {defaultMode, autoApplyRecommended}`, `onSubmit`
**State handled internally:** form state.
**Data passed from parent:** `GET /settings/publishing` result.
**Server or client:** Client.
**Reusable globally:** false.

### AITuningPanel
**Purpose:** Weighting sliders for the recommendation engine (engagement vs. views vs. watch time) and history-window selector.
**Props:** `weights: {engagement, views, watchTime}`, `historyWindowDays: number`, `onChange`
**State handled internally:** local slider drag state before committing on release.
**Data passed from parent:** `GET /settings/ai` result.
**Server or client:** Client.
**Reusable globally:** false, built on the shared `Slider`/`Select`.

---

## 10. Shared Form Components

### Button
**Purpose:** Primary/secondary/ghost/destructive button variants with loading and disabled states, used everywhere.
**Props:** `variant: 'primary'|'secondary'|'ghost'|'destructive'`, `size: 'sm'|'md'|'lg'`, `loading?: boolean`, `disabled?: boolean`, `onClick`, `children`
**State handled internally:** none (visual states are prop-driven).
**Data passed from parent:** none.
**Server or client:** Server-renderable; only needs `'use client'` when `onClick` is attached directly (Next.js requires the boundary at the interactive leaf).
**Reusable globally:** true.

### TextInput / TextArea
**Purpose:** Styled text field wrapping a native `input`/`textarea` with label, helper text, and error state.
**Props:** `label?: string`, `value`, `onChange`, `error?: string`, `maxLength?: number`, `placeholder?: string`
**State handled internally:** focus state (for styling only).
**Data passed from parent:** controlled value + validation error string.
**Server or client:** Client (controlled input).
**Reusable globally:** true.

### Select
**Purpose:** Dropdown select (native or Radix-based) with label and error state.
**Props:** `label?: string`, `value`, `onChange`, `options: {value, label}[]`, `error?: string`
**State handled internally:** open/closed dropdown state.
**Data passed from parent:** options list, controlled value.
**Server or client:** Client.
**Reusable globally:** true.

### DatePicker / TimePicker
**Purpose:** Calendar and time-of-day pickers used by ScheduleControl and Analytics date-range filters.
**Props:** `value: string | null`, `onChange`, `minDate?: string`, `timezone?: string`
**State handled internally:** popover open state, currently-displayed month.
**Data passed from parent:** controlled value, min/max bounds.
**Server or client:** Client.
**Reusable globally:** true.

### Toggle / Switch
**Purpose:** Boolean on/off control used throughout Settings and platform field panels (e.g. made-for-kids, allow-duet).
**Props:** `checked: boolean`, `onChange`, `label?: string`, `disabled?: boolean`
**State handled internally:** none.
**Data passed from parent:** controlled checked state.
**Server or client:** Client.
**Reusable globally:** true.

### Tabs
**Purpose:** Generic tab-strip primitive underlying CalendarViewSwitcher, PlatformTabs, AnalyticsFilterBar platform tabs, SettingsTabList.
**Props:** `items: {id, label}[]`, `value: string`, `onChange`, `orientation?: 'horizontal'|'vertical'`
**State handled internally:** none (fully controlled; hover/focus styling only).
**Data passed from parent:** tab list, active value.
**Server or client:** Client.
**Reusable globally:** true.

### Modal / Dialog
**Purpose:** Centered overlay dialog for confirmations (disconnect account, delete post) and small forms (invite teammate).
**Props:** `open: boolean`, `onClose`, `title: string`, `children: ReactNode`, `footer?: ReactNode`
**State handled internally:** focus-trap/escape-key handling (via Radix Dialog).
**Data passed from parent:** open state, content.
**Server or client:** Client.
**Reusable globally:** true.

### Sheet (Drawer)
**Purpose:** Slide-in side panel underlying PostDetailDrawer and MobileNavDrawer.
**Props:** `open: boolean`, `onClose`, `side: 'left'|'right'`, `children: ReactNode`
**State handled internally:** slide animation state.
**Data passed from parent:** open state, content.
**Server or client:** Client.
**Reusable globally:** true.

### Toast
**Purpose:** Transient notification for mutation success/failure (e.g. "Post scheduled", "Failed to disconnect account").
**Props:** `message: string`, `variant: 'success'|'error'|'info'`, `duration?: number`
**State handled internally:** auto-dismiss timer.
**Data passed from parent:** triggered imperatively from a global toast manager/hook, not passed as a prop tree.
**Server or client:** Client.
**Reusable globally:** true.

### Skeleton
**Purpose:** Loading placeholder shape (card/row/chart outline) shown while data is in flight.
**Props:** `variant: 'card'|'row'|'chart'|'text'`, `count?: number`
**State handled internally:** shimmer animation (CSS-only).
**Data passed from parent:** none.
**Server or client:** Server-renderable (pure CSS animation, no JS needed).
**Reusable globally:** true.

### PlatformBadge / StatusBadge
**Purpose:** Small colored pill labeling a platform (YouTube/TikTok) or a post/account status.
**Props:** `type: 'platform'|'status'`, `value: string`
**State handled internally:** none.
**Data passed from parent:** the platform or status value.
**Server or client:** Server.
**Reusable globally:** true as the underlying `Badge` primitive; the platform/status color-mapping layer on top is domain-specific.

### EmptyState
**Purpose:** Standard "nothing here yet" block — icon, message, primary CTA — used across Dashboard, Library, Calendar, Analytics, Accounts.
**Props:** `icon: ReactNode`, `title: string`, `description?: string`, `actionLabel?: string`, `onAction?: () => void`
**State handled internally:** none.
**Data passed from parent:** copy + action handler, varies per page.
**Server or client:** Server, with a client wrapper only around the action button.
**Reusable globally:** true.

---

## Reuse Map (Cross-References)

- **StatCard** → Dashboard + Analytics.
- **TrendChartCard** → Dashboard (PerformanceSnapshot) + Analytics.
- **PlatformBadge / StatusBadge** → PostChip, UpcomingPostsList, PostPerformanceTable, ConnectionCard, TeamMembersTable (role badge reuses the same shell with different colors).
- **Tabs** → CalendarViewSwitcher, PlatformTabs, AnalyticsFilterBar, SettingsTabList.
- **EmptyState** → every list/grid page's zero-data condition.
- **Sheet** → PostDetailDrawer, MobileNavDrawer.
- **Button / TextInput / Select / Toggle** → every form in Composer and Settings.

Building the 12 Shared Form Components first (Phase 1 of the roadmap) means every subsequent domain component in groups 3–9 composes from an already-solid, consistent base — this is the practical reason "Foundations" in the build roadmap includes the component-library primitives before any domain page work starts.
