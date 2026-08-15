"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { accessStateFor } from "@/features/billing/access";
import { canUseFeature } from "@/features/billing/entitlements";
import { containerManager } from "@/features/dev/container-manager";
import { DEFAULT_WORKSPACE_NAME } from "@/features/dev/config";
import {
  createWorkspaceSchema,
  devSettingsSchema,
  parseDevSettings,
  workspaceNameSchema,
  type CreateWorkspaceValues,
  type DevSettingsInput,
} from "@/features/dev/schema";

/** Machine-readable codes the client maps to localized text (messages.dev) —
 * mirrors the {error?, code?} shape used by tutor/planner actions elsewhere. */
export type DevActionError = {
  error?: string;
  code?: "ENTITLEMENT_BLOCKED" | "BACKEND_UNAVAILABLE" | "NOT_FOUND";
};

async function requireDevEntitlement(
  user: Awaited<ReturnType<typeof requireCurrentUser>>,
): Promise<DevActionError | null> {
  if (!canUseFeature(accessStateFor(user), "DEV_WORKSPACE")) {
    return { error: "Study OS Dev is not available on your current plan.", code: "ENTITLEMENT_BLOCKED" };
  }
  return null;
}

/** Create (or return, if it already exists) the user's one workspace. Real DB
 * write — persists across reloads (§36). Does NOT provision a container (v1
 * has no backend); status stays NOT_PROVISIONED. */
export async function createMyWorkspace(
  values: CreateWorkspaceValues,
): Promise<{ workspaceId?: string } & DevActionError> {
  const user = await requireCurrentUser();
  const blocked = await requireDevEntitlement(user);
  if (blocked) return blocked;

  const parsed = createWorkspaceSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." };
  }

  const workspace = await prisma.devWorkspace.upsert({
    where: { userId: user.id },
    create: { userId: user.id, name: parsed.data.name?.trim() || DEFAULT_WORKSPACE_NAME },
    update: {},
  });
  revalidatePath("/dev");
  return { workspaceId: workspace.id };
}

export async function renameMyWorkspace(name: string): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const parsed = workspaceNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "이름이 올바르지 않습니다." };
  }
  // Ownership: scoped by the userId UNIQUE key itself (see queries.ts note).
  const result = await prisma.devWorkspace.updateMany({
    where: { userId: user.id },
    data: { name: parsed.data },
  });
  if (result.count === 0) return { error: "Workspace를 찾을 수 없습니다.", code: "NOT_FOUND" };
  revalidatePath("/dev");
  return {};
}

/** Real deletion — the DB record is genuinely removed. Best-effort tears down
 * any backend container too (currently always a no-op/unavailable). */
export async function destroyMyWorkspace(): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await prisma.devWorkspace.findUnique({ where: { userId: user.id } });
  if (!workspace) return { error: "Workspace를 찾을 수 없습니다.", code: "NOT_FOUND" };

  await containerManager.destroy(workspace.id);
  await prisma.devWorkspace.delete({ where: { userId: user.id } });
  revalidatePath("/dev");
  return {};
}

/**
 * Start (provision) the workspace's container. Honest: with v1's
 * UnavailableContainerManager this always returns BACKEND_UNAVAILABLE and
 * leaves `status` at NOT_PROVISIONED — it never marks a workspace RUNNING
 * unless a real backend actually reported that.
 */
export async function startMyWorkspace(): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const blocked = await requireDevEntitlement(user);
  if (blocked) return blocked;

  const workspace = await prisma.devWorkspace.findUnique({ where: { userId: user.id } });
  if (!workspace) return { error: "Workspace를 찾을 수 없습니다.", code: "NOT_FOUND" };

  const result = await containerManager.ensureContainer(workspace.id, user.id);
  if (!result.ok) {
    return { error: result.message, code: "BACKEND_UNAVAILABLE" };
  }
  await prisma.devWorkspace.update({
    where: { userId: user.id },
    data: { status: result.status, containerId: result.containerId, lastActiveAt: new Date() },
  });
  revalidatePath("/dev");
  return {};
}

export async function stopMyWorkspace(): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const workspace = await prisma.devWorkspace.findUnique({ where: { userId: user.id } });
  if (!workspace) return { error: "Workspace를 찾을 수 없습니다.", code: "NOT_FOUND" };

  const result = await containerManager.stop(workspace.id);
  if (!result.ok) return { error: result.message, code: "BACKEND_UNAVAILABLE" };
  await prisma.devWorkspace.update({ where: { userId: user.id }, data: { status: result.status } });
  revalidatePath("/dev");
  return {};
}

export async function restartMyWorkspace(): Promise<DevActionError> {
  const user = await requireCurrentUser();
  const blocked = await requireDevEntitlement(user);
  if (blocked) return blocked;

  const workspace = await prisma.devWorkspace.findUnique({ where: { userId: user.id } });
  if (!workspace) return { error: "Workspace를 찾을 수 없습니다.", code: "NOT_FOUND" };

  const result = await containerManager.restart(workspace.id);
  if (!result.ok) return { error: result.message, code: "BACKEND_UNAVAILABLE" };
  await prisma.devWorkspace.update({
    where: { userId: user.id },
    data: { status: result.status, lastActiveAt: new Date() },
  });
  revalidatePath("/dev");
  return {};
}

/** Persist Dev Settings. `devSettingsSchema` is `.strict()` — any key outside
 * the whitelist fails validation before it ever reaches the DB (§31). */
export async function updateMyDevSettings(
  values: DevSettingsInput,
): Promise<DevActionError> {
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
