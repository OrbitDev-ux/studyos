"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DEFAULT_WORKSPACE_NAME } from "@/features/dev/config";
import { devSettingsSchema, parseDevSettings, type DevSettingsInput } from "@/features/dev/schema";

/** Machine-readable codes the client maps to localized text (messages.dev) —
 * mirrors the {error?, code?} shape used by tutor/planner actions elsewhere. */
export type DevActionError = {
  error?: string;
  code?: "ENTITLEMENT_BLOCKED" | "BACKEND_UNAVAILABLE" | "NOT_FOUND";
};

/** Persist Dev Settings (editor/terminal preferences — unrelated to the
 * DevAgentDevice pairing/permission system in agent-actions.ts). `.strict()`
 * on devSettingsSchema means any key outside the whitelist fails validation
 * before it ever reaches the DB (§31). Still lives on the legacy DevWorkspace
 * row: these are pure UI preferences, not container state, so nothing about
 * moving to the Local Agent architecture changes how they're stored. */
export async function updateMyDevSettings(values: DevSettingsInput): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const parsed = devSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "설정값이 올바르지 않습니다." };
  }

  const existing = await prisma.devWorkspace.findUnique({
    where: { userId: user.id },
    select: { settings: true },
  });
  const merged = { ...parseDevSettings(existing?.settings), ...parsed.data };

  await prisma.devWorkspace.upsert({
    where: { userId: user.id },
    create: { userId: user.id, name: DEFAULT_WORKSPACE_NAME, settings: merged },
    update: { settings: merged },
  });
  revalidatePath("/dev/settings");
  return {};
}
