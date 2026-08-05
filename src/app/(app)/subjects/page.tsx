import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectFormDialog } from "@/features/subjects/components/subject-form-dialog";
import { SubjectRow } from "@/features/subjects/components/subject-row";
import { getSubjects } from "@/features/subjects/queries";
import { requireCurrentUser } from "@/lib/session";

export default async function SubjectsPage() {
  const user = await requireCurrentUser();
  const subjects = await getSubjects(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">과목</h1>
        <SubjectFormDialog
          trigger={
            <Button type="button" size="sm" className="gap-1.5">
              <Plus className="size-4" />
              과목 추가
            </Button>
          }
        />
      </div>
      {subjects.length === 0 ? (
        <p className="text-muted-foreground text-sm">등록된 과목이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {subjects.map((subject) => (
            <SubjectRow key={subject.id} subject={subject} />
          ))}
        </ul>
      )}
    </div>
  );
}
