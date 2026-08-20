import { describe, expect, it } from "vitest";
import { resolveStreamErrorOutcome } from "@/features/tutor/chat-outcome";

describe("resolveStreamErrorOutcome", () => {
  it("total failure (nothing shown yet): surfaces the error and offers a resend", () => {
    const outcome = resolveStreamErrorOutcome(
      { error: "사용 한도를 모두 사용했어요.", code: "FEATURE_LIMIT_REACHED" },
      false,
      "질문",
    );
    expect(outcome.error).toBe("사용 한도를 모두 사용했어요.");
    expect(outcome.retryableContent).toBe("질문");
  });

  it("partial/late failure (some reply text already shown): soft warning, no resend", () => {
    const outcome = resolveStreamErrorOutcome(
      { error: "답변이 저장되지 않았어요.", code: "persist_failed" },
      true,
      "질문",
    );
    expect(outcome.error).toBe("답변이 저장되지 않았어요.");
    expect(outcome.retryableContent).toBeNull();
  });
});
