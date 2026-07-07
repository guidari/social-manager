import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "./auth";

describe("signupSchema", () => {
  it("accepts a valid payload", () => {
    const result = signupSchema.safeParse({
      email: "User@Example.com",
      password: "password123",
      name: "Ada Lovelace",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
      expect(result.data.name).toBe("Ada Lovelace");
    }
  });

  it("trims whitespace from name", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      name: "  Ada  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Ada");
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      email: "not-an-email",
      password: "password123",
      name: "Ada",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "short",
      name: "Ada",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a blank name", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      name: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing field", () => {
    const result = signupSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a valid payload and lowercases/trims the email", () => {
    const result = loginSchema.safeParse({ email: "  User@Example.com  ", password: "anything" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("user@example.com");
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "anything" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("does not enforce a minimum length on password (unlike signup)", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "a" });
    expect(result.success).toBe(true);
  });
});
