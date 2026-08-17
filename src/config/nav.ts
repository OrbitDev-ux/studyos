import {
  BarChart3,
  BookMarked,
  BookOpen,
  ClipboardList,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  Library,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  NotebookPen,
  Sparkles,
  Swords,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Messages } from "@/features/i18n/messages";

export type NavItem = {
  /** i18n key into messages.nav; the label is looked up per locale (title = ko fallback). */
  key: keyof Messages["nav"];
  title: string;
  href: string;
  icon: LucideIcon;
  /** 사이드바에서 항목의 역할을 한 줄로 구분해준다(예: 문제 vs 문제은행). */
  description?: string;
};

export type NavGroup = {
  labelKey: keyof Messages["groups"];
  label: string;
  items: NavItem[];
};

/**
 * 사이드바 정보구조 — 학습/콘텐츠/계획/소셜/지원으로 그룹핑한다. 각 라벨은 i18n
 * key로 로케일별 번역되며, `title`/`label`은 한국어 fallback이다.
 */
export const navGroups: NavGroup[] = [
  {
    labelKey: "learning",
    label: "학습",
    items: [
      { key: "dashboard", title: "대시보드", href: "/dashboard", icon: LayoutDashboard },
      {
        key: "tutor",
        title: "AI 과외",
        href: "/tutor",
        icon: GraduationCap,
        description: "AI 선생님과 1:1",
      },
      {
        key: "problems",
        title: "문제",
        href: "/problems",
        icon: Sparkles,
        description: "내 AI 문제 풀이",
      },
      {
        key: "studyBank",
        title: "문제은행",
        href: "/study-bank",
        icon: Library,
        description: "공유 문제 탐색",
      },
      { key: "review", title: "오답노트", href: "/review", icon: NotebookPen },
      { key: "mockExam", title: "모의고사", href: "/mock-exam", icon: ClipboardList },
    ],
  },
  {
    labelKey: "content",
    label: "콘텐츠",
    items: [
      { key: "studyBooks", title: "나만의 교재", href: "/study-books", icon: BookMarked },
      {
        key: "studyMaterials",
        title: "자료실",
        href: "/study-materials",
        icon: FolderOpen,
      },
      { key: "subjects", title: "과목", href: "/subjects", icon: BookOpen },
      {
        key: "lab",
        title: "실험실",
        href: "/lab",
        icon: FlaskConical,
        description: "새 기능 미리보기",
      },
    ],
  },
  {
    labelKey: "plan",
    label: "계획",
    items: [
      { key: "todos", title: "Todo", href: "/todos", icon: ListTodo },
      { key: "stats", title: "통계", href: "/stats", icon: BarChart3 },
    ],
  },
  {
    labelKey: "social",
    label: "소셜",
    items: [
      { key: "friends", title: "친구", href: "/social", icon: Users },
      { key: "ranking", title: "랭킹", href: "/ranking", icon: Trophy },
      { key: "battle", title: "배틀", href: "/battle", icon: Swords },
    ],
  },
  {
    labelKey: "support",
    label: "지원",
    items: [{ key: "support", title: "문의하기", href: "/support", icon: LifeBuoy }],
  },
];

/** 그룹을 평면화한 전체 목록(헤더 타이틀 매칭 등에 사용). */
export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

/** 모바일 하단 바텀 네비 — 핵심 동선 5개만. */
export const bottomNavItems: NavItem[] = [
  { key: "home", title: "홈", href: "/dashboard", icon: LayoutDashboard },
  { key: "problems", title: "문제", href: "/problems", icon: Sparkles },
  { key: "studyBooks", title: "교재", href: "/study-books", icon: BookMarked },
  { key: "review", title: "오답노트", href: "/review", icon: NotebookPen },
  { key: "friends", title: "친구", href: "/social", icon: Users },
];
