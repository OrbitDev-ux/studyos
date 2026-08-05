import { z } from "zod";

export const todoFormSchema = z.object({
  title: z.string().trim().min(1, "할 일을 입력해주세요").max(200),
  subjectId: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜를 선택해주세요"),
});

export type TodoFormValues = z.infer<typeof todoFormSchema>;
