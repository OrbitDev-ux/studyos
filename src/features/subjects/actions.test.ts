import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const { subject } = vi.hoisted(() => ({
  subject: { count: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { subject } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createSubject, deleteSubject, updateSubject } from "@/features/subjects/actions";

const USER = { id: "user-1" };

function duplicateNameError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.0.0",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
  subject.count.mockResolvedValue(0);
});

describe("createSubject — duplicate name handling", () => {
  it("returns a friendly error (not a thrown 500) on a unique-constraint violation", async () => {
    subject.create.mockRejectedValue(duplicateNameError());

    const res = await createSubject({ name: "수학", color: "#ff0000" });

    expect(res.error).toBe("이미 있는 과목명입니다.");
  });

  it("rethrows any other DB error unchanged", async () => {
    subject.create.mockRejectedValue(new Error("connection refused"));

    await expect(createSubject({ name: "수학", color: "#ff0000" })).rejects.toThrow(
      "connection refused",
    );
  });

  it("creates the subject with the next order index", async () => {
    subject.count.mockResolvedValue(2);
    subject.create.mockResolvedValue({});

    const res = await createSubject({ name: "영어", color: "#00ff00" });

    expect(res).toEqual({});
    expect(subject.create).toHaveBeenCalledWith({
      data: { userId: "user-1", name: "영어", color: "#00ff00", order: 2 },
    });
  });
});

describe("updateSubject / deleteSubject — ownership", () => {
  it("updateSubject scopes the write to (id, userId)", async () => {
    subject.updateMany.mockResolvedValue({ count: 1 });

    await updateSubject("subj-1", { name: "수학", color: "#ff0000" });

    expect(subject.updateMany).toHaveBeenCalledWith({
      where: { id: "subj-1", userId: "user-1" },
      data: { name: "수학", color: "#ff0000" },
    });
  });

  it("updateSubject surfaces a duplicate-name conflict as a friendly error", async () => {
    subject.updateMany.mockRejectedValue(duplicateNameError());

    const res = await updateSubject("subj-1", { name: "수학", color: "#ff0000" });

    expect(res.error).toBe("이미 있는 과목명입니다.");
  });

  it("deleteSubject scopes the delete to (id, userId), never id alone", async () => {
    subject.deleteMany.mockResolvedValue({ count: 1 });

    await deleteSubject("subj-1");

    expect(subject.deleteMany).toHaveBeenCalledWith({
      where: { id: "subj-1", userId: "user-1" },
    });
  });
});
