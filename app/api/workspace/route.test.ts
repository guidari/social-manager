import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    workspaceMember: { findFirst: vi.fn() },
    workspace: { update: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { PATCH } from "./route";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

function patchRequest(userId: string, body: unknown): NextRequest {
  const { token } = createSessionToken(userId);
  const request = new NextRequest("http://localhost/api/workspace", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  request.cookies.set(SESSION_COOKIE_NAME, token);
  return request;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/workspace", () => {
  it("returns 403 FORBIDDEN for a reviewer — never a silent no-op", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1", role: "reviewer" });

    const response = await PATCH(patchRequest("user-1", { name: "New Name" }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });

  it("returns 403 FORBIDDEN for an editor", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1", role: "editor" });

    const response = await PATCH(patchRequest("user-1", { name: "New Name" }));

    expect(response.status).toBe(403);
    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });

  it("returns 422 VALIDATION_ERROR when no field is provided", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1", role: "owner" });

    const response = await PATCH(patchRequest("user-1", {}));

    expect(response.status).toBe(422);
    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });

  it("allows an admin to update workspace settings", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1", role: "admin" });
    prisma.workspace.update.mockResolvedValue({
      id: "ws-1",
      name: "New Name",
      slug: "acme",
      defaultTimezone: "America/Sao_Paulo",
    });

    const response = await PATCH(
      patchRequest("user-1", { name: "New Name", defaultTimezone: "America/Sao_Paulo" }),
    );

    expect(response.status).toBe(200);
    expect(prisma.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws-1" },
      data: { name: "New Name", defaultTimezone: "America/Sao_Paulo" },
    });
    const body = await response.json();
    expect(body).toEqual({
      workspace: {
        id: "ws-1",
        name: "New Name",
        slug: "acme",
        defaultTimezone: "America/Sao_Paulo",
      },
    });
  });

  it("allows the owner to update workspace settings", async () => {
    prisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1", role: "owner" });
    prisma.workspace.update.mockResolvedValue({
      id: "ws-1",
      name: "Owner Renamed",
      slug: "acme",
      defaultTimezone: "UTC",
    });

    const response = await PATCH(patchRequest("user-1", { name: "Owner Renamed" }));
    expect(response.status).toBe(200);
  });
});
