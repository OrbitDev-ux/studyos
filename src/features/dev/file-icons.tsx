import {
  FileCode2,
  FileJson,
  FileText,
  FileType2,
  Folder,
  Braces,
  Palette,
  Container as ContainerIcon,
  GitBranch,
  Settings2,
  type LucideIcon,
} from "lucide-react";

/**
 * File-type icon mapping (§20/§23) — Material Icon Theme's per-extension
 * *look* (a distinct glanceable icon+color per file type), not its literal
 * SVG asset pack: bundling that theme's actual icon files would add a large
 * new asset dependency and its own licensing terms to track. lucide-react is
 * already the project's icon set (§20: "이미 동일한 icon package가 있다면
 * 재사용"), so this reuses it with per-extension color accents instead.
 */
type IconSpec = { icon: LucideIcon; className: string };

const BY_EXTENSION: Record<string, IconSpec> = {
  ts: { icon: FileCode2, className: "text-blue-500" },
  tsx: { icon: FileCode2, className: "text-blue-400" },
  js: { icon: FileCode2, className: "text-yellow-500" },
  jsx: { icon: FileCode2, className: "text-yellow-400" },
  json: { icon: FileJson, className: "text-amber-500" },
  py: { icon: FileCode2, className: "text-emerald-500" },
  css: { icon: Palette, className: "text-sky-500" },
  html: { icon: FileType2, className: "text-orange-500" },
  md: { icon: FileText, className: "text-muted-foreground" },
  yaml: { icon: Braces, className: "text-purple-500" },
  yml: { icon: Braces, className: "text-purple-500" },
  env: { icon: Settings2, className: "text-lime-500" },
};

const BY_FILENAME: Record<string, IconSpec> = {
  Dockerfile: { icon: ContainerIcon, className: "text-sky-600" },
  ".gitignore": { icon: GitBranch, className: "text-orange-600" },
  ".env": { icon: Settings2, className: "text-lime-500" },
};

const DEFAULT_FILE: IconSpec = { icon: FileText, className: "text-muted-foreground" };
export const FOLDER_ICON: IconSpec = { icon: Folder, className: "text-primary" };

export function iconForFile(name: string): IconSpec {
  if (BY_FILENAME[name]) return BY_FILENAME[name];
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  return BY_EXTENSION[ext] ?? DEFAULT_FILE;
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  py: "python",
  css: "css",
  html: "html",
  md: "markdown",
  yaml: "yaml",
  yml: "yaml",
};

export function languageForFile(name: string): string {
  if (name === "Dockerfile") return "dockerfile";
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  return LANGUAGE_BY_EXTENSION[ext] ?? "plaintext";
}
