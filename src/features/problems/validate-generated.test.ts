import { describe, expect, it } from "vitest";
import { filterUngradableAnswers } from "@/features/problems/validate-generated";

describe("filterUngradableAnswers", () => {
  it("drops a SHORT_ANSWER item with no answerText", () => {
    const { kept, droppedCount } = filterUngradableAnswers(
      [{ answerText: "정답" }, { answerText: undefined }, { answerText: "" }],
      "SHORT_ANSWER",
    );
    expect(kept).toEqual([{ answerText: "정답" }]);
    expect(droppedCount).toBe(2);
  });

  it("drops a SHORT_ANSWER item whose answerText is whitespace-only", () => {
    const { kept, droppedCount } = filterUngradableAnswers(
      [{ answerText: "   " }],
      "SHORT_ANSWER",
    );
    expect(kept).toEqual([]);
    expect(droppedCount).toBe(1);
  });

  it("never touches MULTIPLE_CHOICE — grading doesn't depend on answerText there", () => {
    const { kept, droppedCount } = filterUngradableAnswers(
      [{ answerText: undefined }, { answerText: "" }],
      "MULTIPLE_CHOICE",
    );
    expect(kept.length).toBe(2);
    expect(droppedCount).toBe(0);
  });

  it("never touches ESSAY — grading comes from selfCorrect, not answerText", () => {
    const { kept, droppedCount } = filterUngradableAnswers(
      [{ answerText: undefined }],
      "ESSAY",
    );
    expect(kept.length).toBe(1);
    expect(droppedCount).toBe(0);
  });

  it("keeps everything when all SHORT_ANSWER items have a real answer", () => {
    const { kept, droppedCount } = filterUngradableAnswers(
      [{ answerText: "A" }, { answerText: "B" }],
      "SHORT_ANSWER",
    );
    expect(kept.length).toBe(2);
    expect(droppedCount).toBe(0);
  });
});
