import { describe, expect, it } from "vitest";
import { hasMath, parseMathSegments } from "@/features/problems/math/latex";

const mathLatex = (s: string) =>
  parseMathSegments(s)
    .filter((x) => x.kind === "math")
    .map((x) => (x as { latex: string }).latex);

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

describe("parseMathSegments — double-escaped payloads (model over-escape)", () => {
  it("renders \\\\( .. \\\\) with single-escaped content the same as canonical", () => {
    // delimiters double-escaped, content single (the reported symptom)
    expect(mathLatex("다음 중 \\\\(\\frac{7}{9} \\times \\frac{3}{7}\\\\)의 값은?")).toEqual([
      "\\frac{7}{9} \\times \\frac{3}{7}",
    ]);
  });

  it("collapses fully double-escaped content", () => {
    // both delimiters and commands double-escaped
    expect(mathLatex("\\\\(\\\\frac{2}{3}\\\\times\\\\frac{9}{14}\\\\)")).toEqual([
      "\\frac{2}{3}\\times\\frac{9}{14}",
    ]);
    expect(mathLatex("\\\\[\\\\frac{2}{3}+\\\\frac{1}{6}\\\\]")).toEqual([
      "\\frac{2}{3}+\\frac{1}{6}",
    ]);
  });
});

describe("parseMathSegments — conservative bare-fraction heuristic", () => {
  it("converts standalone numeric fractions", () => {
    expect(mathLatex("2/3")).toEqual(["\\frac{2}{3}"]);
    expect(mathLatex("1/2 + 2/3")).toEqual(["\\frac{1}{2}", "\\frac{2}{3}"]);
  });

  it("converts (group)/num", () => {
    expect(mathLatex("(a+b)/2 를 구하라")).toEqual(["\\frac{a+b}{2}"]);
  });

  it("does NOT convert dates, URLs, file paths, or spaced ratios", () => {
    expect(hasMath("2026/08/11")).toBe(false);
    expect(hasMath("https://studyos.app/x")).toBe(false);
    expect(hasMath("파일명/example.png")).toBe(false);
    expect(hasMath("경로 assets/img/2.png")).toBe(false);
    expect(hasMath("버전 3.14/2 는")).toBe(false); // decimal-adjacent
    expect(hasMath("1 / 43")).toBe(false); // 문항 진행 표시 (spaced)
    expect(hasMath("/api/problems/v1")).toBe(false);
  });

  it("leaves plain text untouched", () => {
    expect(parseMathSegments("안녕하세요")).toEqual([{ kind: "text", text: "안녕하세요" }]);
    expect(hasMath("일반 문장입니다.")).toBe(false);
  });
});

describe("parseMathSegments — repeated punctuation normalization", () => {
  it("collapses ?? / ??? / !!! in prose", () => {
    expect(parseMathSegments("것은??")).toEqual([{ kind: "text", text: "것은?" }]);
    expect(parseMathSegments("왜일까요???")).toEqual([{ kind: "text", text: "왜일까요?" }]);
    expect(parseMathSegments("정답입니다!!!")).toEqual([{ kind: "text", text: "정답입니다!" }]);
  });

  it("does not alter punctuation inside URLs/paths", () => {
    const url = "https://x.com/a??b";
    expect(parseMathSegments(url)).toEqual([{ kind: "text", text: url }]);
  });

  it("keeps text before/after math while normalizing prose", () => {
    expect(parseMathSegments("다음 \\(\\frac{2}{3}\\)의 값은??")).toEqual([
      { kind: "text", text: "다음 " },
      { kind: "math", latex: "\\frac{2}{3}", display: false },
      { kind: "text", text: "의 값은?" },
    ]);
  });
});
