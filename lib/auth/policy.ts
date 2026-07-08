import type { WorkspaceRole } from "@prisma/client";

/**
 * The 5 core actions gated by workspace role, per the roles table in the
 * Engineering Spec (§1.4). Every subsequent domain API route should reuse
 * one of these rather than inventing new per-feature permission checks.
 */
export const POLICY_ACTIONS = ["view", "edit", "publish", "manage_accounts", "billing"] as const;
export type PolicyAction = (typeof POLICY_ACTIONS)[number];

const ROLE_GRANTS: Record<WorkspaceRole, ReadonlySet<PolicyAction>> = {
  owner: new Set<PolicyAction>(POLICY_ACTIONS),
  admin: new Set<PolicyAction>(["view", "edit", "publish", "manage_accounts"]),
  editor: new Set<PolicyAction>(["view", "edit", "publish"]),
  reviewer: new Set<PolicyAction>(["view"]),
};

export interface PolicyActor {
  workspaceId: string;
  role: WorkspaceRole;
}

export interface PolicyResource {
  workspaceId: string;
}

/**
 * A membership only grants actions on the workspace it belongs to — an actor
 * resolved for workspace A must never be usable to authorize a resource
 * scoped to workspace B, even if the role would otherwise permit the action.
 */
export function can(actor: PolicyActor, action: PolicyAction, resource: PolicyResource): boolean {
  if (actor.workspaceId !== resource.workspaceId) return false;
  return ROLE_GRANTS[actor.role].has(action);
}
