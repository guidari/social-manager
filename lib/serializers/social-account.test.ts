import { describe, expect, it } from "vitest";
import { serializeSocialAccount } from "./social-account";

const baseAccountWithToken = {
  id: "11111111-1111-1111-1111-111111111111",
  provider: "youtube" as const,
  handle: "@creator",
  avatarUrl: "https://cdn.example.com/avatar.png",
  status: "active" as const,
  capabilities: { publish: true, analytics: true },
  lastSyncedAt: new Date("2026-07-01T00:00:00.000Z"),
  // Simulates a Prisma query that (incorrectly) included the token relation —
  // the serializer must still never leak it, no matter who's asking.
  token: {
    id: "token-id",
    accessTokenEnc: "iv:tag:ciphertext-access",
    refreshTokenEnc: "iv:tag:ciphertext-refresh",
  },
  accessTokenEnc: "iv:tag:top-level-leak-attempt",
  refreshTokenEnc: "iv:tag:top-level-leak-attempt-refresh",
};

describe("serializeSocialAccount", () => {
  it("returns only the documented public fields (API Contract GET /accounts)", () => {
    const result = serializeSocialAccount(baseAccountWithToken);
    expect(Object.keys(result).sort()).toEqual(
      ["avatarUrl", "capabilities", "handle", "id", "lastSyncedAt", "provider", "status"].sort(),
    );
  });

  it("never includes account_tokens fields, regardless of requester role", () => {
    for (const role of ["owner", "admin", "editor", "reviewer"] as const) {
      const response = { role, account: serializeSocialAccount(baseAccountWithToken) };
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain("accessTokenEnc");
      expect(serialized).not.toContain("refreshTokenEnc");
      expect(serialized).not.toContain("ciphertext-access");
      expect(serialized).not.toContain("ciphertext-refresh");
      expect(response.account).not.toHaveProperty("token");
      expect(response.account).not.toHaveProperty("accessTokenEnc");
      expect(response.account).not.toHaveProperty("refreshTokenEnc");
    }
  });

  it("formats lastSyncedAt as ISO 8601, and null when never synced", () => {
    const result = serializeSocialAccount(baseAccountWithToken);
    expect(result.lastSyncedAt).toBe("2026-07-01T00:00:00.000Z");

    const neverSynced = serializeSocialAccount({ ...baseAccountWithToken, lastSyncedAt: null });
    expect(neverSynced.lastSyncedAt).toBeNull();
  });
});
