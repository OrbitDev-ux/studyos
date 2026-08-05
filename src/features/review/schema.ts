import { z } from "zod";

/** Shape the AI must return for a wrong-answer explanation. */
export const aiExplanationSchema = z.object({
  explanation: z.string().min(1),
});
