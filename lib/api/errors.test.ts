import { describe, expect, it } from "vitest";
import { apiError } from "./errors";

describe("apiError", () => {
  it.each([
    ["VALIDATION_ERROR", 422],
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["CONFLICT", 409],
    ["RATE_LIMITED", 429],
    ["INTERNAL_ERROR", 500],
    ["UPSTREAM_PLATFORM_ERROR", 502],
  ] as const)("maps %s to status %i", async (code, status) => {
    const response = apiError(code, "message");
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(body).toEqual({ error: { code, message: "message" } });
  });

  it("includes fields when provided", async () => {
    const response = apiError("VALIDATION_ERROR", "Check the highlighted fields.", {
      email: "Must be a valid email address",
    });
    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Check the highlighted fields.",
        fields: { email: "Must be a valid email address" },
      },
    });
  });

  it("omits the fields key entirely when not provided", async () => {
    const response = apiError("NOT_FOUND", "Not found");
    const body = await response.json();
    expect(body.error).not.toHaveProperty("fields");
  });
});
