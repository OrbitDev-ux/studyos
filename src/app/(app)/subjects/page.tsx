import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SubjectFormDialog } from "@/features/subjects/components/subject-form-dialog";
import { SubjectRow } from "@/features/subjects/components/subject-row";
import { getSubjects } from "@/features/subjects/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export default async function SubjectsPage() {
  const user = await requireCurrentUser();
  const subjects = await getSubjects(user.id);
  const t = getMessages(await getServerLocale(user.locale)).subjects;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.title}
        actions={
          <SubjectFormDialog
            trigger={
              <Button type="button" size="sm" className="gap-1.5">
                <Plus className="size-4" />
                {t.add}
              </Button>
            }
          />
        }
      />
      {subjects.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {subjects.map((subject, index) => (
            <SubjectRow
              key={subject.id}
              subject={subject}
              editLabel={t.editLabel}
              isFirst={index === 0}
              isLast={index === subjects.length - 1}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
