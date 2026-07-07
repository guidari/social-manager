# PostPilot — MVP Database Schema

**Companion to:** `PostPilot Engineering Spec` · `PostPilot Implementation Checklist`
**Database:** PostgreSQL 15+ · accessed via Prisma ORM · hosted on Supabase in dev/staging
**Scope:** 13 tables covering auth/workspace, integrations, content, scheduling, publishing, analytics, and recommendations.

---

## Conventions

- All primary keys are `uuid` (`gen_random_uuid()`), except where noted.
- All tables have `created_at timestamptz` and `updated_at timestamptz` (auto-managed).
- Money/plan fields aside, all timestamps are stored in UTC; per-workspace/user timezone is applied at render time.
- Soft-delete is **not** used in MVP — hard delete with cascade rules noted per table (simplifies MVP; revisit if audit/compliance needs retention).
- Foreign keys are named `<referenced_table_singular>_id`.

---

## 1. `users`

**Purpose:** A person who can log in. Root identity for auth; may belong to multiple workspaces.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `email` | `citext` | unique, required |
| `password_hash` | `text` | nullable (OAuth-only users have none) |
| `name` | `text` | required |
| `avatar_url` | `text` | nullable |
| `timezone` | `text` | IANA string, default `'UTC'` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | auto |

**Relationships:** has many `workspace_members` (→ `workspaces` via join); has many `audit_logs` (as actor).

**Indexes:** unique index on `email`.

**Constraints:** `email` unique + valid-format check; at least one of `password_hash` / linked OAuth identity must exist (enforced at application layer for MVP).

---

## 2. `workspaces`

**Purpose:** The billing/ownership boundary. All content, accounts, and analytics are scoped to a workspace.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | required |
| `slug` | `text` | unique, required (URL-safe) |
| `plan` | `text` (enum: `free`, `pro`, `agency`) | default `'free'` |
| `default_timezone` | `text` | IANA string, default `'UTC'` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Relationships:** has many `workspace_members`, `social_accounts`, `content_drafts`, `recommendation_summaries`.

**Indexes:** unique index on `slug`.

**Constraints:** `slug` unique, lowercase/alphanumeric-dash check.

---

## 3. `workspace_members`

**Purpose:** Join table between `users` and `workspaces`; carries the role used by the `can()` policy layer.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK → `workspaces.id`, required |
| `user_id` | `uuid` | FK → `users.id`, required |
| `role` | `text` (enum: `owner`, `admin`, `editor`, `reviewer`) | required |
| `invited_email` | `citext` | nullable — set when invite is pending and user hasn't signed up yet |
| `joined_at` | `timestamptz` | nullable until accepted |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Relationships:** belongs to `workspaces`; belongs to `users`.

**Indexes:** unique composite index on `(workspace_id, user_id)`; index on `user_id` (list "my workspaces").

**Constraints:** unique `(workspace_id, user_id)` — a user has exactly one role per workspace; exactly one `owner` per workspace enforced at application layer (cannot demote/remove the last owner).

---

## 4. `social_accounts`

