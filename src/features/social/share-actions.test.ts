import { beforeEach, describe, expect, it, vi } from "vitest";

const { problem } = vi.hoisted(() => ({ problem: { findFirst: vi.fn(), findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: { problem } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

const { createConversationMessage } = vi.hoisted(() => ({
  createConversationMessage: vi.fn(),
}));
vi.mock("@/features/social/message-service", () => ({ createConversationMessage }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getShareableProblems, shareProblem } from "@/features/social/share-actions";

const USER = { id: "user-1", name: "학생", email: "student@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
});

describe("shareProblem — ownership", () => {
  it("rejects a problem the caller neither owns nor can access via the shared bank", async () => {
    problem.findFirst.mockResolvedValue(null);

    await expect(shareProblem("conv-1", "someone-elses-problem")).rejects.toThrow(
      "문제를 찾을 수 없습니다.",
    );

    expect(problem.findFirst).toHaveBeenCalledWith({
      where: {
        id: "someone-elses-problem",
        OR: [{ userId: USER.id }, { source: "import" }],
      },
      select: { id: true },
    });
    expect(createConversationMessage).not.toHaveBeenCalled();
  });

  it("shares a problem the caller owns, attaching it as PROBLEM-type shared content", async () => {
    problem.findFirst.mockResolvedValue({ id: "problem-1" });

    await shareProblem("conv-1", "problem-1", "이거 봐봐");

    expect(createConversationMessage).toHaveBeenCalledWith(
      USER,
      "conv-1",
      expect.objectContaining({
        content: "이거 봐봐",
        sharedType: "PROBLEM",
        sharedId: "problem-1",
      }),
    );
  });
});

describe("getShareableProblems", () => {
  it("scopes results to the caller's own problems plus the shared bank, never an arbitrary user's private problems", async () => {
    problem.findMany.mockResolvedValue([]);

    await getShareableProblems("");

    expect(problem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ userId: USER.id }, { source: "import" }] },
      }),
    );
  });

  it("never selects choices/answerText/isCorrect — a share must not leak the answer", async () => {
    problem.findMany.mockResolvedValue([]);

    await getShareableProblems("");

    const call = problem.findMany.mock.calls[0]![0];
    expect(call.select).not.toHaveProperty("choices");
    expect(call.select).not.toHaveProperty("answerText");
    expect(call.select).not.toHaveProperty("explanation");
  });
});
