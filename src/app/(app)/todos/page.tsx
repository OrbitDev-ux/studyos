import { TodoList } from "@/features/todos/components/todo-list";
import { getAllTodos } from "@/features/todos/queries";
import { getSubjects } from "@/features/subjects/queries";
import { StudyPlannerDialog } from "@/features/planner/components/study-planner-dialog";
import { getPlannerCopy } from "@/features/planner/copy";
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
  const locale = await getServerLocale(user.locale);
  const t = getMessages(locale).todos;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <StudyPlannerDialog copy={getPlannerCopy(locale)} />
      </div>
      <TodoList
        todos={todos}
        subjects={subjects}
        defaultDueDate={formatDateOnly(getZonedDateOnly(user.timezone))}
      />
    </div>
  );
}
