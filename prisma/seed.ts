import { randomUUID } from "crypto";
import { prisma } from "../lib/db/prisma";
import { hashPassword } from "../lib/auth/password";

const DEMO_USER_EMAIL = "demo@postpilot.app";
const DEMO_WORKSPACE_SLUG = "demo-workspace";

const DAY_MS = 24 * 60 * 60 * 1000;

async function resetDemoData() {
  const existingWorkspace = await prisma.workspace.findUnique({
    where: { slug: DEMO_WORKSPACE_SLUG },
  });
  if (existingWorkspace) {
    // ScheduledPost -> SocialAccount has no cascade, so clear it before the
    // workspace cascade deletes social_accounts (avoids an FK violation).
    await prisma.scheduledPost.deleteMany({
      where: { contentDraft: { workspaceId: existingWorkspace.id } },
    });
    await prisma.workspace.delete({ where: { id: existingWorkspace.id } });
  }

  await prisma.user.deleteMany({ where: { email: DEMO_USER_EMAIL } });
}

async function main() {
  await resetDemoData();

  const passwordHash = await hashPassword("DemoPass123!");
  const now = Date.now();

  const userId = randomUUID();
  const workspaceId = randomUUID();
  const youtubeAccountId = randomUUID();
  const tiktokAccountId = randomUUID();

  const draftIds = {
    draft: randomUUID(),
    scheduled: randomUUID(),
    publishing: randomUUID(),
    published: randomUUID(),
    failed: randomUUID(),
    needsReview: randomUUID(),
  };
  const publishedPostId = randomUUID();

  await prisma.$transaction([
    prisma.user.create({
      data: { id: userId, email: DEMO_USER_EMAIL, passwordHash, name: "Demo User" },
    }),

    prisma.workspace.create({
      data: {
        id: workspaceId,
        name: "Demo Workspace",
        slug: DEMO_WORKSPACE_SLUG,
        defaultTimezone: "America/New_York",
        onboardedAt: new Date(),
        members: {
          create: { userId, role: "owner", joinedAt: new Date() },
        },
      },
    }),

    prisma.socialAccount.createMany({
      data: [
        {
          id: youtubeAccountId,
          workspaceId,
          provider: "youtube",
          externalAccountId: "yt-demo-channel",
          handle: "@demo-creator",
          status: "needs_review",
          scopes: [],
        },
        {
          id: tiktokAccountId,
          workspaceId,
          provider: "tiktok",
          externalAccountId: "tiktok-demo-account",
          handle: "@demo.creator",
          status: "disconnected",
          scopes: [],
        },
      ],
    }),

    prisma.contentDraft.createMany({
      data: [
        {
          id: draftIds.draft,
          workspaceId,
          authorId: userId,
          internalTitle: "Behind-the-scenes bloopers reel",
          baseCaption: "You didn't see this coming 😅",
          tags: ["bloopers", "bts"],
          status: "draft",
        },
        {
          id: draftIds.scheduled,
          workspaceId,
          authorId: userId,
          internalTitle: "Q3 product launch teaser",
          baseCaption: "Something big is coming. 👀 #Q3Launch",
          tags: ["launch", "teaser"],
          campaign: "Q3 Launch",
          status: "scheduled",
        },
        {
          id: draftIds.publishing,
          workspaceId,
          authorId: userId,
          internalTitle: "Weekly tips: editing shortcuts",
          baseCaption: "5 shortcuts that will save you hours.",
          tags: ["tips", "editing"],
          status: "publishing",
        },
        {
          id: draftIds.published,
          workspaceId,
          authorId: userId,
          internalTitle: "Customer story: Acme Co.",
          baseCaption: "How Acme Co. grew their audience 3x.",
          tags: ["customer-story"],
          campaign: "Q3 Launch",
          status: "published",
        },
        {
          id: draftIds.failed,
          workspaceId,
          authorId: userId,
          internalTitle: "Livestream recap",
          baseCaption: "Missed the stream? Here's the recap.",
          tags: ["recap", "livestream"],
          status: "failed",
        },
        {
          id: draftIds.needsReview,
          workspaceId,
          authorId: userId,
          internalTitle: "Sponsored: NewBrand unboxing",
          baseCaption: "Unboxing the new NewBrand kit — thanks NewBrand for the sponsorship!",
          tags: ["sponsored", "unboxing"],
          status: "needs_review",
        },
      ],
    }),

    prisma.scheduledPost.createMany({
      data: [
        {
          contentDraftId: draftIds.draft,
          socialAccountId: youtubeAccountId,
          platform: "youtube",
          status: "draft",
          timezone: "America/New_York",
        },
        {
          contentDraftId: draftIds.scheduled,
          socialAccountId: youtubeAccountId,
          platform: "youtube",
          status: "scheduled",
          scheduledAt: new Date(now + 3 * DAY_MS),
          timezone: "America/New_York",
        },
        {
          contentDraftId: draftIds.scheduled,
          socialAccountId: tiktokAccountId,
          platform: "tiktok",
          status: "cancelled",
          scheduledAt: new Date(now + 3 * DAY_MS),
          timezone: "America/New_York",
        },
        {
          contentDraftId: draftIds.publishing,
          socialAccountId: youtubeAccountId,
          platform: "youtube",
          status: "publishing",
          scheduledAt: new Date(now - 5 * 60 * 1000),
          timezone: "America/New_York",
        },
        {
          id: publishedPostId,
          contentDraftId: draftIds.published,
          socialAccountId: youtubeAccountId,
          platform: "youtube",
          status: "published",
          scheduledAt: new Date(now - 7 * DAY_MS),
          publishedAt: new Date(now - 7 * DAY_MS),
          externalPostId: "yt-demo-video-001",
          timezone: "America/New_York",
        },
        {
          contentDraftId: draftIds.failed,
          socialAccountId: tiktokAccountId,
          platform: "tiktok",
          status: "failed",
          scheduledAt: new Date(now - 2 * DAY_MS),
          failureReason: "Upload rejected: video exceeds platform duration limit.",
          timezone: "America/New_York",
        },
        {
          contentDraftId: draftIds.needsReview,
          socialAccountId: tiktokAccountId,
          platform: "tiktok",
          status: "needs_review",
          timezone: "America/New_York",
        },
      ],
    }),

    prisma.analyticsSnapshot.createMany({
      data: [
        {
          scheduledPostId: publishedPostId,
          capturedAt: new Date(now - 6 * DAY_MS),
          views: 1240,
          likes: 96,
          comments: 12,
          shares: 8,
          watchTimeSec: 18500,
          engagementRate: 0.0935,
        },
        {
          scheduledPostId: publishedPostId,
          capturedAt: new Date(now - 3 * DAY_MS),
          views: 5310,
          likes: 402,
          comments: 51,
          shares: 33,
          watchTimeSec: 79200,
          engagementRate: 0.1105,
        },
      ],
    }),

    prisma.recommendationSummary.createMany({
      data: [
        {
          workspaceId,
          platform: "youtube",
          dayOfWeek: 2,
          hour: 14,
          score: 0.82,
          confidence: 0.71,
          sampleSize: 42,
          isColdStart: false,
          computedAt: new Date(),
        },
        {
          workspaceId,
          platform: "youtube",
          dayOfWeek: 4,
          hour: 18,
          score: 0.75,
          confidence: 0.65,
          sampleSize: 31,
          isColdStart: false,
          computedAt: new Date(),
        },
        {
          workspaceId,
          platform: "tiktok",
          dayOfWeek: 5,
          hour: 20,
          score: 0.88,
          confidence: 0.6,
          sampleSize: 18,
          isColdStart: false,
          computedAt: new Date(),
        },
        {
          workspaceId,
          platform: "combined",
          dayOfWeek: 3,
          hour: 17,
          score: 0.3,
          confidence: 0.1,
          sampleSize: 0,
          isColdStart: true,
          computedAt: new Date(),
        },
      ],
    }),
  ]);

  console.log(`Seeded demo workspace "${DEMO_WORKSPACE_SLUG}" for user ${DEMO_USER_EMAIL}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
