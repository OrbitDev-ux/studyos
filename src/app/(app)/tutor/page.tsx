import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NewTutorDialog } from "@/features/tutor/components/new-tutor-dialog";
import { TutorConversationList } from "@/features/tutor/components/tutor-conversation-list";
import { getTutorConversations } from "@/features/tutor/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export const metadata = { title: "AI 과외 선생님" };

export default async function TutorPage() {
  const user = await requireCurrentUser();
  const conversations = await getTutorConversations(user.id);
  const t = getMessages(await getServerLocale(user.locale)).tutor;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            🧑‍🏫 {t.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.subtitle}</p>
        </div>
        <NewTutorDialog />
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
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
