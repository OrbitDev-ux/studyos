import { TodoList } from "@/features/todos/components/todo-list";
import { getAllTodos } from "@/features/todos/queries";
import { getSubjects } from "@/features/subjects/queries";
import { requireCurrentUser } from "@/lib/session";

export default async function TodosPage() {
  const user = await requireCurrentUser();

  const [todos, subjects] = await Promise.all([
    getAllTodos(user.id),
    getSubjects(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Todo</h1>
      <TodoList todos={todos} subjects={subjects} />
    </div>
  );
}
