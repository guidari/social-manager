import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn() },
    workspaceMember: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { GET } from "./route";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { WORKSPACE_HEADER } from "@/lib/auth/require-permission";

function requestWithSession(userId: string, headers: Record<string, string> = {}): NextRequest {
  const { token } = createSessionToken(userId);
  const request = new NextRequest("http://localhost/api/me", { headers });
  request.cookies.set(SESSION_COOKIE_NAME, token);
  return request;
}

const user = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  avatarUrl: null,
  timezone: "UTC",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/me", () => {
  it("returns 401 UNAUTHENTICATED without a session cookie", async () => {
    const response = await GET(new NextRequest("http://localhost/api/me"));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the user, memberships, and the default active workspace", async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.workspaceMember.findMany.mockResolvedValue([
      { workspaceId: "ws-1", role: "owner", workspace: { name: "Ada's Workspace" } },
      { workspaceId: "ws-2", role: "editor", workspace: { name: "Shared Workspace" } },
    ]);

    const response = await GET(requestWithSession("user-1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      user: {
        id: "user-1",
        email: "ada@example.com",
        name: "Ada Lovelace",
        avatarUrl: null,
        timezone: "UTC",
      },
      memberships: [
        { workspaceId: "ws-1", workspaceName: "Ada's Workspace", role: "owner" },
        { workspaceId: "ws-2", workspaceName: "Shared Workspace", role: "editor" },
      ],
      activeWorkspaceId: "ws-1",
    });
  });

  it("prefers the X-Workspace-Id header for the active workspace when it matches a membership", async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.workspaceMember.findMany.mockResolvedValue([
      { workspaceId: "ws-1", role: "owner", workspace: { name: "Ada's Workspace" } },
      { workspaceId: "ws-2", role: "editor", workspace: { name: "Shared Workspace" } },
    ]);

    const response = await GET(requestWithSession("user-1", { [WORKSPACE_HEADER]: "ws-2" }));
    const body = await response.json();
    expect(body.activeWorkspaceId).toBe("ws-2");
  });
});
