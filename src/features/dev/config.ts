/**
 * Study OS Dev — config-driven constants (no hardcoding elsewhere). A new
 * lifecycle state, shell, or theme option is a one-line change here.
 */

/** DevWorkspace.status values. Free-form string in the DB (see schema.prisma
 * comment) so new states never need a migration; this is the whitelist the
 * app itself treats as valid. */
export const WORKSPACE_STATUSES = [
  "NOT_PROVISIONED",
  "CREATING",
  "READY",
  "RUNNING",
  "IDLE",
  "STOPPED",
  "ERROR",
] as const;
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];

export const DEFAULT_WORKSPACE_NAME = "my-project";

/** Dev Settings whitelist — the ONLY values a user may ever persist. Nothing
 * here reaches a container config; it's UI/session preference only (§31). */
export const TERMINAL_THEMES = ["dark", "light"] as const;
export const EDITOR_THEMES = ["dark", "light"] as const;
/** Shells offered once a real backend exists — whitelisted, never user-typed. */
export const SHELLS = ["bash", "sh"] as const;

export const TERMINAL_FONT_SIZE_MIN = 10;
export const TERMINAL_FONT_SIZE_MAX = 22;
export const TERMINAL_FONT_SIZE_DEFAULT = 14;

export const IDLE_TIMEOUT_MINUTES_MIN = 5;
export const IDLE_TIMEOUT_MINUTES_MAX = 120;
export const IDLE_TIMEOUT_MINUTES_DEFAULT = 30;

export type DevSettings = {
  terminalFontSize: number;
  terminalTheme: (typeof TERMINAL_THEMES)[number];
  shell: (typeof SHELLS)[number];
  autoStart: boolean;
  idleTimeoutMinutes: number;
  editorTheme: (typeof EDITOR_THEMES)[number];
  wordWrap: boolean;
  minimap: boolean;
};

export const DEFAULT_DEV_SETTINGS: DevSettings = {
  terminalFontSize: TERMINAL_FONT_SIZE_DEFAULT,
  terminalTheme: "dark",
  shell: "bash",
  autoStart: false,
  idleTimeoutMinutes: IDLE_TIMEOUT_MINUTES_DEFAULT,
  editorTheme: "dark",
  wordWrap: true,
  minimap: false,
};
