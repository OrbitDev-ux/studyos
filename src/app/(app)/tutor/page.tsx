import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NewTutorDialog } from "@/features/tutor/components/new-tutor-dialog";
import { TutorConversationList } from "@/features/tutor/components/tutor-conversation-list";
import { getTutorConversations } from "@/features/tutor/queries";
import { requireCurrentUser } from "@/lib/session";

export const metadata = { title: "AI 과외 선생님" };

export default async function TutorPage() {
  const user = await requireCurrentUser();
  const conversations = await getTutorConversations(user.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            🧑‍🏫 AI 과외 선생님
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            과목과 학년을 고르고, 1:1로 편하게 물어보세요. 정답을 바로 알려주기보다 함께 풀어가요.
          </p>
        </div>
        <NewTutorDialog />
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
            <GraduationCap className="size-8 opacity-40" />
            <p>아직 과외 대화가 없어요.</p>
            <p>&lsquo;새 과외 시작&rsquo;으로 첫 수업을 시작해보세요.</p>
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
