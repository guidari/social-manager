import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "./session";

describe("createSessionToken / verifySessionToken", () => {
  it("round-trips a valid token", () => {
    const { token, expiresAt } = createSessionToken("user-123");
    const payload = verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe("user-123");
    expect(payload?.expiresAt).toBe(expiresAt.getTime());
  });

  it("sets expiresAt roughly 7 days in the future", () => {
    const before = Date.now();
    const { expiresAt } = createSessionToken("user-123");
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(before + sevenDaysMs + 1000);
  });

  it("returns null for undefined/null token", () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken(null)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(verifySessionToken("")).toBeNull();
  });

  it("returns null for a malformed token missing the signature segment", () => {
    expect(verifySessionToken("not-a-real-token")).toBeNull();
  });

  it("returns null when the signature has been tampered with", () => {
    const { token } = createSessionToken("user-123");
    const [payload] = token.split(".");
    const tampered = `${payload}.invalidsignature`;
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("returns null when the payload has been tampered with", () => {
    const { token } = createSessionToken("user-123");
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ userId: "attacker", expiresAt: Date.now() + 1e9 }),
    ).toString("base64url");
    expect(verifySessionToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  it("returns null when the payload is not valid base64url JSON", () => {
    const { token } = createSessionToken("user-123");
    const [, signature] = token.split(".");
    expect(verifySessionToken(`not-valid-json.${signature}`)).toBeNull();
  });

  it("returns null for an expired token", () => {
    vi.useFakeTimers();
    try {
      const { token } = createSessionToken("user-123");
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      expect(verifySessionToken(token)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("sessionCookieOptions", () => {
  it("returns secure, httpOnly cookie options with the given expiry", () => {
    const expiresAt = new Date("2030-01-01T00:00:00.000Z");
    expect(sessionCookieOptions(expiresAt)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
  });
});

describe("SESSION_COOKIE_NAME", () => {
  it("is a stable cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("postpilot_session");
  });
});

describe("getSecret", () => {
  const originalSecret = process.env.SESSION_SECRET;

  afterEach(() => {
    process.env.SESSION_SECRET = originalSecret;
  });

  it("throws when SESSION_SECRET is not set", async () => {
    vi.resetModules();
    delete process.env.SESSION_SECRET;
    const { createSessionToken: createToken } = await import("./session");
    expect(() => createToken("user-123")).toThrow("SESSION_SECRET is not set");
  });
});
