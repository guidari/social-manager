import { describe, expect, it } from "vitest";
import { getInitials } from "./utils";

describe("getInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
  });

  it("handles a single name", () => {
    expect(getInitials("Ada")).toBe("A");
  });

  it("ignores extra whitespace and extra words", () => {
    expect(getInitials("  Ada   Marie Lovelace  ")).toBe("AM");
  });
});
