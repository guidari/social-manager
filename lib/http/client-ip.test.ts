import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp } from "./client-ip";

function requestWithHeaders(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", { headers });
}

describe("getClientIp", () => {
  it("returns the first IP from x-forwarded-for", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" });
    expect(getClientIp(request)).toBe("203.0.113.1");
  });

  it("trims whitespace around the first x-forwarded-for entry", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "  203.0.113.1  , 10.0.0.1" });
    expect(getClientIp(request)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = requestWithHeaders({ "x-real-ip": "198.51.100.2" });
    expect(getClientIp(request)).toBe("198.51.100.2");
  });

  it("returns 'unknown' when neither header is present", () => {
    const request = requestWithHeaders({});
    expect(getClientIp(request)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.1",
      "x-real-ip": "198.51.100.2",
    });
    expect(getClientIp(request)).toBe("203.0.113.1");
  });
});
