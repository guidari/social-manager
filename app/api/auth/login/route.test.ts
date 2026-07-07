import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prisma, verifyPassword, isLoginRateLimited, registerFailedLogin, clearLoginRateLimit } =
  vi.hoisted(() => ({
    prisma: { user: { findUnique: vi.fn() } },
    verifyPassword: vi.fn(),
    isLoginRateLimited: vi.fn(),
    registerFailedLogin: vi.fn(),
    clearLoginRateLimit: vi.fn(),
  }));

vi.mock("@/lib/db/prisma", () => ({ prisma }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword }));
vi.mock("@/lib/auth/rate-limit", () => ({
  isLoginRateLimited,
  registerFailedLogin,
  clearLoginRateLimit,
}));

import { POST } from "./route";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

function loginRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = { email: "ada@example.com", password: "correct-password" };
const user = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  passwordHash: "hashed",
};

beforeEach(() => {
  vi.clearAllMocks();
  isLoginRateLimited.mockResolvedValue(false);
});

describe("POST /api/auth/login", () => {
  it("returns 422 with field errors for an invalid payload", async () => {
    const response = await POST(loginRequest({ email: "not-an-email", password: "" }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns 429 RATE_LIMITED without touching the database when rate limited", async () => {
    isLoginRateLimited.mockResolvedValue(true);
    const response = await POST(loginRequest(validBody));
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns a generic 401 and registers a failed attempt when the user does not exist", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    verifyPassword.mockResolvedValue(false);

    const response = await POST(loginRequest(validBody));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.message).toBe("Incorrect email or password.");
    expect(registerFailedLogin).toHaveBeenCalledWith("203.0.113.7", "ada@example.com");
    expect(clearLoginRateLimit).not.toHaveBeenCalled();
  });

  it("returns the identical generic 401 when the password is wrong (no user enumeration)", async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    verifyPassword.mockResolvedValue(false);

    const response = await POST(loginRequest(validBody));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.message).toBe("Incorrect email or password.");
    expect(registerFailedLogin).toHaveBeenCalledWith("203.0.113.7", "ada@example.com");
  });

  it("still calls verifyPassword (against the dummy hash) even when no user is found, to avoid timing leaks", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    verifyPassword.mockResolvedValue(false);

    await POST(loginRequest(validBody));

    expect(verifyPassword).toHaveBeenCalledWith("correct-password", undefined);
  });

  it("returns 401 when the user has no password hash set", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash: null });
    verifyPassword.mockResolvedValue(true);

    const response = await POST(loginRequest(validBody));
    expect(response.status).toBe(401);
  });

  it("logs in successfully, clears the rate limit, and sets a session cookie", async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    verifyPassword.mockResolvedValue(true);

    const response = await POST(loginRequest(validBody));

    expect(response.status).toBe(200);
    expect(clearLoginRateLimit).toHaveBeenCalledWith("203.0.113.7", "ada@example.com");
    expect(registerFailedLogin).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body).toEqual({
      user: { id: "user-1", email: "ada@example.com", name: "Ada Lovelace" },
      session: { expiresAt: expect.any(String) },
    });

    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.value).toBeTruthy();
  });
});
