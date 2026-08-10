import { z } from "zod";

export const mockExamGenerationFormSchema = z.object({
  subjectId: z.string().min(1, "과목을 선택해주세요"),
  style: z.string().trim().max(30).optional(),
  count: z.coerce
    .number()
    .int()
    .min(5, "5문항 이상 입력해주세요")
    .max(50, "최대 50문항까지 가능합니다"),
  /** Optional 서술형 문항 수 — auto-graded MC + self-reviewed essays. */
  essayCount: z.coerce.number().int().min(0).max(10, "서술형은 최대 10문항").default(0),
  timeLimitMinutes: z.coerce
    .number()
    .int()
    .min(5, "5분 이상 입력해주세요")
    .max(180, "최대 180분까지 가능합니다"),
});

export type MockExamGenerationFormInput = z.input<typeof mockExamGenerationFormSchema>;
export type MockExamGenerationFormValues = z.output<typeof mockExamGenerationFormSchema>;

export const submitExamSchema = z.object({
  durationSec: z.number().int().min(0),
  answers: z.array(
    z.object({
      problemId: z.string(),
      choiceId: z.string().optional(),
      text: z.string().optional(),
    }),
  ),
});

export type SubmitExamInput = z.infer<typeof submitExamSchema>;
