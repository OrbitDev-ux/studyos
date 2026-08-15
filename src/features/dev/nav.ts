import {
  Code2,
  Eye,
  FolderTree,
  GitBranch,
  LayoutDashboard,
  Play,
  Settings,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { Messages } from "@/features/i18n/messages";

export type DevNavItem = {
  /** i18n key into messages.dev. */
  key: keyof Messages["dev"];
  href: string;
  icon: LucideIcon;
};

/** DEV group — mirrors the DEV/SYSTEM split in the Dev sidebar mockup (§5). */
export const devNavItems: DevNavItem[] = [
  { key: "navHome", href: "/dev", icon: LayoutDashboard },
  { key: "navIde", href: "/dev/ide", icon: Code2 },
  { key: "navTerminal", href: "/dev/terminal", icon: Terminal },
  { key: "navFiles", href: "/dev/files", icon: FolderTree },
  { key: "navRun", href: "/dev/run", icon: Play },
  { key: "navPreview", href: "/dev/preview", icon: Eye },
  { key: "navGit", href: "/dev/git", icon: GitBranch },
];

export const devSystemNavItems: DevNavItem[] = [
  { key: "navSettings", href: "/dev/settings", icon: Settings },
];

export const allDevNavItems: DevNavItem[] = [...devNavItems, ...devSystemNavItems];
