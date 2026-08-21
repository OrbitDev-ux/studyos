import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { tutorConversation } = vi.hoisted(() => ({
  tutorConversation: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { tutorConversation } }));

import { getTutorConversations } from "@/features/tutor/queries";

describe("getTutorConversations", () => {
  it("caps the sidebar list — was previously unbounded (a user's entire chat history on every /tutor view)", async () => {
    tutorConversation.findMany.mockResolvedValue([]);

    await getTutorConversations("user-1");

    expect(tutorConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, take: 50 }),
    );
  });
});
