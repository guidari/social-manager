import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

function requestWithCookie(cookieValue?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${cookieValue}`;
  }
  return new NextRequest("http://localhost/api/auth/logout", { method: "POST", headers });
}

describe("POST /api/auth/logout", () => {
  it("returns 401 when there is no session cookie", async () => {
    const response = await POST(requestWithCookie());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for an invalid/tampered session token", async () => {
    const response = await POST(requestWithCookie("garbage.token"));
    expect(response.status).toBe(401);
  });

  it("clears the session cookie and returns 204 for a valid session", async () => {
    const { token } = createSessionToken("user-1");
    const response = await POST(requestWithCookie(token));

    expect(response.status).toBe(204);
    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.value).toBe("");
    expect(cookie?.expires && new Date(cookie.expires).getTime()).toBe(0);
  });
});
