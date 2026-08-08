import {
  BarChart3,
  Bot,
  Brain,
  ClipboardList,
  LayoutDashboard,
  NotebookPen,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";

/** Demo navigation — every href is a public /demo/* route (no auth redirect). */
export const demoNavItems = [
  { title: "대시보드", href: "/demo", icon: LayoutDashboard, exact: true },
  { title: "문제 풀기", href: "/demo/problems", icon: Sparkles, exact: false },
  { title: "오답노트", href: "/demo/review", icon: NotebookPen, exact: false },
  { title: "오늘의 미션", href: "/demo/missions", icon: Target, exact: false },
  { title: "약점 문제", href: "/demo/weakness", icon: Brain, exact: false },
  { title: "AI 튜터", href: "/demo/tutor", icon: Bot, exact: false },
  { title: "모의고사", href: "/demo/exams", icon: ClipboardList, exact: false },
  { title: "통계", href: "/demo/analytics", icon: BarChart3, exact: false },
  { title: "프로필", href: "/demo/profile", icon: UserRound, exact: false },
] as const;
