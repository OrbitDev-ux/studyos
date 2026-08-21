import { describe, expect, it } from "vitest";
import { isQuickReaction, QUICK_REACTIONS } from "@/features/social/reactions";

describe("isQuickReaction", () => {
  it("accepts every emoji in the fixed set", () => {
    for (const emoji of QUICK_REACTIONS) {
      expect(isQuickReaction(emoji)).toBe(true);
    }
  });

  it("rejects anything outside the fixed set — the server-side allow-list reactToMessage relies on", () => {
    expect(isQuickReaction("💩")).toBe(false);
    expect(isQuickReaction("<script>")).toBe(false);
    expect(isQuickReaction("")).toBe(false);
  });
});
