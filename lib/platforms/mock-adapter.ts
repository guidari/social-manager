import type { PlatformAdapter } from "./adapter";
import type {
  AccountCredentials,
  CallbackParams,
  ConnectedAccount,
  ConnectResult,
  MetricsResult,
  OAuthState,
  PublishContent,
  PublishResult,
  RefreshedTokens,
} from "./types";

/**
 * No-op PlatformAdapter for tests written ahead of real YouTube/TikTok
 * credentials (ACCT-301 acceptance criteria). Every method resolves
 * deterministically from its input instead of calling out to a provider.
 */
export function createMockAdapter(provider: string): PlatformAdapter {
  return {
    provider,

    connect(state: OAuthState): ConnectResult {
      const params = new URLSearchParams({
        workspaceId: state.workspaceId,
        userId: state.userId,
        nonce: state.nonce,
      });
      return { authorizationUrl: `https://mock.invalid/${provider}/oauth?${params.toString()}` };
    },

    async handleCallback(params: CallbackParams): Promise<ConnectedAccount> {
      return {
        externalAccountId: `mock-account-${params.code}`,
        handle: "mock-handle",
        avatarUrl: null,
        capabilities: { publish: true, analytics: true },
        scopes: ["mock.scope"],
        tokens: {
          accessToken: `mock-access-${params.code}`,
          refreshToken: `mock-refresh-${params.code}`,
          tokenType: "Bearer",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          scope: "mock.scope",
        },
      };
    },

    async publish(account: AccountCredentials, _content: PublishContent): Promise<PublishResult> {
      return { externalPostId: `mock-post-${account.externalAccountId}` };
    },

    async fetchMetrics(
      _account: AccountCredentials,
      _externalPostId: string,
    ): Promise<MetricsResult> {
      return { views: 0, likes: 0, comments: 0, shares: 0, watchTimeSec: 0 };
    },

    async refreshToken(refreshToken: string): Promise<RefreshedTokens> {
      return {
        accessToken: `mock-access-${refreshToken}`,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      };
    },
  };
}
