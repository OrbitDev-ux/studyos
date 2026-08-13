import {
  Bell,
  Bot,
  CreditCard,
  FileCode,
  FlaskConical,
  LifeBuoy,
  Scale,
  LayoutDashboard,
  ScrollText,
  Server,
  ShieldCheck,
  Users,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Capability } from "@/lib/admin/permissions";

export type AdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Minimum capability required to see the item; undefined = all admins. */
  capability?: Capability;
  /** Exact-match highlighting (dashboard root), otherwise prefix match. */
  exact?: boolean;
};

export const adminNavItems: AdminNavItem[] = [
  { title: "대시보드", href: "/admin", icon: LayoutDashboard, exact: true },
  { title: "사용자", href: "/admin/users", icon: Users },
  { title: "문의 관리", href: "/admin/support", icon: LifeBuoy, capability: "manageSupport" },
  { title: "실험실 관리", href: "/admin/lab", icon: FlaskConical, capability: "manageLab" },
  { title: "관리자", href: "/admin/admins", icon: UserCog, capability: "manageAdmins" },
  { title: "활동 로그", href: "/admin/logs", icon: ScrollText, capability: "viewLogs" },
  {
    title: "공지",
    href: "/admin/announcements",
    icon: Bell,
    capability: "manageAnnouncements",
  },
  { title: "AI", href: "/admin/ai", icon: Bot, capability: "manageAi" },
  {
    title: "AI 프롬프트",
    href: "/admin/prompts",
    icon: FileCode,
    capability: "managePrompts",
  },
  {
    title: "보안",
    href: "/admin/security",
    icon: ShieldCheck,
    capability: "manageSecurity",
  },
  { title: "시스템", href: "/admin/system", icon: Server, capability: "manageSystem" },
  // No capability → visible to all admins; the page is read-only (view versions).
  { title: "법적 문서", href: "/admin/legal", icon: Scale },
  // Self-only plan test override — every admin may test their own account.
  { title: "플랜 테스트", href: "/admin/entitlement", icon: CreditCard },
];
