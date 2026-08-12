import { notFound } from "next/navigation";
import { StudyBookPrintDocument } from "@/features/study-books/components/study-book-print-document";
import { StudyBookPrintToolbar } from "@/features/study-books/components/study-book-print-toolbar";
import { parseIncludeLevel } from "@/features/study-books/print/options";
import { getStudyBook } from "@/features/study-books/queries";
import { requireCurrentUser } from "@/lib/session";

/**
 * Printable / PDF view of a study book. Owner-scoped (getStudyBook filters by
 * userId → another user's bookId can't be reached). Reuses the book data
 * untouched; only the presentation is the A4 document. Browser print / "PDF 저장"
 * is triggered from the toolbar (window.print) — no PDF library.
 *
 * ?include = problems | answers | explanations (default: explanations)
 * ?chapter = <chapterId>  → 현재 챕터만 (absent → 전체 교재)
 */
export default async function StudyBookPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>;
  searchParams: Promise<{ include?: string; chapter?: string }>;
}) {
  const { bookId } = await params;
  const { include: includeParam, chapter: chapterId } = await searchParams;
  const user = await requireCurrentUser();

  const book = await getStudyBook(bookId, user.id);
  if (!book) notFound();

  const include = parseIncludeLevel(includeParam);
  const chapters = chapterId
    ? book.chapters.filter((c) => c.id === chapterId)
    : book.chapters;
  // A stale/invalid chapter id (e.g. deleted chapter) → nothing to print.
  if (chapters.length === 0) notFound();

  return (
    <>
      <StudyBookPrintToolbar bookId={book.id} chapterId={chapterId} include={include} />
      <StudyBookPrintDocument book={book} chapters={chapters} include={include} />
    </>
  );
}
