import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getUserWithMemberships } from "@/lib/auth/current-user";
import { apiError } from "@/lib/api/errors";
import { WORKSPACE_HEADER } from "@/lib/auth/require-permission";

export async function GET(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return apiError("UNAUTHENTICATED", "Sign in to continue.");
  }

  const { user, memberships } = await getUserWithMemberships(session.userId);

  if (!user) {
    return apiError("UNAUTHENTICATED", "Sign in to continue.");
  }

  const requestedWorkspaceId = request.headers.get(WORKSPACE_HEADER);
  const activeMembership =
    memberships.find((m) => m.workspaceId === requestedWorkspaceId) ?? memberships[0];

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
    },
    memberships: memberships.map((m) => ({
      workspaceId: m.workspaceId,
      workspaceName: m.workspace.name,
      role: m.role,
    })),
    activeWorkspaceId: activeMembership?.workspaceId ?? null,
  });
}
