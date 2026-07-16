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
 * Common contract both provider adapters (YouTube, TikTok) implement, per
 * Engineering Spec §5.3: "Abstract both behind a common PlatformAdapter
 * interface ... so future Instagram/LinkedIn/X/Facebook adapters drop in
 * without touching the scheduler or UI." Every method is provider-agnostic —
 * no YouTube/TikTok-specific request or response shapes appear here, only
 * the normalized types in ./types.
 */
export interface PlatformAdapter {
  readonly provider: string;

  /** Builds the provider's OAuth consent URL for `GET /accounts/:provider/connect`. */
  connect(state: OAuthState): ConnectResult;

  /** Exchanges the callback `code` for tokens and the connecting account's profile. */
  handleCallback(params: CallbackParams): Promise<ConnectedAccount>;

  /** Publishes content to the provider and returns the resulting external post id. */
  publish(account: AccountCredentials, content: PublishContent): Promise<PublishResult>;

  /** Pulls current metrics for a previously published post. */
  fetchMetrics(account: AccountCredentials, externalPostId: string): Promise<MetricsResult>;

  /** Exchanges a refresh token for a new access token ahead of expiry. */
  refreshToken(refreshToken: string): Promise<RefreshedTokens>;
}
