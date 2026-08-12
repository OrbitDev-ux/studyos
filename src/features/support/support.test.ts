import { describe, expect, it } from "vitest";
import {
  SUPPORT_STATUS_IDS,
  SUPPORT_STATUS_LABEL,
  SUPPORT_TYPE_IDS,
  SUPPORT_TYPE_LABEL,
  SUPPORT_TYPES,
} from "@/features/support/constants";
import {
  createTicketSchema,
  ticketMessageSchema,
  updateTicketStatusSchema,
} from "@/features/support/schema";

describe("support constants — config-driven, exhaustive", () => {
  it("covers all 6 ticket types with labels", () => {
    expect(SUPPORT_TYPE_IDS).toEqual([
      "BUG",
      "FEATURE_REQUEST",
      "PAYMENT",
      "ACCOUNT",
      "LEARNING",
      "OTHER",
    ]);
    for (const t of SUPPORT_TYPES) {
      expect(SUPPORT_TYPE_LABEL[t.id]).toContain(t.label);
    }
  });
  it("labels every status", () => {
    for (const s of SUPPORT_STATUS_IDS) {
      expect(SUPPORT_STATUS_LABEL[s]).toBeTruthy();
    }
  });
});

describe("createTicketSchema (server validation)", () => {
  const ok = { type: "BUG", title: "로그인이 안돼요", content: "이러이러한 문제가 있습니다." };
  it("accepts a valid ticket", () => {
    expect(createTicketSchema.safeParse(ok).success).toBe(true);
  });
  it("rejects empty title/content and unknown type", () => {
    expect(createTicketSchema.safeParse({ ...ok, title: "" }).success).toBe(false);
    expect(createTicketSchema.safeParse({ ...ok, content: "   " }).success).toBe(false);
    expect(createTicketSchema.safeParse({ ...ok, type: "HACK" }).success).toBe(false);
  });
  it("rejects over-long title/content", () => {
    expect(createTicketSchema.safeParse({ ...ok, title: "a".repeat(121) }).success).toBe(false);
    expect(createTicketSchema.safeParse({ ...ok, content: "a".repeat(5001) }).success).toBe(false);
  });
});

describe("ticket message + status schemas", () => {
  it("message requires ticketId + non-empty content", () => {
    expect(ticketMessageSchema.safeParse({ ticketId: "t1", content: "hi" }).success).toBe(true);
    expect(ticketMessageSchema.safeParse({ ticketId: "", content: "hi" }).success).toBe(false);
    expect(ticketMessageSchema.safeParse({ ticketId: "t1", content: "" }).success).toBe(false);
  });
  it("status update only accepts known statuses", () => {
    expect(updateTicketStatusSchema.safeParse({ ticketId: "t1", status: "CLOSED" }).success).toBe(true);
    expect(updateTicketStatusSchema.safeParse({ ticketId: "t1", status: "NOPE" }).success).toBe(false);
  });
});
