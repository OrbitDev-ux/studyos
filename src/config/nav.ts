import {
  BarChart3,
  BookMarked,
  BookOpen,
  ClipboardList,
  Library,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Sparkles,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** 사이드바에서 항목의 역할을 한 줄로 구분해준다(예: 문제 vs 문제은행). */
  description?: string;
};

export type NavGroup = { label: string; items: NavItem[] };

/**
 * 사이드바 정보구조 — 평면 나열 대신 학습/콘텐츠/계획/소셜로 그룹핑한다.
 * "문제"(내가 만든 AI 문제)와 "문제은행"(공유 문제 탐색)의 역할 차이를
 * description으로 명시한다.
 */
export const navGroups: NavGroup[] = [
  {
    label: "학습",
    items: [
      { title: "대시보드", href: "/dashboard", icon: LayoutDashboard },
      { title: "문제", href: "/problems", icon: Sparkles, description: "내 AI 문제 풀이" },
      { title: "문제은행", href: "/study-bank", icon: Library, description: "공유 문제 탐색" },
      { title: "오답노트", href: "/review", icon: NotebookPen },
      { title: "모의고사", href: "/mock-exam", icon: ClipboardList },
    ],
  },
  {
    label: "콘텐츠",
    items: [
      { title: "나만의 교재", href: "/study-books", icon: BookMarked },
      { title: "과목", href: "/subjects", icon: BookOpen },
    ],
  },
  {
    label: "계획",
    items: [
      { title: "Todo", href: "/todos", icon: ListTodo },
      { title: "통계", href: "/stats", icon: BarChart3 },
    ],
  },
  {
    label: "소셜",
    items: [
      { title: "친구", href: "/social", icon: Users },
      { title: "랭킹", href: "/ranking", icon: Trophy },
      { title: "배틀", href: "/battle", icon: Swords },
    ],
  },
];

/** 그룹을 평면화한 전체 목록(헤더 타이틀 매칭 등에 사용). */
export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

/** 모바일 하단 바텀 네비 — 핵심 동선 5개만. */
export const bottomNavItems: NavItem[] = [
  { title: "홈", href: "/dashboard", icon: LayoutDashboard },
  { title: "문제", href: "/problems", icon: Sparkles },
  { title: "교재", href: "/study-books", icon: BookMarked },
  { title: "오답노트", href: "/review", icon: NotebookPen },
  { title: "친구", href: "/social", icon: Users },
];
