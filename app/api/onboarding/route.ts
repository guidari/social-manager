import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/errors";
import { completeOnboardingSchema } from "@/lib/validation/onboarding";
import { zodFieldErrors } from "@/lib/validation/zod-errors";
import { requireWorkspacePermission } from "@/lib/auth/require-permission";

// Onboarding sets the workspace's default timezone and stamps `onboarded_at`
// so the app shell stops redirecting this workspace through `/onboarding`.
export async function POST(request: NextRequest) {
  const permission = await requireWorkspacePermission(request, "manage_accounts");
  if (!permission.ok) return permission.response;

  const body = await request.json().catch(() => null);
  const parsed = completeOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Check the highlighted fields.",
      zodFieldErrors(parsed.error),
    );
  }

  const workspace = await prisma.workspace.update({
    where: { id: permission.permission.workspaceId },
    data: { defaultTimezone: parsed.data.defaultTimezone, onboardedAt: new Date() },
  });

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      defaultTimezone: workspace.defaultTimezone,
      onboardedAt: workspace.onboardedAt?.toISOString() ?? null,
    },
  });
}
