import { describe, expect, it } from "vitest";
import { hasMath, parseMathSegments } from "@/features/problems/math/latex";

describe("parseMathSegments — explicit LaTeX (what the AI emits)", () => {
  it("renders inline \\( .. \\) as inline math", () => {
    const segs = parseMathSegments("분수 \\(\\frac{2}{3}\\)를 계산하시오.");
    expect(segs).toEqual([
      { kind: "text", text: "분수 " },
      { kind: "math", latex: "\\frac{2}{3}", display: false },
      { kind: "text", text: "를 계산하시오." },
    ]);
  });

  it("renders \\[ .. \\] and $$ .. $$ as block math", () => {
    expect(parseMathSegments("\\[\\frac{1}{2}\\]")).toEqual([
      { kind: "math", latex: "\\frac{1}{2}", display: true },
    ]);
    expect(parseMathSegments("$$x^2+1$$")).toEqual([
      { kind: "math", latex: "x^2+1", display: true },
    ]);
  });
});

describe("parseMathSegments — conservative bare-fraction heuristic", () => {
  const mathLatex = (s: string) =>
    parseMathSegments(s).filter((x) => x.kind === "math").map((x) => (x as { latex: string }).latex);

  it("converts standalone numeric fractions", () => {
    expect(mathLatex("2/3")).toEqual(["\\frac{2}{3}"]);
    expect(mathLatex("1/2 + 2/3")).toEqual(["\\frac{1}{2}", "\\frac{2}{3}"]);
  });

  it("converts (group)/num", () => {
    expect(mathLatex("(a+b)/2 를 구하라")).toEqual(["\\frac{a+b}{2}"]);
  });

  it("does NOT convert dates, URLs, or file paths", () => {
    expect(hasMath("2026/08/11")).toBe(false);
    expect(hasMath("https://studyos.app/x")).toBe(false);
    expect(hasMath("파일명/example.png")).toBe(false);
    expect(hasMath("경로 assets/img/2.png")).toBe(false);
    expect(hasMath("버전 3.14/2 는")).toBe(false); // decimal-adjacent
  });

  it("leaves plain text untouched", () => {
    expect(parseMathSegments("안녕하세요")).toEqual([{ kind: "text", text: "안녕하세요" }]);
    expect(hasMath("일반 문장입니다.")).toBe(false);
  });
});
