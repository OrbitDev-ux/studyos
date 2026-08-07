import { prisma } from "@/lib/prisma";

// Typed façade over the SystemSetting key/value table. Values are JSON-encoded
// so booleans/strings/numbers round-trip through the same TEXT column. Each
// key has a default used when the row is absent, so a fresh DB behaves sanely
// before any admin has touched settings.
//
// Maintenance state lives in its own table (lib/maintenance.ts) because the
// Edge middleware must read it — it is not a SystemSetting.
export const SETTING_KEYS = {
  AI_ENABLED: "ai_enabled",
  AI_MODEL: "ai_model",
  // Epoch (ms) before which admin session tokens are rejected. Bumping it to
  // "now" invalidates every issued admin cookie — the "clear sessions" lever.
  ADMIN_SESSION_EPOCH: "admin_session_epoch",
} as const;

const DEFAULTS = {
  [SETTING_KEYS.AI_ENABLED]: true,
  [SETTING_KEYS.AI_MODEL]: "gemini-3.6-flash",
  [SETTING_KEYS.ADMIN_SESSION_EPOCH]: 0,
} as const;

type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export async function getSetting<T>(key: SettingKey): Promise<T> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row) return DEFAULTS[key] as T;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return DEFAULTS[key] as T;
  }
}

export async function setSetting(
  key: SettingKey,
  value: unknown,
  updatedById?: string | null,
): Promise<void> {
  const encoded = JSON.stringify(value);
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: encoded, updatedById: updatedById ?? null },
    update: { value: encoded, updatedById: updatedById ?? null },
  });
}

/** Read every known setting in one round trip, with defaults filled in. */
export async function getAllSettings(): Promise<{
  aiEnabled: boolean;
  aiModel: string;
}> {
  const rows = await prisma.systemSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value] as const));

  const read = <T>(key: SettingKey): T => {
    const raw = map.get(key);
    if (raw === undefined) return DEFAULTS[key] as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return DEFAULTS[key] as T;
    }
  };

  return {
    aiEnabled: read<boolean>(SETTING_KEYS.AI_ENABLED),
    aiModel: read<string>(SETTING_KEYS.AI_MODEL),
  };
}
