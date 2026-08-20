import { beforeEach, describe, expect, it, vi } from "vitest";

const { todo, subject } = vi.hoisted(() => ({
  todo: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  subject: { findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { todo, subject } }));

const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ requireCurrentUser }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createTodo,
  deleteTodo,
  quickAddTodo,
  toggleTodo,
  updateTodo,
} from "@/features/todos/actions";

const USER = { id: "user-1", timezone: "Asia/Seoul" };

beforeEach(() => {
  vi.clearAllMocks();
  requireCurrentUser.mockResolvedValue(USER);
});

describe("toggleTodo — ownership", () => {
  it("no-ops for a todo that doesn't belong to the caller", async () => {
    todo.findFirst.mockResolvedValue(null);

    await toggleTodo("todo-1");

    expect(todo.update).not.toHaveBeenCalled();
  });

  it("flips completed and stamps/clears completedAt", async () => {
    todo.findFirst.mockResolvedValue({ id: "todo-1", completed: false });

    await toggleTodo("todo-1");

    expect(todo.update).toHaveBeenCalledWith({
      where: { id: "todo-1" },
      data: { completed: true, completedAt: expect.any(Date) },
    });
  });
});

describe("quickAddTodo", () => {
  it("ignores an empty title without creating a row", async () => {
    const fd = new FormData();
    fd.set("title", "   ");

    await quickAddTodo(fd);

    expect(todo.create).not.toHaveBeenCalled();
  });

  it("ignores a title over the length cap", async () => {
    const fd = new FormData();
    fd.set("title", "a".repeat(201));

    await quickAddTodo(fd);

    expect(todo.create).not.toHaveBeenCalled();
  });

  it("creates a todo for a valid title", async () => {
    const fd = new FormData();
    fd.set("title", "숙제하기");
    todo.create.mockResolvedValue({});

    await quickAddTodo(fd);

    expect(todo.create).toHaveBeenCalledTimes(1);
  });
});

describe("createTodo / updateTodo — subject ownership", () => {
  it("createTodo drops a subjectId the caller doesn't own", async () => {
    subject.findFirst.mockResolvedValue(null);
    todo.create.mockResolvedValue({});

    await createTodo({
      title: "숙제",
      subjectId: "someone-elses-subject",
      dueDate: "2026-01-01",
    });

    expect(todo.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subjectId: null }) }),
    );
  });

  it("updateTodo/deleteTodo scope the write to (id, userId), never id alone", async () => {
    subject.findFirst.mockResolvedValue(null);
    todo.updateMany.mockResolvedValue({ count: 1 });
    todo.deleteMany.mockResolvedValue({ count: 1 });

    await updateTodo("todo-1", { title: "수정", dueDate: "2026-01-01" });
    await deleteTodo("todo-1");

    expect(todo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "todo-1", userId: "user-1" } }),
    );
    expect(todo.deleteMany).toHaveBeenCalledWith({
      where: { id: "todo-1", userId: "user-1" },
    });
  });
});
