"use client";

import { BookMarked, FileText, Search, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { navItems } from "@/config/nav";
import { getSearchIndex, type SearchIndex } from "@/features/search/actions";
import { cn } from "@/lib/utils";

type Row = {
  key: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: LucideIcon;
};
type Group = { label: string; rows: Row[] };

const CONTENT_LIMIT = 6;

/**
 * 전역 검색 — ⌘K / Ctrl+K 로 열리는 명령 팔레트.
 * cmdk 의존성 없이 Dialog(radix: 포커스 트랩·ESC 기본) + Input으로 구성.
 * 검색 대상: 앱 페이지(내비) + 내 문제 + 내 교재. 문제/교재는 열릴 때 경량
 * 인덱스(getSearchIndex)를 1회 로드해 클라이언트 사이드로 필터링한다.
 * (추후 확장: 대량 데이터에서는 debounce된 서버 검색으로 전환.)
 */
export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [loading, setLoading] = useState(false);

  // ⌘K / Ctrl+K 전역 단축키로 열기.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 열릴 때 검색어 초기화 + 콘텐츠 인덱스 1회 로드(캐시).
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    if (index === null && !loading) {
      setLoading(true);
      getSearchIndex()
        .then(setIndex)
        .catch(() => setIndex({ problems: [], books: [] }))
        .finally(() => setLoading(false));
    }
  }, [open, index, loading]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const groups = useMemo<Group[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (s?: string) => !!s && s.toLowerCase().includes(q);

    const pageRows: Row[] = navItems
      .filter((item) => !q || match(item.title) || match(item.description))
      .map((item) => ({
        key: `page-${item.href}`,
        label: item.title,
        sublabel: item.description,
        href: item.href,
        icon: item.icon,
      }));

    // 콘텐츠(문제/교재)는 검색어가 있을 때만 노출해 빈 상태를 깔끔하게 유지.
    const problemRows: Row[] = q
      ? (index?.problems ?? [])
          .filter((p) => match(p.label) || match(p.sublabel))
          .slice(0, CONTENT_LIMIT)
          .map((p) => ({
            key: `problem-${p.id}`,
            label: p.label,
            sublabel: p.sublabel,
            href: p.href,
            icon: FileText,
          }))
      : [];

    const bookRows: Row[] = q
      ? (index?.books ?? [])
          .filter((b) => match(b.label) || match(b.sublabel))
          .slice(0, CONTENT_LIMIT)
          .map((b) => ({
            key: `book-${b.id}`,
            label: b.label,
            sublabel: b.sublabel,
            href: b.href,
            icon: BookMarked,
          }))
      : [];

    return [
      { label: "페이지", rows: pageRows },
      { label: "문제", rows: problemRows },
      { label: "교재", rows: bookRows },
    ].filter((g) => g.rows.length > 0);
  }, [query, index]);

  // 그룹을 가로질러 평탄화한 배열 — 방향키 내비게이션의 기준.
  const flatRows = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flatRows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = flatRows[active];
      if (row) go(row.href);
    }
  }

  return (
    <>
      {/* 데스크톱: 검색창 형태 / 모바일: 아이콘 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="검색"
        className="text-muted-foreground hover:bg-muted flex h-9 items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors sm:w-56 sm:px-3"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden flex-1 text-left sm:inline">검색</span>
        <kbd className="bg-muted text-muted-foreground pointer-events-none hidden rounded border px-1.5 py-0.5 text-[0.65rem] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-24 translate-y-0 gap-0 p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">검색</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="페이지 · 문제 · 교재 검색..."
              className="h-12 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {flatRows.length === 0 ? (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                {loading ? "불러오는 중..." : "검색 결과가 없어요."}
              </p>
            ) : (
              groups.map((group) => {
                return (
                  <div key={group.label} className="mb-1 last:mb-0">
                    <p className="text-muted-foreground px-3 pt-2 pb-1 text-xs font-medium">
                      {group.label}
                    </p>
                    <ul>
                      {group.rows.map((row) => {
                        const i = flatRows.findIndex((r) => r.key === row.key);
                        const Icon = row.icon;
                        return (
                          <li key={row.key}>
                            <button
                              type="button"
                              onClick={() => go(row.href)}
                              onMouseMove={() => setActive(i)}
                              aria-current={i === active}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                                i === active ? "bg-muted" : "hover:bg-muted/60",
                              )}
                            >
                              <Icon className="text-muted-foreground size-4 shrink-0" />
                              <span className="flex-1 truncate">{row.label}</span>
                              {row.sublabel && (
                                <span className="text-muted-foreground shrink-0 text-xs">
                                  {row.sublabel}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
