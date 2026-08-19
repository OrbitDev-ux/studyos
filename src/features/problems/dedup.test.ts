import { describe, expect, it } from "vitest";
import { filterDuplicateProblems } from "@/features/problems/dedup";

describe("filterDuplicateProblems", () => {
  it("drops a generated problem that exactly matches an existing prompt", () => {
    const { kept, duplicateCount } = filterDuplicateProblems(
      [{ prompt: "정수와 유리수의 덧셈을 구하시오." }, { prompt: "새로운 문제입니다." }],
      ["정수와 유리수의 덧셈을 구하시오."],
    );
    expect(kept).toEqual([{ prompt: "새로운 문제입니다." }]);
    expect(duplicateCount).toBe(1);
  });

  it("is whitespace/줄바꿈 무관하게 동일 취급한다 (normalizeText)", () => {
    const { kept, duplicateCount } = filterDuplicateProblems(
      [{ prompt: "정수와   유리수의\n덧셈을 구하시오." }],
      ["정수와 유리수의 덧셈을 구하시오."],
    );
    expect(kept).toEqual([]);
    expect(duplicateCount).toBe(1);
  });

  it("같은 배치 안에서 AI가 스스로 반복해도 두 번째부터 걸러낸다", () => {
    const { kept, duplicateCount } = filterDuplicateProblems(
      [{ prompt: "같은 문제" }, { prompt: "같은 문제" }, { prompt: "다른 문제" }],
      [],
    );
    expect(kept).toEqual([{ prompt: "같은 문제" }, { prompt: "다른 문제" }]);
    expect(duplicateCount).toBe(1);
  });

  it("중복이 없으면 전부 통과한다", () => {
    const { kept, duplicateCount } = filterDuplicateProblems(
      [{ prompt: "A" }, { prompt: "B" }],
      ["C", "D"],
    );
    expect(kept.length).toBe(2);
    expect(duplicateCount).toBe(0);
  });
});
