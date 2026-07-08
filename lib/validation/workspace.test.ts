import { describe, expect, it } from "vitest";
import { updateWorkspaceSchema } from "./workspace";

describe("updateWorkspaceSchema", () => {
  it("accepts a name-only update", () => {
    const result = updateWorkspaceSchema.safeParse({ name: "Acme" });
    expect(result.success).toBe(true);
  });

  it("accepts a defaultTimezone-only update", () => {
    const result = updateWorkspaceSchema.safeParse({ defaultTimezone: "America/Sao_Paulo" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty payload", () => {
    const result = updateWorkspaceSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a blank name", () => {
    const result = updateWorkspaceSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });
});
