import { describe, expect, it } from "vitest";
import { CURRICULUM } from "@/features/curriculum/data";
import {
  isQuestionType,
  listGrades,
  listSubjects,
  listUnits,
  resolveTaxonomy,
} from "@/features/curriculum/taxonomy";

describe("curriculum taxonomy", () => {
  it("exposes grades and cascading subjects/units for a real path", () => {
    const grades = listGrades();
    expect(grades.length).toBeGreaterThan(0);

    const grade = grades[0]!;
    const subjects = listSubjects(grade.id);
    expect(subjects.length).toBeGreaterThan(0);

    const subject = subjects[0]!;
    const units = listUnits(grade.id, subject.id);
    expect(units.length).toBeGreaterThan(0);
  });

  it("resolves a valid (grade → subject → unit) path to canonical names", () => {
    const grade = CURRICULUM.find((g) => g.id === "elem-5")!;
    const math = grade.subjects.find((s) => s.id === "math")!;
    const unit = math.units.find((u) => u.id === "fraction-mult")!;

    const result = resolveTaxonomy({
      gradeId: "elem-5",
      subjectId: "math",
      unitId: "fraction-mult",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        gradeId: "elem-5",
        gradeName: grade.name,
        subjectName: math.name, // "수학"
        unitName: unit.name, // "분수의 곱셈"
      },
    });
  });

  it("allows a subject-wide selection with no unit", () => {
    const result = resolveTaxonomy({ gradeId: "elem-5", subjectId: "math" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.unitName).toBeNull();
  });

  it("rejects a non-existent grade id", () => {
    expect(resolveTaxonomy({ gradeId: "nope", subjectId: "math" }).ok).toBe(false);
  });

  it("rejects a subject that is not in the chosen grade", () => {
    // 과학 exists in elem-5 but not in middle-1 in this dataset.
    const inElem = resolveTaxonomy({ gradeId: "elem-5", subjectId: "science" });
    const inMiddle = resolveTaxonomy({ gradeId: "middle-1", subjectId: "science" });
    expect(inElem.ok).toBe(true);
    expect(inMiddle.ok).toBe(false);
  });

  it("rejects a unit that does not belong to the chosen subject", () => {
    const result = resolveTaxonomy({
      gradeId: "elem-5",
      subjectId: "math",
      unitId: "reading", // a 국어 unit, not a math unit
    });
    expect(result.ok).toBe(false);
  });

  it("validates question types", () => {
    expect(isQuestionType("MULTIPLE_CHOICE")).toBe(true);
    expect(isQuestionType("SHORT_ANSWER")).toBe(true);
    expect(isQuestionType("ESSAY")).toBe(false);
  });

  it("has globally-unique grade ids and unique subject/unit ids within scope", () => {
    const gradeIds = CURRICULUM.map((g) => g.id);
    expect(new Set(gradeIds).size).toBe(gradeIds.length);

    for (const grade of CURRICULUM) {
      const subjectIds = grade.subjects.map((s) => s.id);
      expect(new Set(subjectIds).size).toBe(subjectIds.length);
      for (const subject of grade.subjects) {
        const unitIds = subject.units.map((u) => u.id);
        expect(new Set(unitIds).size).toBe(unitIds.length);
        expect(unitIds.length).toBeGreaterThan(0);
      }
    }
  });
});
