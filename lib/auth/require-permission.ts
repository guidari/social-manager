import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { apiError } from "@/lib/api/errors";
import { can, type PolicyAction } from "@/lib/auth/policy";

export const WORKSPACE_HEADER = "x-workspace-id";

export interface WorkspacePermission {
  userId: string;
  workspaceId: string;
  role: "owner" | "admin" | "editor" | "reviewer";
}

export type PermissionResult =
  { ok: true; permission: WorkspacePermission } | { ok: false; response: NextResponse };

/**
 * Resolves the session user, the workspace they're acting against (the
 * `X-Workspace-Id` header, falling back to their oldest accepted
 * membership), and runs `can()` for the given action. Every domain API
 * route should call this instead of trusting a client-supplied role.
 */
export async function requireWorkspacePermission(
  request: NextRequest,
  action: PolicyAction,
): Promise<PermissionResult> {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return { ok: false, response: apiError("UNAUTHENTICATED", "Sign in to continue.") };
  }

  const requestedWorkspaceId = request.headers.get(WORKSPACE_HEADER);

  const membership = requestedWorkspaceId
    ? await prisma.workspaceMember.findFirst({
        where: {
          userId: session.userId,
          workspaceId: requestedWorkspaceId,
          joinedAt: { not: null },
        },
      })
    : await prisma.workspaceMember.findFirst({
        where: { userId: session.userId, joinedAt: { not: null } },
        orderBy: { createdAt: "asc" },
      });

  if (!membership) {
    return { ok: false, response: apiError("FORBIDDEN", "No active workspace membership.") };
  }

  const actor = { workspaceId: membership.workspaceId, role: membership.role };
  if (!can(actor, action, { workspaceId: membership.workspaceId })) {
    return {
      ok: false,
      response: apiError("FORBIDDEN", "You don't have permission to perform this action."),
    };
  }

  return {
    ok: true,
    permission: {
      userId: session.userId,
      workspaceId: membership.workspaceId,
      role: membership.role,
    },
  };
}
