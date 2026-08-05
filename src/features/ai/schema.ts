import { z } from "zod";

/** Shape the AI must return for both weakness analysis and weekly reports. */
export const aiAnalysisResultSchema = z.object({
  content: z.string().min(1),
});
