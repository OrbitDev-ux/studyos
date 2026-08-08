import { z } from "zod";

// Curriculum-taxonomy-driven generation input. The client sends taxonomy ids
// (grade → curriculum subject → unit); the server re-validates the path against
// the static tree (features/curriculum/taxonomy.ts) and resolves it onto the
// user's own Subject row + canonical unit string. Free-text subject/unit entry
// is gone — this is what normalizes "5학년 수학" / "초5 수학" / "수학 5" into one
// canonical (Subject, unit) so the Learning-OS aggregations stay consistent.
export const problemGenerationFormSchema = z.object({
  gradeId: z.string().min(1, "학년을 선택해주세요"),
  subjectId: z.string().min(1, "과목을 선택해주세요"),
  unitId: z.string().min(1, "단원을 선택해주세요"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  type: z.enum(["MULTIPLE_CHOICE", "SHORT_ANSWER"]),
  count: z.coerce
    .number()
    .int()
    .min(1, "1개 이상 입력해주세요")
    .max(10, "한 번에 최대 10개까지 생성할 수 있어요"),
});

export type ProblemGenerationFormInput = z.input<typeof problemGenerationFormSchema>;
export type ProblemGenerationFormValues = z.output<typeof problemGenerationFormSchema>;

/** Shape the AI must return — validated by generateStructured() before it ever touches the DB. */
export const aiChoiceSchema = z.object({
  label: z.string().min(1),
  content: z.string().min(1),
  isCorrect: z.boolean(),
});

export const aiProblemSchema = z.object({
  prompt: z.string().min(1),
  explanation: z.string().min(1),
  choices: z.array(aiChoiceSchema).optional(),
  answerText: z.string().optional(),
});

export const aiProblemSetSchema = z.object({
  problems: z.array(aiProblemSchema),
});
