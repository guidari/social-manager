import { describe, expect, it } from "vitest";
import { completeOnboardingSchema } from "./onboarding";

describe("completeOnboardingSchema", () => {
  it("accepts a valid IANA timezone", () => {
    const result = completeOnboardingSchema.safeParse({ defaultTimezone: "America/Sao_Paulo" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing timezone", () => {
    const result = completeOnboardingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a blank timezone", () => {
    const result = completeOnboardingSchema.safeParse({ defaultTimezone: "   " });
    expect(result.success).toBe(false);
  });
});
