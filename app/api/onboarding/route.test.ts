import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    workspaceMember: { findFirst: vi.fn() },
    workspace: { update: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { POST } from "./route";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

function postRequest(userId: string | null, body: unknown): NextRequest {
  const request = new NextRequest("http://localhost/api/onboarding", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (userId) {
    const { token } = createSessionToken(userId);
    request.cookies.set(SESSION_COOKIE_NAME, token);
  }
  return request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/onboarding", () => {
  it("returns 401 UNAUTHENTICATED when there is no session", async () => {
    const response = await POST(postRequest(null, { defaultTimezone: "America/Sao_Paulo" }));

    expect(response.status).toBe(401);
    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });

  it("returns 403 FORBIDDEN for a reviewer — never a silent no-op", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1", role: "reviewer" });

    const response = await POST(postRequest("user-1", { defaultTimezone: "America/Sao_Paulo" }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });

  it("returns 422 VALIDATION_ERROR for a blank timezone", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1", role: "owner" });

    const response = await POST(postRequest("user-1", { defaultTimezone: "  " }));

    expect(response.status).toBe(422);
    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });

  it("sets the workspace timezone and stamps onboardedAt for the owner", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1", role: "owner" });
    const now = new Date("2026-07-11T12:00:00.000Z");
    prisma.workspace.update.mockResolvedValue({
      id: "ws-1",
      name: "Ada's Workspace",
      slug: "ada",
      defaultTimezone: "America/Sao_Paulo",
      onboardedAt: now,
    });

    const response = await POST(postRequest("user-1", { defaultTimezone: "America/Sao_Paulo" }));

    expect(response.status).toBe(200);
    expect(prisma.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws-1" },
      data: { defaultTimezone: "America/Sao_Paulo", onboardedAt: expect.any(Date) },
    });
    const body = await response.json();
    expect(body).toEqual({
      workspace: {
        id: "ws-1",
        name: "Ada's Workspace",
        slug: "ada",
        defaultTimezone: "America/Sao_Paulo",
        onboardedAt: now.toISOString(),
      },
    });
  });

  it("allows an admin to complete onboarding", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1", role: "admin" });
    prisma.workspace.update.mockResolvedValue({
      id: "ws-1",
      name: "Team Workspace",
      slug: "team",
      defaultTimezone: "UTC",
      onboardedAt: new Date("2026-07-11T12:00:00.000Z"),
    });

    const response = await POST(postRequest("user-1", { defaultTimezone: "UTC" }));

    expect(response.status).toBe(200);
  });
});
