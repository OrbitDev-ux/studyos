import { z } from "zod";

export const problemGenerationFormSchema = z.object({
  subjectId: z.string().min(1, "과목을 선택해주세요"),
  unit: z.string().trim().max(50).optional(),
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
