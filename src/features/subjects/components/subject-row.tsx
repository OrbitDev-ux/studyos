import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteSubjectButton } from "@/features/subjects/components/delete-subject-button";
import { SubjectFormDialog } from "@/features/subjects/components/subject-form-dialog";
import type { Subject } from "@/generated/prisma/client";

export function SubjectRow({
  subject,
  editLabel,
}: {
  subject: Subject;
  editLabel: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: subject.color }}
      />
      <span className="flex-1 truncate text-sm font-medium">{subject.name}</span>
      <SubjectFormDialog
        subject={{ id: subject.id, name: subject.name, color: subject.color }}
        trigger={
          <Button type="button" size="icon-sm" variant="ghost" aria-label={editLabel}>
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DeleteSubjectButton subjectId={subject.id} />
    </li>
  );
}
