import { describe, expect, it } from "vitest";
import { can, POLICY_ACTIONS, type PolicyAction } from "./policy";
import type { WorkspaceRole } from "@prisma/client";

const WORKSPACE_ID = "ws-1";

// Mirrors the roles table in PostPilot Engineering Spec §1.4.
const EXPECTED_GRANTS: Record<WorkspaceRole, Record<PolicyAction, boolean>> = {
  owner: { view: true, edit: true, publish: true, manage_accounts: true, billing: true },
  admin: { view: true, edit: true, publish: true, manage_accounts: true, billing: false },
  editor: { view: true, edit: true, publish: true, manage_accounts: false, billing: false },
  reviewer: { view: true, edit: false, publish: false, manage_accounts: false, billing: false },
};

describe("can()", () => {
  for (const role of Object.keys(EXPECTED_GRANTS) as WorkspaceRole[]) {
    for (const action of POLICY_ACTIONS) {
      const expected = EXPECTED_GRANTS[role][action];
      it(`${expected ? "allows" : "denies"} ${role} → ${action}`, () => {
        expect(
          can({ workspaceId: WORKSPACE_ID, role }, action, { workspaceId: WORKSPACE_ID }),
        ).toBe(expected);
      });
    }
  }

  it("denies every role when the actor's workspace doesn't match the resource's", () => {
    for (const role of Object.keys(EXPECTED_GRANTS) as WorkspaceRole[]) {
      expect(can({ workspaceId: WORKSPACE_ID, role }, "view", { workspaceId: "ws-2" })).toBe(false);
    }
  });
});
