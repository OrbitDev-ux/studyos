import {
  CURRICULUM,
  CURRICULUM_ID,
  CURRICULUM_NAME,
  type CurriculumGrade,
  type CurriculumSubject,
  type CurriculumUnit,
} from "@/features/curriculum/data";

/**
 * Pure taxonomy lookup + validation over the static CURRICULUM tree. No DB, no
 * imports beyond the data module, so it is fully unit-testable and shared by the
 * server action (authoritative validation) and the client form (cascading
 * selects). The server NEVER trusts client-sent ids — it re-validates the whole
 * (grade → subject → unit) path here and derives canonical names from the tree.
 */

export const QUESTION_TYPE_IDS = ["MULTIPLE_CHOICE", "SHORT_ANSWER"] as const;
export type QuestionTypeId = (typeof QUESTION_TYPE_IDS)[number];

export function isQuestionType(value: string): value is QuestionTypeId {
  return (QUESTION_TYPE_IDS as readonly string[]).includes(value);
}

/** Lightweight option shapes for building dropdowns. */
export type Option = { id: string; name: string };

export function getCurriculumOption(): Option {
  return { id: CURRICULUM_ID, name: CURRICULUM_NAME };
}

export function listGrades(): Option[] {
  return CURRICULUM.map((g) => ({ id: g.id, name: g.name }));
}

export function findGrade(gradeId: string): CurriculumGrade | undefined {
  return CURRICULUM.find((g) => g.id === gradeId);
}

export function listSubjects(gradeId: string): Option[] {
  return (findGrade(gradeId)?.subjects ?? []).map((s) => ({ id: s.id, name: s.name }));
}

export function findSubject(
  gradeId: string,
  subjectId: string,
): CurriculumSubject | undefined {
  return findGrade(gradeId)?.subjects.find((s) => s.id === subjectId);
}

export function listUnits(gradeId: string, subjectId: string): Option[] {
  return (findSubject(gradeId, subjectId)?.units ?? []).map((u) => ({
    id: u.id,
    name: u.name,
  }));
}

export function findUnit(
  gradeId: string,
  subjectId: string,
  unitId: string,
): CurriculumUnit | undefined {
  return findSubject(gradeId, subjectId)?.units.find((u) => u.id === unitId);
}

export type TaxonomySelection = {
  gradeId: string;
  subjectId: string;
  /** Optional: a subject-wide set with no specific unit is allowed. */
  unitId?: string | null;
};

/** The canonical, server-authoritative result of validating a selection. */
export type ResolvedTaxonomy = {
  gradeId: string;
  gradeName: string;
  /** Canonical subject name → mapped to the user's Subject row by the caller. */
  subjectName: string;
  /** Canonical unit name → stored verbatim into Problem.unit (null if none). */
  unitName: string | null;
};

/**
 * Validate a client-supplied selection against the tree and return canonical
 * names, or an error message. This is the single authoritative gate: an invalid
 * grade/subject/unit id, or a unit that doesn't belong to the chosen subject, is
 * rejected — never silently accepted or passed through to the AI.
 */
export function resolveTaxonomy(
  selection: TaxonomySelection,
): { ok: true; value: ResolvedTaxonomy } | { ok: false; error: string } {
  const grade = findGrade(selection.gradeId);
  if (!grade) return { ok: false, error: "학년을 다시 선택해주세요." };

  const subject = grade.subjects.find((s) => s.id === selection.subjectId);
  if (!subject) return { ok: false, error: "과목을 다시 선택해주세요." };

  let unitName: string | null = null;
  if (selection.unitId) {
    const unit = subject.units.find((u) => u.id === selection.unitId);
    if (!unit) return { ok: false, error: "단원을 다시 선택해주세요." };
    unitName = unit.name;
  }

  return {
    ok: true,
    value: {
      gradeId: grade.id,
      gradeName: grade.name,
      subjectName: subject.name,
      unitName,
    },
  };
}
