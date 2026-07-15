import { describe, expect, it } from "vitest";
import type { PlatformAdapter } from "./adapter";
import { createMockAdapter } from "./mock-adapter";

const state = { workspaceId: "ws-1", userId: "user-1", nonce: "nonce-1" };

describe("createMockAdapter", () => {
  it("satisfies the PlatformAdapter interface", () => {
    const adapter: PlatformAdapter = createMockAdapter("youtube");
    expect(adapter.provider).toBe("youtube");
  });

  it("connect() returns a provider-hosted authorization URL carrying the state", () => {
    const adapter = createMockAdapter("youtube");
    const { authorizationUrl } = adapter.connect(state);
    const url = new URL(authorizationUrl);
    expect(url.searchParams.get("workspaceId")).toBe("ws-1");
    expect(url.searchParams.get("nonce")).toBe("nonce-1");
  });

  it("handleCallback() resolves a connected account with tokens", async () => {
    const adapter = createMockAdapter("tiktok");
    const account = await adapter.handleCallback({ code: "auth-code", state });
    expect(account.externalAccountId).toContain("auth-code");
    expect(account.tokens.accessToken).toBeTruthy();
    expect(account.tokens.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("publish() resolves an external post id for the given account", async () => {
    const adapter = createMockAdapter("youtube");
    const result = await adapter.publish(
      { externalAccountId: "acct-1", accessToken: "token-1" },
      {
        title: "Title",
        description: null,
        caption: null,
        tags: [],
        visibility: "public",
        privacyLevel: null,
        madeForKids: false,
        allowComments: true,
        allowDuet: true,
        allowStitch: true,
        media: { s3Key: "uploads/video.mp4", mimeType: "video/mp4" },
        customThumbnail: null,
      },
    );
    expect(result.externalPostId).toContain("acct-1");
  });

  it("fetchMetrics() resolves zeroed metrics for a fresh mock post", async () => {
    const adapter = createMockAdapter("youtube");
    const metrics = await adapter.fetchMetrics(
      { externalAccountId: "acct-1", accessToken: "token-1" },
      "post-1",
    );
    expect(metrics).toEqual({ views: 0, likes: 0, comments: 0, shares: 0, watchTimeSec: 0 });
  });

  it("refreshToken() resolves a new access token while preserving the refresh token", async () => {
    const adapter = createMockAdapter("youtube");
    const refreshed = await adapter.refreshToken("refresh-1");
    expect(refreshed.refreshToken).toBe("refresh-1");
    expect(refreshed.accessToken).not.toBe("refresh-1");
    expect(refreshed.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
