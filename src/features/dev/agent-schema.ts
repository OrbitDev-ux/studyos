import { z } from "zod";
import { DEV_PERMISSIONS } from "@/features/dev/agent-config";

/** Matches agent-crypto's CODE_ALPHABET after normalization — 8 chars, no
 * ambiguous glyphs, optional grouping dash accepted from user typing. */
export const pairingCodeSchema = z
  .string()
  .trim()
  .min(6)
  .max(12)
  .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
  .refine((v) => /^[A-Z0-9]{8}$/.test(v), "코드 형식이 올바르지 않습니다.");

export const deviceNameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력해주세요")
  .max(60, "이름이 너무 길어요");

export const platformSchema = z.enum(["darwin", "linux", "win32"]).nullable().optional();

/** Body the agent sends to POST /api/dev/pairing/start (no auth — this is the
 * one endpoint an unpaired agent can call). */
export const pairingStartSchema = z.object({
  deviceName: deviceNameSchema.optional(),
  platform: platformSchema,
});

export const pairingPollSchema = z.object({
  pairingRequestId: z.string().min(1),
});

export const permissionSchema = z.enum(DEV_PERMISSIONS);

/** Body the agent sends to POST /api/dev/agent/heartbeat (device-authenticated). */
export const agentHeartbeatSchema = z.object({
  localPort: z.number().int().min(1).max(65535),
});

/** Body the agent sends to POST /api/dev/agent/verify-session (device-authenticated). */
export const agentVerifySessionSchema = z.object({
  sessionToken: z.string().min(1),
});
