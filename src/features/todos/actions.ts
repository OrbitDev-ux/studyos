"use server";

import { revalidatePath } from "next/cache";
import { getZonedDateOnly, parseDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";
import { todoFormSchema, type TodoFormValues } from "@/features/todos/schema";

const MAX_TITLE_LENGTH = 200;

export async function toggleTodo(todoId: string) {
  const user = await requireCurrentUser();
  const todo = await prisma.todo.findFirst({ where: { id: todoId, userId: user.id } });
  if (!todo) return;

  await prisma.todo.update({
    where: { id: todoId },
    data: {
      completed: !todo.completed,
      completedAt: !todo.completed ? new Date() : null,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/todos");
}

export async function quickAddTodo(formData: FormData) {
  const user = await requireCurrentUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title || title.length > MAX_TITLE_LENGTH) return;

  await prisma.todo.create({
    data: {
      userId: user.id,
      title,
      dueDate: getZonedDateOnly(user.timezone),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/todos");
}

export async function createTodo(values: TodoFormValues) {
  const user = await requireCurrentUser();
  const parsed = todoFormSchema.parse(values);

  await prisma.todo.create({
    data: {
      userId: user.id,
      title: parsed.title,
      subjectId: parsed.subjectId || null,
      dueDate: parseDateOnly(parsed.dueDate),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/todos");
}

export async function updateTodo(todoId: string, values: TodoFormValues) {
  const user = await requireCurrentUser();
  const parsed = todoFormSchema.parse(values);

  await prisma.todo.updateMany({
    where: { id: todoId, userId: user.id },
    data: {
      title: parsed.title,
      subjectId: parsed.subjectId || null,
      dueDate: parseDateOnly(parsed.dueDate),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/todos");
}

export async function deleteTodo(todoId: string) {
  const user = await requireCurrentUser();
  await prisma.todo.deleteMany({ where: { id: todoId, userId: user.id } });
  revalidatePath("/dashboard");
  revalidatePath("/todos");
}