**Purpose:** A connected external platform account (YouTube channel, TikTok account) owned by a workspace.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK → `workspaces.id`, required |
| `provider` | `text` (enum: `youtube`, `tiktok`) | required |
| `external_account_id` | `text` | provider's own ID for the channel/account, required |
| `handle` | `text` | display handle/username |
| `avatar_url` | `text` | nullable |
| `status` | `text` (enum: `active`, `needs_review`, `disconnected`) | default `'active'` |
| `capabilities` | `jsonb` | e.g. `{"publish": true, "analytics": true}` |
| `scopes` | `text[]` | granted OAuth scopes |
| `last_synced_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Relationships:** belongs to `workspaces`; has one `account_tokens`; has many `post_platform_variants`, `analytics_snapshots` (indirectly via variant), `publishing_jobs` (indirectly).

**Indexes:** unique composite index on `(workspace_id, provider, external_account_id)` (prevent connecting the same external account twice); index on `(workspace_id, status)` for health dashboards.

**Constraints:** unique `(workspace_id, provider, external_account_id)`.

---

## 5. `account_tokens`

**Purpose:** OAuth credentials and metadata for a `social_accounts` row. Isolated into its own table so encrypted secrets are never joined into general reads.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `social_account_id` | `uuid` | FK → `social_accounts.id`, unique, required |
| `access_token_enc` | `text` | encrypted at rest (KMS/libsodium), required |
| `refresh_token_enc` | `text` | encrypted at rest, nullable (some providers rotate differently) |
| `token_type` | `text` | e.g. `'bearer'` |
| `expires_at` | `timestamptz` | required |
| `scope` | `text` | raw scope string as returned by provider |
| `last_refreshed_at` | `timestamptz` | nullable |
| `refresh_failure_count` | `int` | default `0` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Relationships:** belongs to `social_accounts` (1–1).

**Indexes:** unique index on `social_account_id`; index on `expires_at` (token-refresh queue polls this ahead of expiry).

**Constraints:** unique `social_account_id`; access/refresh tokens never exposed via API serialization (application-layer field omission).

---

## 6. `content_drafts`

**Purpose:** The base, platform-agnostic content object created in the composer — title/caption/tags/media before per-platform adaptation. This is the "Post" entity from the product spec.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK → `workspaces.id`, required |
| `author_id` | `uuid` | FK → `users.id`, required |
| `internal_title` | `text` | required (not shown on any platform) |
| `base_caption` | `text` | nullable |
| `tags` | `text[]` | default `{}` |
| `campaign` | `text` | nullable, freeform grouping label |
| `media_asset_id` | `uuid` | FK → `media_assets.id`, nullable (draft may be created before upload completes) |
| `status` | `text` (enum: `draft`, `scheduled`, `publishing`, `published`, `failed`, `needs_review`) | default `'draft'` — **derived/rolled-up** from its `scheduled_posts`; see note below |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Relationships:** belongs to `workspaces`, `users` (author); belongs to `media_assets`; has many `scheduled_posts` (one per target platform).

**Indexes:** index on `(workspace_id, status)`; index on `(workspace_id, campaign)`; GIN index on `tags`; full-text index on `internal_title` for library search.

**Constraints:** none blocking at DB level beyond FKs; "≥1 platform selected" and per-platform validation are application/Zod-layer rules, not DB constraints, since a draft may legitimately have zero targets before the user picks platforms.

> **Note:** `content_drafts.status` is a convenience rollup (worst/most-advanced state across its `scheduled_posts`), recomputed on any child status change — avoids recalculating on every dashboard/library read.

---

## 7. `media_assets`

**Purpose:** An uploaded file (video, thumbnail image) stored in S3, independent of any specific draft so it can be probed/reused.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK → `workspaces.id`, required |
| `uploaded_by_id` | `uuid` | FK → `users.id`, required |
| `s3_key` | `text` | required |
| `mime_type` | `text` | required |
| `size_bytes` | `bigint` | required |
| `duration_sec` | `numeric(10,2)` | nullable until ffprobe completes |
| `width` | `int` | nullable |
| `height` | `int` | nullable |
| `status` | `text` (enum: `uploading`, `processing`, `ready`, `failed`) | default `'uploading'` |
| `thumbnail_url` | `text` | nullable, generated preview |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Relationships:** belongs to `workspaces`, `users` (uploader); referenced by `content_drafts.media_asset_id`.

**Indexes:** index on `(workspace_id, status)`.

**Constraints:** `size_bytes > 0`; deletion of a `media_asset` referenced by a non-terminal `content_draft` (status not in `published`/`failed`) is blocked at application layer.

---

## 8. `scheduled_posts`

**Purpose:** The unit the scheduler and publisher act on — one row per (draft × target platform account). Equivalent to "PostTarget" in the product spec. Holds timing and lifecycle state independent of the parent draft.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `content_draft_id` | `uuid` | FK → `content_drafts.id`, required |
| `social_account_id` | `uuid` | FK → `social_accounts.id`, required |
| `platform` | `text` (enum: `youtube`, `tiktok`) | required, denormalized from `social_accounts.provider` for fast filtering |
| `scheduled_at` | `timestamptz` | nullable (null while still a draft target) |
| `timezone` | `text` | IANA string used when the user picked the time |
| `status` | `text` (enum: `draft`, `scheduled`, `publishing`, `published`, `failed`, `cancelled`, `needs_review`) | default `'draft'` |
| `external_post_id` | `text` | nullable, provider's ID once published |
| `published_at` | `timestamptz` | nullable |
| `failure_reason` | `text` | nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Relationships:** belongs to `content_drafts`; belongs to `social_accounts`; has one `post_platform_variants`; has many `publishing_jobs`, `analytics_snapshots`.

**Indexes:** composite index on `(status, scheduled_at)` — the scheduler/sweeper's primary poll query; index on `(social_account_id, status)`; index on `content_draft_id`.

**Constraints:** `scheduled_at` required when `status = 'scheduled'` (app-layer + optional CHECK); unique `(content_draft_id, social_account_id)` — a draft targets a given account at most once.

---

## 9. `post_platform_variants`

**Purpose:** Platform-specific field overrides layered on top of the base draft (title/description/visibility for YouTube; caption/privacy/duet-stitch for TikTok). One-to-one with `scheduled_posts`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `scheduled_post_id` | `uuid` | FK → `scheduled_posts.id`, unique, required |
| `title` | `text` | nullable (YouTube) |
| `description` | `text` | nullable (YouTube) |
| `caption` | `text` | nullable (TikTok) |
| `visibility` | `text` (enum: `public`, `unlisted`, `private`) | nullable (YouTube) |
| `privacy_level` | `text` (enum: `public`, `friends`, `private`) | nullable (TikTok) |
| `made_for_kids` | `boolean` | nullable (YouTube, required at publish time) |
| `allow_comments` | `boolean` | default `true` (TikTok) |
| `allow_duet` | `boolean` | default `true` (TikTok) |
| `allow_stitch` | `boolean` | default `true` (TikTok) |
| `custom_thumbnail_media_id` | `uuid` | FK → `media_assets.id`, nullable |
| `tags_override` | `text[]` | nullable, falls back to draft tags if null |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Relationships:** belongs to `scheduled_posts` (1–1); optionally belongs to `media_assets` (thumbnail).

**Indexes:** unique index on `scheduled_post_id`.

**Constraints:** unique `scheduled_post_id`; `made_for_kids` NOT NULL enforced at publish-time validation (not a DB-level NOT NULL, since it's irrelevant until publish).

---

## 10. `publishing_jobs`

**Purpose:** An execution record of the worker attempting to publish a `scheduled_post` — the audit trail behind the BullMQ `publish` queue, decoupled from the queue itself so history survives job completion/removal.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `scheduled_post_id` | `uuid` | FK → `scheduled_posts.id`, required |
| `queue_job_id` | `text` | BullMQ job id, nullable |
| `attempt` | `int` | default `1` |
| `status` | `text` (enum: `queued`, `running`, `succeeded`, `failed`) | default `'queued'` |
| `started_at` | `timestamptz` | nullable |
| `finished_at` | `timestamptz` | nullable |
| `error_message` | `text` | nullable |
| `created_at` | `timestamptz` | |

**Relationships:** belongs to `scheduled_posts`.

**Indexes:** index on `(scheduled_post_id, created_at)` — latest attempt lookup; index on `status` for ops dashboards.

**Constraints:** `attempt >= 1`.

---

## 11. `analytics_snapshots`

**Purpose:** An immutable point-in-time metrics read for a published `scheduled_post`, captured repeatedly on a decaying cadence to build a growth curve. Equivalent to "MetricSnapshot" in the product spec.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `scheduled_post_id` | `uuid` | FK → `scheduled_posts.id`, required |
| `captured_at` | `timestamptz` | required |
| `views` | `bigint` | default `0` |
| `likes` | `bigint` | default `0` |
| `comments` | `bigint` | default `0` |
| `shares` | `bigint` | default `0` |
| `watch_time_sec` | `bigint` | nullable (platform may not expose) |
| `engagement_rate` | `numeric(6,4)` | nullable, computed at write time |
| `created_at` | `timestamptz` | |

**Relationships:** belongs to `scheduled_posts`.

**Indexes:** composite index on `(scheduled_post_id, captured_at)`; index on `captured_at` for nightly rollup jobs.

**Constraints:** rows are append-only — no `updated_at`, no in-place mutation; unique `(scheduled_post_id, captured_at)` to prevent duplicate polls.

---

## 12. `recommendation_summaries`

**Purpose:** The persisted output of the posting-time recommendation engine — one row per (workspace × platform-or-combined × day × hour) cell, rebuilt by the recompute job. Equivalent to "Recommendation" in the product spec.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK → `workspaces.id`, required |
| `platform` | `text` (enum: `youtube`, `tiktok`, `combined`) | required |
| `day_of_week` | `smallint` | `0`–`6`, required |
| `hour` | `smallint` | `0`–`23`, required |
| `score` | `numeric(6,4)` | required, z-scored |
| `confidence` | `numeric(4,3)` | `0`–`1`, required |
| `sample_size` | `int` | default `0` |
| `is_cold_start` | `boolean` | default `false` — true when seeded from benchmarks, not first-party data |
| `computed_at` | `timestamptz` | required |

**Relationships:** belongs to `workspaces`.

**Indexes:** unique composite index on `(workspace_id, platform, day_of_week, hour)`; index on `(workspace_id, platform, score desc)` for "best slot" queries.

**Constraints:** unique `(workspace_id, platform, day_of_week, hour)`; `day_of_week` CHECK `0`–`6`; `hour` CHECK `0`–`23`; `confidence` CHECK `0`–`1`.

---

## 13. `audit_logs`

**Purpose:** Cross-cutting append-only record of significant actions (account connect/disconnect, publish, schedule change, settings change, member role change) for support/debugging and future compliance needs.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `workspace_id` | `uuid` | FK → `workspaces.id`, nullable (some actions are account-level, pre-workspace) |
| `actor_user_id` | `uuid` | FK → `users.id`, nullable (system/worker-initiated actions have no user) |
| `action` | `text` | e.g. `'post.published'`, `'account.disconnected'`, `'member.role_changed'` |
| `resource_type` | `text` | e.g. `'scheduled_post'`, `'social_account'` |
| `resource_id` | `uuid` | nullable |
| `metadata` | `jsonb` | freeform context (before/after values, error detail) |
| `created_at` | `timestamptz` | required |

**Relationships:** belongs to `workspaces` (optional); belongs to `users` (optional, actor).

**Indexes:** index on `(workspace_id, created_at desc)`; index on `(resource_type, resource_id)`.

**Constraints:** append-only, no updates; retention policy (e.g. 1 year) enforced by a scheduled cleanup job, not a DB constraint.

---

## Entity Relationship Summary

```
users ──< workspace_members >── workspaces
                                    │
                                    ├──< social_accounts ──1:1── account_tokens
                                    │         │
                                    │         └──< scheduled_posts (via social_account_id)
                                    │
                                    ├──< content_drafts ──< scheduled_posts ──1:1── post_platform_variants
                                    │         │                    │
                                    │         └── media_asset       ├──< publishing_jobs
                                    │                                └──< analytics_snapshots
                                    │
                                    ├──< recommendation_summaries
                                    │
                                    └──< audit_logs

