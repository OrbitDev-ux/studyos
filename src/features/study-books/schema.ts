import { z } from "zod";
import { aiProblemSchema } from "@/features/problems/schema";
import { STUDY_BOOK_TYPE_IDS } from "@/features/study-books/types";

/**
 * Study-book generation input (client → server). Taxonomy ids are re-validated
 * server-side against the curriculum tree (never trusted). `customInstructions`
 * is the user's "나만의 교재 지침" — a bounded, optional free-text style hint.
 */
export const studyBookFormSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요").max(80),
  gradeId: z.string().min(1, "학년을 선택해주세요"),
  subjectId: z.string().min(1, "과목을 선택해주세요"),
  unitId: z.string().min(1, "단원을 선택해주세요"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  type: z.enum(STUDY_BOOK_TYPE_IDS),
  chapterCount: z.coerce.number().int().min(1, "1개 이상").max(6, "최대 6개"),
  problemsPerChapter: z.coerce.number().int().min(1, "1개 이상").max(8, "최대 8개"),
  /** Personal instructions — style guidance only; bounded to limit prompt size. */
  customInstructions: z.string().trim().max(1000).optional(),
});

export type StudyBookFormInput = z.input<typeof studyBookFormSchema>;
export type StudyBookFormValues = z.output<typeof studyBookFormSchema>;

/** Update payload (title / personal instructions), server-side ownership checked. */
export const studyBookUpdateSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  customInstructions: z.string().trim().max(1000).nullable().optional(),
});
export type StudyBookUpdateValues = z.output<typeof studyBookUpdateSchema>;

// ── AI output shape (validated by generateStructured before any DB write) ──

/** A book problem reuses the same problem shape as everywhere else, plus a
 * difficulty tier that maps to the item kind (practice / application / advanced). */
export const aiBookProblemSchema = aiProblemSchema.extend({
  tier: z.enum(["practice", "application", "advanced"]).default("practice"),
});

export const aiBookChapterSchema = z.object({
  title: z.string().min(1),
  /** Concept explanation prose for the chapter. */
  concept: z.string().min(1),
  /** Learning / review points (short bullet-like text). */
  reviewPoints: z.string().optional(),
  /** Worked examples (prose). */
  examples: z.array(z.string()).optional(),
  problems: z.array(aiBookProblemSchema),
});

export const aiBookSchema = z.object({
  chapters: z.array(aiBookChapterSchema),
});

/** A single regenerated chapter (chapter-scoped AI call). */
export const aiBookChapterOnlySchema = aiBookChapterSchema;

export type AiBookChapter = z.infer<typeof aiBookChapterSchema>;
