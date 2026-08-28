import { config } from "./config.js";

/** Every call to StudyOS Web the agent makes (§27: only ever outbound, only
 * ever when the agent decides to — StudyOS never reaches into this machine). */

async function postJson<T>(pathName: string, body: unknown, authSecret?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authSecret) headers.Authorization = `Bearer ${authSecret}`;
  const res = await fetch(`${config.studyosUrl}${pathName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { code?: string; message?: string } };
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `StudyOS Web request failed (${res.status})`);
  }
  return json;
}

export type PairingStartResult = { pairingRequestId: string; userCode: string; expiresInSeconds: number };

export function pairingStart(deviceName: string, platform: NodeJS.Platform): Promise<PairingStartResult> {
  return postJson<PairingStartResult>("/api/dev/pairing/start", { deviceName, platform });
}

export type PairingPollResult =
  | { status: "PENDING" }
  | { status: "APPROVED"; deviceId: string; deviceSecret: string }
  | { status: "DENIED" | "EXPIRED" };

export function pairingPoll(pairingRequestId: string): Promise<PairingPollResult> {
  return postJson<PairingPollResult>("/api/dev/pairing/poll", { pairingRequestId });
}

export type HeartbeatResult = { ok: true; permissions: Record<string, boolean> };

export function heartbeat(deviceSecret: string, localPort: number): Promise<HeartbeatResult> {
  return postJson<HeartbeatResult>("/api/dev/agent/heartbeat", { localPort }, deviceSecret);
}

export type VerifySessionResult =
  | { ok: true; userId: string; scope: string }
  | { ok: false; error?: { code?: string; message?: string } };

export async function verifySession(deviceSecret: string, sessionToken: string): Promise<VerifySessionResult> {
  try {
    return await postJson<VerifySessionResult>("/api/dev/agent/verify-session", { sessionToken }, deviceSecret);
  } catch (err) {
    return { ok: false, error: { message: err instanceof Error ? err.message : "verify-session failed" } };
  }
}