media_assets ──< content_drafts (media_asset_id)
media_assets ──< post_platform_variants (custom_thumbnail_media_id)
users ──< audit_logs (actor)
```

---

## Prisma Schema

> **Supabase note:** `DATABASE_URL` should point at Supabase's shared transaction-mode
> pooler (port 6543, `?pgbouncer=true`) for runtime queries; `directUrl` points at the
> shared session-mode pooler (port 5432), which Prisma Migrate needs because the
> transaction-mode pooler doesn't support the DDL migrations run. Supabase also
> pre-installs a few extensions (`pgcrypto`, `uuid-ossp`, `pg_stat_statements`,
> `supabase_vault`) that aren't declared below — `prisma migrate dev` will see these as
> drift on a fresh project and offer to reset the schema. Until that's resolved (e.g. by
> baselining the migration history), use `prisma db push` to sync schema changes instead.

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [citext]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

enum WorkspaceRole {
  owner
  admin
  editor
  reviewer
}

enum WorkspacePlan {
  free
  pro
  agency
}

enum Provider {
  youtube
  tiktok
}

enum AccountStatus {
  active
  needs_review
  disconnected
}

enum MediaStatus {
  uploading
  processing
  ready
  failed
}

enum DraftStatus {
  draft
  scheduled
  publishing
  published
  failed
  needs_review
}

enum PostStatus {
  draft
  scheduled
  publishing
  published
  failed
  cancelled
  needs_review
}

enum Visibility {
  public
  unlisted
  private
}

enum TikTokPrivacy {
  public
  friends
  private
}

enum JobStatus {
  queued
  running
  succeeded
  failed
}

enum RecommendationPlatform {
  youtube
  tiktok
  combined
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique @db.Citext
  passwordHash String?  @map("password_hash")
  name         String
  avatarUrl    String?  @map("avatar_url")
  timezone     String   @default("UTC")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  memberships   WorkspaceMember[]
  mediaAssets   MediaAsset[]
  contentDrafts ContentDraft[]
  auditLogs     AuditLog[]

  @@map("users")
}

model Workspace {
  id               String        @id @default(uuid())
  name             String
  slug             String        @unique
  plan             WorkspacePlan @default(free)
  defaultTimezone  String        @default("UTC") @map("default_timezone")
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  members         WorkspaceMember[]
  socialAccounts  SocialAccount[]
  contentDrafts   ContentDraft[]
  mediaAssets     MediaAsset[]
  recommendations RecommendationSummary[]
  auditLogs       AuditLog[]

  @@map("workspaces")
}

model WorkspaceMember {
  id            String        @id @default(uuid())
  workspaceId   String        @map("workspace_id")
  userId        String        @map("user_id")
  role          WorkspaceRole
  invitedEmail  String?       @map("invited_email") @db.Citext
  joinedAt      DateTime?     @map("joined_at")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([userId])
  @@map("workspace_members")
}

model SocialAccount {
  id                 String        @id @default(uuid())
  workspaceId        String        @map("workspace_id")
  provider           Provider
  externalAccountId  String        @map("external_account_id")
  handle             String?
  avatarUrl          String?       @map("avatar_url")
  status             AccountStatus @default(active)
  capabilities       Json          @default("{}")
  scopes             String[]
  lastSyncedAt       DateTime?     @map("last_synced_at")
  createdAt          DateTime      @default(now()) @map("created_at")
  updatedAt          DateTime      @updatedAt @map("updated_at")

  workspace       Workspace        @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  token           AccountToken?
  scheduledPosts  ScheduledPost[]

  @@unique([workspaceId, provider, externalAccountId])
  @@index([workspaceId, status])
  @@map("social_accounts")
}

model AccountToken {
  id                    String    @id @default(uuid())
  socialAccountId       String    @unique @map("social_account_id")
  accessTokenEnc        String    @map("access_token_enc")
  refreshTokenEnc       String?   @map("refresh_token_enc")
  tokenType             String?   @map("token_type")
  expiresAt             DateTime  @map("expires_at")
  scope                 String?
  lastRefreshedAt       DateTime? @map("last_refreshed_at")
  refreshFailureCount   Int       @default(0) @map("refresh_failure_count")
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  socialAccount SocialAccount @relation(fields: [socialAccountId], references: [id], onDelete: Cascade)

  @@index([expiresAt])
  @@map("account_tokens")
}

model ContentDraft {
  id             String      @id @default(uuid())
  workspaceId    String      @map("workspace_id")
  authorId       String      @map("author_id")
  internalTitle  String      @map("internal_title")
  baseCaption    String?     @map("base_caption")
  tags           String[]    @default([])
  campaign       String?
  mediaAssetId   String?     @map("media_asset_id")
  status         DraftStatus @default(draft)
  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")

  workspace      Workspace       @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  author         User            @relation(fields: [authorId], references: [id])
  mediaAsset     MediaAsset?     @relation(fields: [mediaAssetId], references: [id])
  scheduledPosts ScheduledPost[]

  @@index([workspaceId, status])
  @@index([workspaceId, campaign])
  @@map("content_drafts")
}

model MediaAsset {
  id             String      @id @default(uuid())
  workspaceId    String      @map("workspace_id")
  uploadedById   String      @map("uploaded_by_id")
  s3Key          String      @map("s3_key")
  mimeType       String      @map("mime_type")
  sizeBytes      BigInt      @map("size_bytes")
  durationSec    Decimal?    @map("duration_sec") @db.Decimal(10, 2)
  width          Int?
  height         Int?
  status         MediaStatus @default(uploading)
  thumbnailUrl   String?     @map("thumbnail_url")
  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")

  workspace     Workspace          @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  uploadedBy    User               @relation(fields: [uploadedById], references: [id])
  drafts        ContentDraft[]
  thumbnailFor  PostPlatformVariant[]

  @@index([workspaceId, status])
  @@map("media_assets")
}

model ScheduledPost {
  id               String     @id @default(uuid())
  contentDraftId   String     @map("content_draft_id")
  socialAccountId  String     @map("social_account_id")
  platform         Provider
  scheduledAt      DateTime?  @map("scheduled_at")
  timezone         String?
  status           PostStatus @default(draft)
  externalPostId   String?    @map("external_post_id")
  publishedAt      DateTime?  @map("published_at")
  failureReason    String?    @map("failure_reason")
  createdAt        DateTime   @default(now()) @map("created_at")
  updatedAt        DateTime   @updatedAt @map("updated_at")

  contentDraft  ContentDraft         @relation(fields: [contentDraftId], references: [id], onDelete: Cascade)
  socialAccount SocialAccount        @relation(fields: [socialAccountId], references: [id])
  variant       PostPlatformVariant?
  jobs          PublishingJob[]
  snapshots     AnalyticsSnapshot[]

  @@unique([contentDraftId, socialAccountId])
  @@index([status, scheduledAt])
  @@index([socialAccountId, status])
  @@map("scheduled_posts")
}

model PostPlatformVariant {
  id                      String         @id @default(uuid())
  scheduledPostId         String         @unique @map("scheduled_post_id")
  title                   String?
  description             String?
  caption                 String?
  visibility              Visibility?
  privacyLevel            TikTokPrivacy? @map("privacy_level")
  madeForKids             Boolean?       @map("made_for_kids")
  allowComments           Boolean        @default(true) @map("allow_comments")
  allowDuet               Boolean        @default(true) @map("allow_duet")
  allowStitch             Boolean        @default(true) @map("allow_stitch")
  customThumbnailMediaId  String?        @map("custom_thumbnail_media_id")
  tagsOverride            String[]?      @map("tags_override")
  createdAt               DateTime       @default(now()) @map("created_at")
  updatedAt               DateTime       @updatedAt @map("updated_at")

  scheduledPost     ScheduledPost @relation(fields: [scheduledPostId], references: [id], onDelete: Cascade)
  customThumbnail   MediaAsset?   @relation(fields: [customThumbnailMediaId], references: [id])

  @@map("post_platform_variants")
}

model PublishingJob {
  id              String    @id @default(uuid())
  scheduledPostId String    @map("scheduled_post_id")
  queueJobId      String?   @map("queue_job_id")
  attempt         Int       @default(1)
  status          JobStatus @default(queued)
  startedAt       DateTime? @map("started_at")
  finishedAt      DateTime? @map("finished_at")
  errorMessage    String?   @map("error_message")
  createdAt       DateTime  @default(now()) @map("created_at")

  scheduledPost ScheduledPost @relation(fields: [scheduledPostId], references: [id], onDelete: Cascade)

  @@index([scheduledPostId, createdAt])
  @@index([status])
  @@map("publishing_jobs")
}

model AnalyticsSnapshot {
  id               String   @id @default(uuid())
  scheduledPostId  String   @map("scheduled_post_id")
  capturedAt       DateTime @map("captured_at")
  views            BigInt   @default(0)
  likes            BigInt   @default(0)
  comments         BigInt   @default(0)
  shares           BigInt   @default(0)
  watchTimeSec     BigInt?  @map("watch_time_sec")
  engagementRate   Decimal? @map("engagement_rate") @db.Decimal(6, 4)
  createdAt        DateTime @default(now()) @map("created_at")

  scheduledPost ScheduledPost @relation(fields: [scheduledPostId], references: [id], onDelete: Cascade)

  @@unique([scheduledPostId, capturedAt])
  @@index([capturedAt])
  @@map("analytics_snapshots")
}

model RecommendationSummary {
  id           String                 @id @default(uuid())
  workspaceId  String                 @map("workspace_id")
  platform     RecommendationPlatform
  dayOfWeek    Int                    @map("day_of_week")
  hour         Int
  score        Decimal                @db.Decimal(6, 4)
  confidence   Decimal                @db.Decimal(4, 3)
  sampleSize   Int                    @default(0) @map("sample_size")
  isColdStart  Boolean                @default(false) @map("is_cold_start")
  computedAt   DateTime               @map("computed_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, platform, dayOfWeek, hour])
  @@index([workspaceId, platform, score(sort: Desc)])
  @@map("recommendation_summaries")
}

model AuditLog {
  id            String   @id @default(uuid())
  workspaceId   String?  @map("workspace_id")
  actorUserId   String?  @map("actor_user_id")
  action        String
  resourceType  String   @map("resource_type")
  resourceId    String?  @map("resource_id")
  metadata      Json?
  createdAt     DateTime @default(now()) @map("created_at")

  workspace Workspace? @relation(fields: [workspaceId], references: [id], onDelete: SetNull)
  actor     User?      @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([workspaceId, createdAt(sort: Desc)])
  @@index([resourceType, resourceId])
  @@map("audit_logs")
}
```

---

## Notes on Cascade Behavior

- **Workspace deletion** cascades to members, social accounts, content drafts, media assets, recommendations (destructive — gate behind a confirmation + grace period at the application layer, not shown in schema).
- **Social account disconnect** does **not** cascade-delete `scheduled_posts` — historical posts/analytics remain for reporting; only new scheduling is blocked while `status = disconnected`.
- **Content draft deletion** cascades to its `scheduled_posts` (and transitively their variants/jobs/snapshots) — only allowed at the application layer when no target is in a non-terminal state.
- **Audit logs** use `onDelete: SetNull` on both FKs so history survives workspace/user deletion.
