/**
 * Curriculum data integrity check (PHASE 11). Run with `npm run check:curriculum`
 * or `node scripts/check-curriculum.mjs`. Plain JS (not .ts) on purpose, same
 * reason as verify-ban.mjs — tsconfig's `include` is `**\/*.ts`, so a .ts file
 * here would get pulled into Next.js's own project-wide type check at build
 * time. Node still type-strips the *imported* data.ts natively (Node 22.6+),
 * so this still reads real, current curriculum data, not a stale copy.
 *
 * Checks the static tree (features/curriculum/data.ts) for structural
 * problems, then — if DATABASE_URL is set — cross-checks real Problem rows
 * against it. DB checks are best-effort and skip cleanly if unreachable.
 *
 * Exits non-zero if any ERROR-level issue is found (duplicate/empty/broken
 * relationships in the static tree). Missing revisionYear and DB-side
 * mismatches are WARNINGs — expected/legitimate in places (unconfirmed
 * official rollout year; old free-text Problem.unit values predating this
 * taxonomy) rather than bugs.
 */
import { CURRICULUM } from "../src/features/curriculum/data.ts";

const issues = [];
const err = (message) => issues.push({ level: "ERROR", message });
const warn = (message) => issues.push({ level: "WARN", message });

// --- Static tree checks -----------------------------------------------

const gradeIds = CURRICULUM.map((g) => g.id);
const dupGradeIds = gradeIds.filter((id, i) => gradeIds.indexOf(id) !== i);
if (dupGradeIds.length > 0) err(`중복 grade id: ${[...new Set(dupGradeIds)].join(", ")}`);

for (const grade of CURRICULUM) {
  if (!grade.name.trim()) err(`grade "${grade.id}"의 이름이 비어 있음`);
  if (grade.revisionYear === undefined) {
    warn(`grade "${grade.id}"(${grade.name})의 revisionYear 미확정 — 공식 자료 확인 전까지는 정상`);
  }

  const subjectIds = grade.subjects.map((s) => s.id);
  const dupSubjectIds = subjectIds.filter((id, i) => subjectIds.indexOf(id) !== i);
  if (dupSubjectIds.length > 0) {
    err(`grade "${grade.id}" 안에 중복 subject id: ${[...new Set(dupSubjectIds)].join(", ")}`);
  }

  for (const subject of grade.subjects) {
    if (!subject.name.trim()) err(`grade "${grade.id}"의 subject "${subject.id}" 이름이 비어 있음`);
    if (subject.units.length === 0) {
      err(`grade "${grade.id}" / subject "${subject.id}"(${subject.name})에 unit이 하나도 없음`);
    }

    const unitIds = subject.units.map((u) => u.id);
    const dupUnitIds = unitIds.filter((id, i) => unitIds.indexOf(id) !== i);
    if (dupUnitIds.length > 0) {
      err(
        `grade "${grade.id}" / subject "${subject.id}" 안에 중복 unit id: ${[...new Set(dupUnitIds)].join(", ")}`,
      );
    }

    for (const unit of subject.units) {
      if (!unit.name.trim()) {
        err(`grade "${grade.id}" / subject "${subject.id}"의 unit "${unit.id}" 이름이 비어 있음`);
      }
    }

    // Same unit *name* appearing twice under one subject (different ids) is a
    // duplicate a learner would actually see in the dropdown — check names too,
    // not just ids.
    const unitNames = subject.units.map((u) => u.name);
    const dupUnitNames = unitNames.filter((n, i) => unitNames.indexOf(n) !== i);
    if (dupUnitNames.length > 0) {
      err(
        `grade "${grade.id}" / subject "${subject.id}" 안에 이름이 같은 unit이 여러 개: ${[...new Set(dupUnitNames)].join(", ")}`,
      );
    }
  }
}

// --- DB cross-check (best-effort) --------------------------------------

async function checkDb() {
  if (!process.env.DATABASE_URL) {
    warn("DATABASE_URL 미설정 — DB 대조 스킵(정적 트리 검사만 수행됨)");
    return;
  }
  try {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../src/generated/prisma/client.ts");
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });

    const knownUnitNames = new Set(
      CURRICULUM.flatMap((g) => g.subjects.flatMap((s) => s.units.map((u) => u.name))),
    );
    const knownGradeNames = new Set(CURRICULUM.map((g) => g.name));

    const units = await prisma.problem.groupBy({
      by: ["unit"],
      where: { unit: { not: null } },
      _count: true,
    });
    const unknownUnits = units.filter((u) => u.unit && !knownUnitNames.has(u.unit));
    if (unknownUnits.length > 0) {
      warn(
        `DB에 현재 curriculum 트리에 없는 unit 값 사용 중(오래된 자유 입력 가능성): ` +
          unknownUnits.map((u) => `"${u.unit}"(${u._count}건)`).join(", "),
      );
    }

    const grades = await prisma.problem.groupBy({
      by: ["grade"],
      where: { grade: { not: null } },
      _count: true,
    });
    const unknownGrades = grades.filter((g) => g.grade && !knownGradeNames.has(g.grade));
    if (unknownGrades.length > 0) {
      warn(
        `DB에 현재 curriculum 트리에 없는 grade 값 사용 중: ` +
          unknownGrades.map((g) => `"${g.grade}"(${g._count}건)`).join(", "),
      );
    }

    await prisma.$disconnect();
  } catch (e) {
    warn(`DB 대조 실패(연결 불가 등) — 정적 트리 검사 결과만 유효: ${e.message}`);
  }
}

await checkDb();

// --- Report --------------------------------------------------------------

const errors = issues.filter((i) => i.level === "ERROR");
const warnings = issues.filter((i) => i.level === "WARN");

console.log(`\n교육과정 데이터 무결성 검사 (grades=${CURRICULUM.length})\n`);
for (const i of errors) console.log(`  [ERROR] ${i.message}`);
for (const i of warnings) console.log(`  [WARN]  ${i.message}`);
console.log(`\n결과: ${errors.length}개 오류, ${warnings.length}개 경고\n`);

if (errors.length > 0) process.exit(1);
