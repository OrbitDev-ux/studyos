import { z } from "zod";

export const subjectFormSchema = z.object({
  name: z.string().trim().min(1, "과목명을 입력해주세요").max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상을 선택해주세요"),
});

export type SubjectFormValues = z.infer<typeof subjectFormSchema>;
