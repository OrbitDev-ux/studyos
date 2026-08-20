import { describe, expect, it } from "vitest";
import { TUTOR_STREAM_SENTINEL, splitStreamedReply } from "@/features/tutor/chat-stream";

describe("splitStreamedReply", () => {
  it("parses a well-formed reply + metadata block", () => {
    const text = `이렇게 풀어봐${TUTOR_STREAM_SENTINEL}{"understanding":"partial","reviewRecommendation":{"shouldSchedule":true,"concept":"분수의 나눗셈"}}`;
    expect(splitStreamedReply(text)).toEqual({
      reply: "이렇게 풀어봐",
      understanding: "partial",
      reviewRecommendation: { shouldSchedule: true, concept: "분수의 나눗셈" },
    });
  });

  it("treats the whole text as the reply when the sentinel is missing", () => {
    expect(splitStreamedReply("정답은 5야")).toEqual({ reply: "정답은 5야" });
  });

  it("falls back to reply-only when the metadata JSON is malformed", () => {
    const text = `정답은 5야${TUTOR_STREAM_SENTINEL}{not valid json`;
    expect(splitStreamedReply(text)).toEqual({ reply: "정답은 5야" });
  });

  it("falls back to reply-only when the metadata fails schema validation", () => {
    const text = `정답은 5야${TUTOR_STREAM_SENTINEL}{"understanding":"totally-wrong-value"}`;
    expect(splitStreamedReply(text)).toEqual({ reply: "정답은 5야" });
  });

  it("treats the whole text as the reply when there is no body before the sentinel", () => {
    const text = `${TUTOR_STREAM_SENTINEL}{"understanding":"partial"}`;
    expect(splitStreamedReply(text)).toEqual({ reply: text.trim() });
  });
});
