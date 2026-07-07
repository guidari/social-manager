import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { apiError } from "@/lib/api/errors";
import { signupSchema } from "@/lib/validation/auth";
import { zodFieldErrors } from "@/lib/validation/zod-errors";
import { generateUniqueWorkspaceSlug } from "@/lib/workspace/slug";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Check the highlighted fields.",
      zodFieldErrors(parsed.error),
    );
  }

  const { email, password, name } = parsed.data;
  const passwordHash = await hashPassword(password);

  try {
    const { user, workspace } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name },
      });

      const slug = await generateUniqueWorkspaceSlug(tx, name);
      const workspace = await tx.workspace.create({
        data: {
          name: `${name}'s Workspace`,
          slug,
          members: {
            create: { userId: user.id, role: "owner", joinedAt: new Date() },
          },
        },
      });

      return { user, workspace };
    });

    const { token, expiresAt } = createSessionToken(user.id);
    const response = NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name },
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
        session: { expiresAt: expiresAt.toISOString() },
      },
      { status: 201 },
    );
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
    return response;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiError("CONFLICT", "An account with this email already exists.");
    }
    throw err;
  }
}
