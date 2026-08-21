import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLES,
  CAPABILITIES,
  can,
  hasRole,
  isSuperAdmin,
  roleRank,
  type Capability,
} from "@/lib/admin/permissions";

/**
 * The role-hierarchy/capability matrix has zero test coverage (Codebase
 * audit) despite gating every sensitive admin action (bans, IP blocks, prompt
 * edits, admin management). This is a pure module — no DB/session mocking
 * needed — so there's no excuse for it to stay untested.
 */

describe("roleRank / hasRole", () => {
  it("ranks strictly SUPER_ADMIN > ADMIN > MODERATOR", () => {
    expect(roleRank("SUPER_ADMIN")).toBeGreaterThan(roleRank("ADMIN"));
    expect(roleRank("ADMIN")).toBeGreaterThan(roleRank("MODERATOR"));
  });

  it("hasRole is reflexive: a role always satisfies itself as the minimum", () => {
    for (const role of ADMIN_ROLES) {
      expect(hasRole(role, role)).toBe(true);
    }
  });

  it("a lower role never satisfies a higher minimum", () => {
    expect(hasRole("MODERATOR", "ADMIN")).toBe(false);
    expect(hasRole("MODERATOR", "SUPER_ADMIN")).toBe(false);
    expect(hasRole("ADMIN", "SUPER_ADMIN")).toBe(false);
  });

  it("a higher role always satisfies a lower minimum", () => {
    expect(hasRole("SUPER_ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("SUPER_ADMIN", "MODERATOR")).toBe(true);
    expect(hasRole("ADMIN", "MODERATOR")).toBe(true);
  });
});

describe("isSuperAdmin", () => {
  it("is true only for SUPER_ADMIN", () => {
    expect(isSuperAdmin("SUPER_ADMIN")).toBe(true);
    expect(isSuperAdmin("ADMIN")).toBe(false);
    expect(isSuperAdmin("MODERATOR")).toBe(false);
  });
});

describe("can — capability matrix", () => {
  // Snapshot-style assertion, not just spot checks: catches an accidental
  // one-line change to CAPABILITIES (e.g. a copy-paste loosening
  // `managePrompts` from SUPER_ADMIN to ADMIN) that a few `it()`s could miss.
  const EXPECTED_MINIMUMS: Record<Capability, string> = {
    banUser: "ADMIN",
    unbanUser: "ADMIN",
    promoteUser: "SUPER_ADMIN",
    manageAdmins: "SUPER_ADMIN",
    manageAnnouncements: "ADMIN",
    viewLogs: "MODERATOR",
    manageSupport: "MODERATOR",
    manageLab: "ADMIN",
    manageSecurity: "ADMIN",
    manageSystem: "SUPER_ADMIN",
    manageAi: "ADMIN",
    manageIpBans: "SUPER_ADMIN",
    managePrompts: "SUPER_ADMIN",
  };

  it("matches the expected minimum role for every declared capability", () => {
    expect(CAPABILITIES).toEqual(EXPECTED_MINIMUMS);
  });

  it("a MODERATOR can only reach MODERATOR-level capabilities", () => {
    for (const [capability, minimum] of Object.entries(CAPABILITIES) as [Capability, string][]) {
      expect(can("MODERATOR", capability)).toBe(minimum === "MODERATOR");
    }
  });

  it("only SUPER_ADMIN can reach the highest-risk capabilities (admin management, prompts, IP bans, system settings, role promotion)", () => {
    const superAdminOnly: Capability[] = [
      "promoteUser",
      "manageAdmins",
      "manageSystem",
      "manageIpBans",
      "managePrompts",
    ];
    for (const capability of superAdminOnly) {
      expect(can("ADMIN", capability)).toBe(false);
      expect(can("SUPER_ADMIN", capability)).toBe(true);
    }
  });

  it("SUPER_ADMIN can reach every capability (top of the hierarchy)", () => {
    for (const capability of Object.keys(CAPABILITIES) as Capability[]) {
      expect(can("SUPER_ADMIN", capability)).toBe(true);
    }
  });
});
