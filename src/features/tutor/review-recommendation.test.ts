import { describe, expect, it } from "vitest";
import { tutorReplySchema } from "@/features/tutor/schema";

describe("tutorReplySchema.reviewRecommendation", () => {
  it("accepts a reply without a recommendation", () => {
    const parsed = tutorReplySchema.parse({ reply: "설명입니다." });
    expect(parsed.reviewRecommendation).toBeUndefined();
  });

  it("accepts a well-formed recommendation", () => {
    const parsed = tutorReplySchema.parse({
      reply: "다시 볼까요?",
      understanding: "confused",
      reviewRecommendation: {
        shouldSchedule: true,
        concept: "분수의 나눗셈",
        reason: "반복 혼동",
        priority: "high",
      },
    });
    expect(parsed.reviewRecommendation?.shouldSchedule).toBe(true);
    expect(parsed.reviewRecommendation?.concept).toBe("분수의 나눗셈");
  });

  it("rejects a malformed recommendation (empty concept / bad priority)", () => {
    expect(
      tutorReplySchema.safeParse({
        reply: "x",
        reviewRecommendation: { shouldSchedule: true, concept: "" },
      }).success,
    ).toBe(false);
    expect(
      tutorReplySchema.safeParse({
        reply: "x",
        reviewRecommendation: { shouldSchedule: true, concept: "분수", priority: "urgent" },
      }).success,
    ).toBe(false);
  });
});
