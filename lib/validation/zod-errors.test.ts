import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "./auth";
import { zodFieldErrors } from "./zod-errors";

describe("zodFieldErrors", () => {
  it("maps each field path to its first error message", () => {
    const result = signupSchema.safeParse({ email: "bad", password: "short", name: "" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const fields = zodFieldErrors(result.error);
    expect(fields).toEqual({
      email: "Must be a valid email address",
      password: "Must be at least 8 characters",
      name: "Name is required",
    });
  });

  it("keeps only the first error message per field", () => {
    const result = loginSchema.safeParse({ email: "bad-email", password: "" });
    expect(result.success).toBe(false);
    if (result.success) return;

    const fields = zodFieldErrors(result.error);
    expect(Object.keys(fields)).toEqual(["email", "password"]);
  });

  it("uses '_' as the key for root-level (pathless) issues", () => {
    const result = signupSchema.safeParse(null);
    expect(result.success).toBe(false);
    if (result.success) return;

    const fields = zodFieldErrors(result.error);
    expect(Object.keys(fields)).toContain("_");
  });
});
