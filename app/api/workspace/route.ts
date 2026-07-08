import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/errors";
import { updateWorkspaceSchema } from "@/lib/validation/workspace";
import { zodFieldErrors } from "@/lib/validation/zod-errors";
import { requireWorkspacePermission } from "@/lib/auth/require-permission";

// Workspace settings (name, default timezone) fall under the Admin "manage
// integrations, members, settings" grant — same tier as manage_accounts.
export async function PATCH(request: NextRequest) {
  const permission = await requireWorkspacePermission(request, "manage_accounts");
  if (!permission.ok) return permission.response;

  const body = await request.json().catch(() => null);
  const parsed = updateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Check the highlighted fields.",
      zodFieldErrors(parsed.error),
    );
  }

  const workspace = await prisma.workspace.update({
    where: { id: permission.permission.workspaceId },
    data: parsed.data,
  });

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      defaultTimezone: workspace.defaultTimezone,
    },
  });
}
