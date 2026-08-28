/** StudyOS Dev — Local Agent config-driven constants (no hardcoding elsewhere,
 * same convention as features/dev/config.ts). */

export const PAIRING_CODE_TTL_MS = 5 * 60 * 1000; // §5: short-lived
export const PAIRING_MAX_ATTEMPTS = 8; // brute-force guard on code guesses
export const PAIRING_POLL_MIN_INTERVAL_MS = 1000;

/** How long an approved device secret may sit undelivered before the pairing
 * row is treated as expired (agent polling stopped, browser tab closed, …). */
export const PAIRING_SECRET_DELIVERY_WINDOW_MS = 5 * 60 * 1000;

/** Rate limits on starting new pairing requests (defense against enumeration/
 * exhaustion), counted the same way features/auth/reset-actions.ts does. */
export const PAIRING_START_RATE_WINDOW_MS = 15 * 60 * 1000;
export const PAIRING_START_MAX_PER_IP = 20;

/** One browser→agent connect token — short-lived and single-use (§17). */
export const AGENT_SESSION_TTL_MS = 60 * 1000;

/** A device not heard from within this window shows as disconnected in the UI. */
export const AGENT_ONLINE_WINDOW_MS = 45 * 1000;

/** The exact permission set from §21. Read scopes are always-allow once a
 * device is paired (never need a DevAgentPermissionGrant row); the rest
 * default-deny until the user explicitly grants them in /dev/settings. */
export const DEV_PERMISSIONS = [
  "dev.workspace.read",
  "dev.workspace.write",
  "dev.terminal.execute",
  "dev.git.read",
  "dev.git.write",
  "dev.preview.start",
] as const;
export type DevPermission = (typeof DEV_PERMISSIONS)[number];

export const DEV_READ_PERMISSIONS: readonly DevPermission[] = ["dev.workspace.read", "dev.git.read"];
export const DEV_GRANTABLE_PERMISSIONS: readonly DevPermission[] = [
  "dev.workspace.write",
  "dev.terminal.execute",
  "dev.git.write",
  "dev.preview.start",
];

export function isDevPermission(value: string): value is DevPermission {
  return (DEV_PERMISSIONS as readonly string[]).includes(value);
}

export function isReadPermission(permission: DevPermission): boolean {
  return (DEV_READ_PERMISSIONS as readonly string[]).includes(permission);
}
