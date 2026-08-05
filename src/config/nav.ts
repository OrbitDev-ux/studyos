import { BarChart3, BookOpen, LayoutDashboard, ListTodo } from "lucide-react";

export const navItems = [
  { title: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { title: "Todo", href: "/todos", icon: ListTodo },
  { title: "과목", href: "/subjects", icon: BookOpen },
  { title: "통계", href: "/stats", icon: BarChart3 },
] as const;
