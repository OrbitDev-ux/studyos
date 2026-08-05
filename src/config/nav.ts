import {
  BarChart3,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

export const navItems = [
  { title: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { title: "Todo", href: "/todos", icon: ListTodo },
  { title: "과목", href: "/subjects", icon: BookOpen },
  { title: "통계", href: "/stats", icon: BarChart3 },
  { title: "문제", href: "/problems", icon: Sparkles },
  { title: "오답노트", href: "/review", icon: NotebookPen },
  { title: "모의고사", href: "/mock-exam", icon: ClipboardList },
  { title: "친구", href: "/social", icon: Users },
  { title: "랭킹", href: "/ranking", icon: Trophy },
  { title: "배틀", href: "/battle", icon: Swords },
] as const;
