import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LabBoard, type LabCardData } from "@/features/lab/components/lab-board";
import { LAB_FEATURES } from "@/features/lab/registry";
import { getFeedbackCounts, getLabFeatureStates, getUserVotes } from "@/features/lab/state";
import { getStudyBooks } from "@/features/study-books/queries";
import { getMessages } from "@/features/i18n/messages";
import { getServerLocale } from "@/features/i18n/server";
import { requireCurrentUser } from "@/lib/session";

export const metadata = { title: "실험실" };

export default async function LabPage() {
  const user = await requireCurrentUser();
  const [states, feedback, votes, books] = await Promise.all([
    getLabFeatureStates(),
    getFeedbackCounts(),
    getUserVotes(user.id),
    getStudyBooks(user.id),
  ]);

  // Only public + admin-enabled features are shown to users. adminNote/counters
  // are NOT sent to the client here (admins see analytics in /admin/lab).
  const cards: LabCardData[] = LAB_FEATURES.filter(
    (f) => f.visibility === "public" && (states.get(f.key)?.enabled ?? true),
  ).map((f) => ({
    key: f.key,
    name: f.name,
    emoji: f.emoji,
    description: f.description,
    status: f.status,
    category: f.category,
    cta: f.cta,
    likes: feedback.get(f.key)?.likes ?? 0,
    dislikes: feedback.get(f.key)?.dislikes ?? 0,
    myVote: votes.get(f.key) ?? null,
  }));
  const t = getMessages(await getServerLocale(user.locale)).lab;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader icon={FlaskConical} title={t.title} subtitle={t.subtitle} />

      <LabBoard cards={cards} books={books.map((b) => ({ id: b.id, title: b.title }))} />
    </div>
  );
}
