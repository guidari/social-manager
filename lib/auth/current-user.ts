import { prisma } from "@/lib/db/prisma";

export async function getUserWithMemberships(userId: string) {
  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.workspaceMember.findMany({
      where: { userId, joinedAt: { not: null } },
      orderBy: { createdAt: "asc" },
      include: { workspace: true },
    }),
  ]);

  return { user, memberships };
}
