import { beforeEach, describe, expect, it, vi } from "vitest";

const { problem, studyBook } = vi.hoisted(() => ({
  problem: { findMany: vi.fn() },
  studyBook: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { problem, studyBook } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

import { getSearchIndex } from "@/features/search/actions";

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue({ id: "user-1" });
  problem.findMany.mockResolvedValue([]);
  studyBook.findMany.mockResolvedValue([]);
});

describe("getSearchIndex", () => {
  it("scopes both queries to the caller — never another user's data", async () => {
    await getSearchIndex();

    expect(problem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(studyBook.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("maps problems/books into deep-linkable search entries", async () => {
    problem.findMany.mockResolvedValue([{ id: "p1", prompt: "1+1은?", unit: "덧셈" }]);
    studyBook.findMany.mockResolvedValue([
      { id: "b1", title: "수학의 정석", subjectName: "수학" },
    ]);

    const res = await getSearchIndex();

    expect(res.problems).toEqual([
      { id: "p1", label: "1+1은?", sublabel: "덧셈", href: "/problems#problem-p1" },
    ]);
    expect(res.books).toEqual([
      { id: "b1", label: "수학의 정석", sublabel: "수학", href: "/study-books/b1" },
    ]);
  });
});
