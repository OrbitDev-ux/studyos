import { describe, expect, it } from "vitest";
import {
  TUTOR_GRADE_IDS,
  TUTOR_SUBJECT_IDS,
  tutorGradeGuidance,
  tutorGradeLabel,
  tutorSubjectLabel,
} from "@/features/tutor/config";
import {
  createConversationSchema,
  sendMessageSchema,
  tutorReplySchema,
} from "@/features/tutor/schema";

describe("tutor config — extensible subject/grade catalog", () => {
  it("supports the five base subjects", () => {
    expect(TUTOR_SUBJECT_IDS).toEqual(["math", "english", "korean", "science", "social"]);
    expect(tutorSubjectLabel("math")).toBe("수학");
    expect(tutorSubjectLabel("unknown")).toBe("unknown");
  });
  it("provides grade levels with difficulty guidance", () => {
    expect(TUTOR_GRADE_IDS).toContain("elem_low");
    expect(tutorGradeLabel("elem_low")).toBe("초등 저학년");
    expect(tutorGradeGuidance("elem_low")).toContain("쉬운");
  });
});

describe("tutor schemas (server validation)", () => {
  it("createConversation requires a known subject + grade", () => {
    expect(createConversationSchema.safeParse({ subject: "math", grade: "middle" }).success).toBe(true);
    expect(createConversationSchema.safeParse({ subject: "chemistry", grade: "middle" }).success).toBe(false);
    expect(createConversationSchema.safeParse({ subject: "math", grade: "phd" }).success).toBe(false);
  });
  it("sendMessage rejects empty/over-long content", () => {
    expect(sendMessageSchema.safeParse({ conversationId: "c1", content: "안녕" }).success).toBe(true);
    expect(sendMessageSchema.safeParse({ conversationId: "c1", content: "  " }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ conversationId: "", content: "hi" }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ conversationId: "c1", content: "a".repeat(4001) }).success).toBe(false);
  });
  it("tutorReply requires a non-empty reply", () => {
    expect(tutorReplySchema.safeParse({ reply: "이렇게 풀어요" }).success).toBe(true);
    expect(tutorReplySchema.safeParse({ reply: "", understanding: "partial" }).success).toBe(false);
    expect(
      tutorReplySchema.safeParse({ reply: "ok", understanding: "invalid" }).success,
    ).toBe(false);
  });
});
