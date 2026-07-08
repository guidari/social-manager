import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn() },
    workspaceMember: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma }));

import { getUserWithMemberships } from "./current-user";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUserWithMemberships", () => {
  it("fetches the user and their joined memberships in parallel", async () => {
    const user = { id: "user-1", email: "ada@example.com", name: "Ada Lovelace" };
    const memberships = [
      { workspaceId: "ws-1", role: "owner", workspace: { name: "Ada's Workspace" } },
    ];
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.workspaceMember.findMany.mockResolvedValue(memberships);

    const result = await getUserWithMemberships("user-1");

    expect(result).toEqual({ user, memberships });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "user-1" } });
    expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", joinedAt: { not: null } },
      orderBy: { createdAt: "asc" },
      include: { workspace: true },
    });
  });

  it("returns a null user when no user is found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.workspaceMember.findMany.mockResolvedValue([]);

    const result = await getUserWithMemberships("missing-user");

    expect(result).toEqual({ user: null, memberships: [] });
  });
});
