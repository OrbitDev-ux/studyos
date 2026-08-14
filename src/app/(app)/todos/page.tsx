import { TodoList } from "@/features/todos/components/todo-list";
import { getAllTodos } from "@/features/todos/queries";
import { getSubjects } from "@/features/subjects/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { formatDateOnly, getZonedDateOnly } from "@/lib/date";
import { requireCurrentUser } from "@/lib/session";

export default async function TodosPage() {
  const user = await requireCurrentUser();

  const [todos, subjects] = await Promise.all([
    getAllTodos(user.id),
    getSubjects(user.id),
  ]);
  const t = getMessages(await getServerLocale(user.locale)).todos;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <TodoList
        todos={todos}
        subjects={subjects}
        defaultDueDate={formatDateOnly(getZonedDateOnly(user.timezone))}
      />
    </div>
  );
}
