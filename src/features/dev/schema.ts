import { z } from "zod";
import {
  DEFAULT_DEV_SETTINGS,
  EDITOR_THEMES,
  IDLE_TIMEOUT_MINUTES_MAX,
  IDLE_TIMEOUT_MINUTES_MIN,
  SHELLS,
  TERMINAL_FONT_SIZE_MAX,
  TERMINAL_FONT_SIZE_MIN,
  TERMINAL_THEMES,
  type DevSettings,
} from "@/features/dev/config";

/** Safe charset for a workspace/project name — no path separators or shell
 * metacharacters, so it can never be misused as a filesystem/shell token. */
export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력해주세요")
  .max(50, "이름이 너무 길어요")
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9 ._-]*$/, "영문/숫자로 시작하고 특수문자는 . _ - 만 사용해주세요");

export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema.optional(),
});
export type CreateWorkspaceValues = z.infer<typeof createWorkspaceSchema>;

/**
 * Dev Settings whitelist (§31). `.strict()` rejects any key outside this
 * shape — a client can never smuggle arbitrary container configuration
 * through this action, only these named, bounded preferences.
 */
export const devSettingsSchema = z
  .object({
    terminalFontSize: z.number().int().min(TERMINAL_FONT_SIZE_MIN).max(TERMINAL_FONT_SIZE_MAX),
    terminalTheme: z.enum(TERMINAL_THEMES),
    shell: z.enum(SHELLS),
    autoStart: z.boolean(),
    idleTimeoutMinutes: z.number().int().min(IDLE_TIMEOUT_MINUTES_MIN).max(IDLE_TIMEOUT_MINUTES_MAX),
    editorTheme: z.enum(EDITOR_THEMES),
    wordWrap: z.boolean(),
    minimap: z.boolean(),
  })
  .partial()
  .strict();
export type DevSettingsInput = z.infer<typeof devSettingsSchema>;

/** Parses stored/incoming settings JSON against the whitelist, filling any
 * missing/invalid keys with defaults — never trusts stored JSON shape blindly.
 * Pure (no DB/IO) so it's directly unit-testable independent of Prisma. */
export function parseDevSettings(raw: unknown): DevSettings {
  const parsed = devSettingsSchema.safeParse(raw);
  return { ...DEFAULT_DEV_SETTINGS, ...(parsed.success ? parsed.data : {}) };
}
