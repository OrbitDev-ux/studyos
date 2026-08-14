import { z } from "zod";

/** User-supplied planner request. `goal` is free text (treated as data, never
 * as instructions to the model); `examDays` is the D-day countdown. */
export const studyPlanInputSchema = z.object({
  goal: z.string().trim().max(300).optional(),
  examDays: z.number().int().min(0).max(365).optional(),
});
export type StudyPlanInput = z.infer<typeof studyPlanInputSchema>;

/** One planned study block. `subject` is a display name (matched to the user's
 * own Subject when committing to Todos); `title` becomes the Todo title. */
export const studyPlanTaskSchema = z.object({
  subject: z.string().trim().max(40),
  title: z.string().trim().min(1).max(120),
  estimatedMinutes: z.number().int().min(5).max(240),
});
export type StudyPlanTask = z.infer<typeof studyPlanTaskSchema>;

/** Structured plan the AI must return — validated before anything is shown or
 * written. Bounded task count keeps the plan realistic (§10). */
export const studyPlanSchema = z.object({
  summary: z.string().trim().max(400),
  tasks: z.array(studyPlanTaskSchema).min(1).max(8),
});
export type StudyPlan = z.infer<typeof studyPlanSchema>;

/** Tasks the client asks to commit to Todos — re-validated server-side so an
 * arbitrary payload can never create todos. */
export const addPlanTasksSchema = z.object({
  tasks: z.array(studyPlanTaskSchema).min(1).max(8),
});
export type AddPlanTasksValues = z.infer<typeof addPlanTasksSchema>;
