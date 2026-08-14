import { describe, expect, it } from "vitest";
import { addPlanTasksSchema, studyPlanSchema } from "@/features/planner/schema";

describe("studyPlanSchema", () => {
  it("accepts a bounded, well-formed plan", () => {
    const plan = studyPlanSchema.parse({
      summary: "오늘은 분수의 나눗셈을 복습합니다.",
      tasks: [{ subject: "수학", title: "분수의 나눗셈 복습", estimatedMinutes: 25 }],
    });
    expect(plan.tasks).toHaveLength(1);
  });

  it("rejects an empty task list and out-of-range durations", () => {
    expect(studyPlanSchema.safeParse({ summary: "x", tasks: [] }).success).toBe(false);
    expect(
      studyPlanSchema.safeParse({
        summary: "x",
        tasks: [{ subject: "수학", title: "t", estimatedMinutes: 1 }],
      }).success,
    ).toBe(false);
  });

  it("caps the plan at 8 tasks (§10 realism)", () => {
    const tasks = Array.from({ length: 9 }, (_, i) => ({
      subject: "수학",
      title: `t${i}`,
      estimatedMinutes: 20,
    }));
    expect(studyPlanSchema.safeParse({ summary: "x", tasks }).success).toBe(false);
  });

  it("addPlanTasksSchema validates the commit payload", () => {
    expect(
      addPlanTasksSchema.safeParse({
        tasks: [{ subject: "수학", title: "복습", estimatedMinutes: 20 }],
      }).success,
    ).toBe(true);
    expect(addPlanTasksSchema.safeParse({ tasks: [] }).success).toBe(false);
  });
});
