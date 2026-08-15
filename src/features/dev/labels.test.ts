import { describe, expect, it } from "vitest";
import { getMessages } from "@/features/i18n/messages";
import { workspaceStatusLabel } from "@/features/dev/labels";
import { WORKSPACE_STATUSES } from "@/features/dev/config";

describe("workspaceStatusLabel", () => {
  const t = getMessages("ko-KR").dev;

  it("maps every known status to a non-empty label", () => {
    for (const status of WORKSPACE_STATUSES) {
      expect(workspaceStatusLabel(t, status).length).toBeGreaterThan(0);
    }
  });

  it("falls back to the raw value for an unknown status", () => {
    expect(workspaceStatusLabel(t, "SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});
