import { notFound } from "next/navigation";
import { StudyBookViewer } from "@/features/study-books/components/study-book-viewer";
import { getStudyBook, getStudyBookProgress } from "@/features/study-books/queries";
import { requireCurrentUser } from "@/lib/session";

// Chapter regeneration runs a long AI call in a Server Action.
export const maxDuration = 300;

export default async function StudyBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const user = await requireCurrentUser();

  // getStudyBook filters by userId — another user's bookId can't be reached.
  const [book, progress] = await Promise.all([
    getStudyBook(bookId, user.id),
    getStudyBookProgress(bookId, user.id),
  ]);
  if (!book) notFound();

  return <StudyBookViewer book={book} progress={progress} />;
}
