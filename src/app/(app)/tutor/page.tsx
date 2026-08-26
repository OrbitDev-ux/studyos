import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { NewTutorDialog } from "@/features/tutor/components/new-tutor-dialog";
import { TutorConversationList } from "@/features/tutor/components/tutor-conversation-list";
import {
  ReviewWithTutorCard,
  type DueConcept,
} from "@/features/tutor/components/review-with-tutor-card";
import { getTutorConversations } from "@/features/tutor/queries";
import { getDueReviews } from "@/features/review/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export const metadata = { title: "AI 과외 선생님" };

const MAX_DUE_CONCEPTS = 4;

export default async function TutorPage() {
  const user = await requireCurrentUser();
  const [conversations, dueReviews] = await Promise.all([
    getTutorConversations(user.id),
    getDueReviews(user.id, 20),
  ]);
  const t = getMessages(await getServerLocale(user.locale)).tutor;

  // One entry per distinct subject·unit concept, newest-due first.
  const dueConcepts: DueConcept[] = [];
  const seen = new Set<string>();
  for (const wa of dueReviews) {
    const subjectName = wa.problem.subject?.name ?? "";
    const unit = wa.problem.unit ?? "";
    const key = `${subjectName}::${unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = [subjectName, unit].filter(Boolean).join(" · ") || subjectName || unit;
    if (!label) continue;
    dueConcepts.push({ wrongAnswerId: wa.id, label, prompt: wa.problem.prompt });
    if (dueConcepts.length >= MAX_DUE_CONCEPTS) break;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 md:gap-8">
      <PageHeader
        icon={GraduationCap}
        title={t.title}
        subtitle={t.subtitle}
        actions={<NewTutorDialog />}
      />

      {dueConcepts.length > 0 && (
        <ReviewWithTutorCard
          concepts={dueConcepts}
          sectionTitle={t.reviewSectionTitle}
          reviewWithTutorLabel={t.reviewWithTutor}
        />
      )}

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 px-5 py-12 text-center text-sm">
            <GraduationCap className="size-8 opacity-40" />
            <p>{t.emptyTitle}</p>
            <p>{t.emptyDesc}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-3">
            <TutorConversationList
              conversations={conversations.map((c) => ({
                id: c.id,
                title: c.title,
                subject: c.subject,
                updatedAt: c.updatedAt.toISOString(),
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
