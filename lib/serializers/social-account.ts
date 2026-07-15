import type { AccountStatus, Provider } from "@prisma/client";

/**
 * Input is intentionally typed as "whatever a SocialAccount query returned,"
 * including a possible `token` relation — the whole point of this serializer
 * is to guarantee that relation (and any *_enc field) never reaches an API
 * response, no matter what the caller included or which role is asking.
 */
interface SerializableSocialAccount {
  id: string;
  provider: Provider;
  handle: string | null;
  avatarUrl: string | null;
  status: AccountStatus;
  capabilities: unknown;
  lastSyncedAt: Date | null;
  [key: string]: unknown; // tolerate token/accessTokenEnc/etc. being present
}

export interface SocialAccountResponse {
  id: string;
  provider: Provider;
  handle: string | null;
  avatarUrl: string | null;
  status: AccountStatus;
  capabilities: unknown;
  lastSyncedAt: string | null;
}

/**
 * Shapes a `social_accounts` row for `GET /accounts` (API Contract §2).
 * Deliberately allow-lists fields rather than omitting the token ones, so a
 * future column added to the model can't leak by default.
 */
export function serializeSocialAccount(account: SerializableSocialAccount): SocialAccountResponse {
  return {
    id: account.id,
    provider: account.provider,
    handle: account.handle,
    avatarUrl: account.avatarUrl,
    status: account.status,
    capabilities: account.capabilities,
    lastSyncedAt: account.lastSyncedAt ? account.lastSyncedAt.toISOString() : null,
  };
}
