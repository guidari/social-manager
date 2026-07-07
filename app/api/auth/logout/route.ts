import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { apiError } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  if (!session) {
    return apiError("UNAUTHENTICATED", "No active session.");
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE_NAME, "", sessionCookieOptions(new Date(0)));
  return response;
}
