import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import {
  isLoginRateLimited,
  registerFailedLogin,
  clearLoginRateLimit,
} from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/http/client-ip";
import { apiError } from "@/lib/api/errors";
import { loginSchema } from "@/lib/validation/auth";
import { zodFieldErrors } from "@/lib/validation/zod-errors";

const GENERIC_AUTH_ERROR = "Incorrect email or password.";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Check the highlighted fields.",
      zodFieldErrors(parsed.error),
    );
  }

  const { email, password } = parsed.data;
  const ip = getClientIp(request);

  if (await isLoginRateLimited(ip, email)) {
    return apiError("RATE_LIMITED", "Too many attempts. Try again in a few minutes.");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await verifyPassword(password, user?.passwordHash);

  if (!user || !user.passwordHash || !passwordMatches) {
    await registerFailedLogin(ip, email);
    // Wrong email and wrong password return the identical response, by design.
    return apiError("UNAUTHENTICATED", GENERIC_AUTH_ERROR);
  }

  await clearLoginRateLimit(ip, email);

  const { token, expiresAt } = createSessionToken(user.id);
  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    session: { expiresAt: expiresAt.toISOString() },
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
  return response;
}
