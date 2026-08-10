/**
 * Study-book type registry — config, not a Prisma enum, so new types can be
 * added here without a migration (StudyBook.type is a free-form string). Keep
 * ids stable; labels are Korean display text.
 */
export const STUDY_BOOK_TYPES = [
  { id: "concept", label: "개념서" },
  { id: "problem", label: "문제집" },
  { id: "concept_problem", label: "개념 + 문제" },
  { id: "wrong_review", label: "오답 복습 교재" },
  { id: "exam_prep", label: "시험 대비 교재" },
  { id: "advanced", label: "심화 교재" },
  { id: "custom", label: "맞춤형 교재" },
] as const;

export type StudyBookTypeId = (typeof STUDY_BOOK_TYPES)[number]["id"];

export const STUDY_BOOK_TYPE_IDS = STUDY_BOOK_TYPES.map((t) => t.id) as [
  StudyBookTypeId,
  ...StudyBookTypeId[],
];

export const STUDY_BOOK_TYPE_LABEL = Object.fromEntries(
  STUDY_BOOK_TYPES.map((t) => [t.id, t.label]),
) as Record<StudyBookTypeId, string>;

export function isStudyBookType(value: string): value is StudyBookTypeId {
  return (STUDY_BOOK_TYPE_IDS as readonly string[]).includes(value);
}

export function studyBookTypeLabel(id: string): string {
  return isStudyBookType(id) ? STUDY_BOOK_TYPE_LABEL[id] : id;
}

/** True for types that are built primarily from the user's own wrong answers. */
export function isWrongReviewType(id: string): boolean {
  return id === "wrong_review";
}
