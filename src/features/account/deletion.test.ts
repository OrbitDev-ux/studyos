import { describe, expect, it } from "vitest";
import {
  ACCOUNT_DELETION_CONFIRMATION,
  isAccountDeletionConfirmation,
} from "@/features/account/deletion-core";

describe("account deletion confirmation", () => {
  it("requires the exact confirmation word", () => {
    expect(isAccountDeletionConfirmation(ACCOUNT_DELETION_CONFIRMATION)).toBe(true);
    expect(isAccountDeletionConfirmation("delete")).toBe(false);
    expect(isAccountDeletionConfirmation("DELETE account")).toBe(false);
  });
});
