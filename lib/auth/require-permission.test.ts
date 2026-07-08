import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma } = vi.hoisted(() => ({
  prisma: { workspaceMember: { findFirst: vi.fn() } },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { requireWorkspacePermission, WORKSPACE_HEADER } from "./require-permission";
import { createSessionToken, SESSION_COOKIE_NAME } from "./session";

function requestWithSession(userId: string, headers: Record<string, string> = {}): NextRequest {
  const { token } = createSessionToken(userId);
  const request = new NextRequest("http://localhost/api/whatever", { headers });
  request.cookies.set(SESSION_COOKIE_NAME, token);
  return request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireWorkspacePermission", () => {
  it("returns 401 UNAUTHENTICATED when there is no session cookie", async () => {
    const result = await requireWorkspacePermission(
      new NextRequest("http://localhost/api/whatever"),
      "view",
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.response.status).toBe(401);
    expect((await result.response.json()).error.code).toBe("UNAUTHENTICATED");
    expect(prisma.workspaceMember.findFirst).not.toHaveBeenCalled();
  });

  it("returns 403 FORBIDDEN when the user has no active membership", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue(null);
    const result = await requireWorkspacePermission(requestWithSession("user-1"), "view");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.response.status).toBe(403);
    expect((await result.response.json()).error.code).toBe("FORBIDDEN");
  });

  it("returns 403 FORBIDDEN — never a silent no-op — when the role doesn't grant the action", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({
      workspaceId: "ws-1",
      role: "reviewer",
    });
    const result = await requireWorkspacePermission(requestWithSession("user-1"), "publish");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.response.status).toBe(403);
    expect((await result.response.json()).error.code).toBe("FORBIDDEN");
  });

  it("resolves ok:true with the actor's role when the action is granted", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({
      workspaceId: "ws-1",
      role: "editor",
    });
    const result = await requireWorkspacePermission(requestWithSession("user-1"), "publish");
    expect(result).toEqual({
      ok: true,
      permission: { userId: "user-1", workspaceId: "ws-1", role: "editor" },
    });
  });

  it("scopes the membership lookup to the X-Workspace-Id header when provided", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-2", role: "owner" });
    await requireWorkspacePermission(
      requestWithSession("user-1", { [WORKSPACE_HEADER]: "ws-2" }),
      "billing",
    );
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", workspaceId: "ws-2", joinedAt: { not: null } },
    });
  });

  it("falls back to the user's oldest accepted membership when no header is given", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1", role: "owner" });
    await requireWorkspacePermission(requestWithSession("user-1"), "view");
    expect(prisma.workspaceMember.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", joinedAt: { not: null } },
      orderBy: { createdAt: "asc" },
    });
  });
});
