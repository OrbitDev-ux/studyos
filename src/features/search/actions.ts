"use server";

import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/session";

export type SearchIndexItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
};

export type SearchIndex = {
  problems: SearchIndexItem[];
  books: SearchIndexItem[];
};

/**
 * 전역 검색용 경량 인덱스 — 현재 사용자의 문제/교재를 최소 필드만 로드한다.
 * 클라이언트(search-dialog)가 이 결과를 받아 클라이언트 사이드 필터링한다.
 * (추후 확장 지점: 대량 데이터셋에서는 query 인자를 받아 서버에서 LIKE/전문
 *  검색으로 좁히고, 오답노트·모의고사 등 다른 콘텐츠 타입을 추가한다.)
 */
export async function getSearchIndex(): Promise<SearchIndex> {
  const user = await requireCurrentUser();

  const [problems, books] = await Promise.all([
    prisma.problem.findMany({
      where: { userId: user.id },
      select: { id: true, prompt: true, unit: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.studyBook.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, subjectName: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  return {
    problems: problems.map((p) => ({
      id: p.id,
      label: p.prompt,
      sublabel: p.unit ?? undefined,
      // 문제 리스트의 앵커(problem-<id>)로 딥링크 → 해당 문제로 스크롤된다.
      href: `/problems#problem-${p.id}`,
    })),
    books: books.map((b) => ({
      id: b.id,
      label: b.title,
      sublabel: b.subjectName,
      href: `/study-books/${b.id}`,
    })),
  };
}
