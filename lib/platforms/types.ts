import type { Provider } from "@prisma/client";

/**
 * Carried through the OAuth redirect as the signed `state` param (API
 * Contract §2) so the callback can recover which workspace/user initiated
 * connect without trusting anything else the provider echoes back.
 */
export interface OAuthState {
  workspaceId: string;
  userId: string;
  nonce: string;
}

export interface ConnectResult {
  authorizationUrl: string;
}

export interface CallbackParams {
  code: string;
  state: OAuthState;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  tokenType: string | null;
  expiresAt: Date;
  scope: string | null;
}

export interface ConnectedAccount {
  externalAccountId: string;
  handle: string | null;
  avatarUrl: string | null;
  capabilities: Record<string, boolean>;
  scopes: string[];
  tokens: OAuthTokens;
}

/**
 * Minimal credential shape adapters need for authenticated calls —
 * intentionally excludes anything DB-shaped (no SocialAccount/AccountToken
 * models) so this module has no dependency on Prisma's generated types
 * beyond the Provider enum.
 */
export interface AccountCredentials {
  externalAccountId: string;
  accessToken: string;
}

export interface PublishAsset {
  s3Key: string;
  mimeType: string;
}

export interface PublishContent {
  title: string | null;
  description: string | null;
  caption: string | null;
  tags: string[];
  visibility: string | null;
  privacyLevel: string | null;
  madeForKids: boolean | null;
  allowComments: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  media: PublishAsset;
  customThumbnail: PublishAsset | null;
}

export interface PublishResult {
  externalPostId: string;
}

export interface MetricsResult {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeSec: number | null;
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}

/**
 * Mirrors Engineering Spec §5.3's failure-handling table so callers (worker
 * jobs, route handlers) can branch on `code` instead of parsing messages.
 */
export type PlatformAdapterErrorCode =
  "TOKEN_EXPIRED" | "RATE_LIMITED" | "UPLOAD_FAILED" | "CONTENT_POLICY_REJECTED" | "UPSTREAM_ERROR";

export class PlatformAdapterError extends Error {
  readonly code: PlatformAdapterErrorCode;

  constructor(code: PlatformAdapterErrorCode, message: string) {
    super(message);
    this.name = "PlatformAdapterError";
    this.code = code;
  }
}

export type { Provider };
