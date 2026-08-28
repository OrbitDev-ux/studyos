import os from "node:os";
import { config } from "./config.js";
import { pairingStart, pairingPoll } from "./web-client.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type PairingResult = { deviceId: string; deviceSecret: string };

/**
 * §5 device-code pairing: this process has no StudyOS session of its own —
 * it only prints a short code and polls until a signed-in human, in their
 * browser, explicitly clicks Allow for THIS device (or denies it). Never
 * assumes success; a denial or expiry surfaces as a clear error, not a
 * silent hang.
 */
export async function runPairingFlow(log: (line: string) => void = console.log): Promise<PairingResult> {
  const hostname = os.hostname().replace(/\.local$/, "");
  const platform = process.platform as NodeJS.Platform;

  const start = await pairingStart(hostname, platform);

  log("");
  log("StudyOS Dev — Connect this computer");
  log("");
  log(`  1. Open: ${config.studyosUrl}/dev/pair?code=${start.userCode}`);
  log(`  2. Or go to ${config.studyosUrl}/dev/pair and enter code: ${start.userCode}`);
  log("");
  log(`Waiting for approval (expires in ${Math.round(start.expiresInSeconds / 60)} min)…`);

  const deadline = Date.now() + start.expiresInSeconds * 1000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const poll = await pairingPoll(start.pairingRequestId);
    if (poll.status === "APPROVED") {
      log("Paired.");
      return { deviceId: poll.deviceId, deviceSecret: poll.deviceSecret };
    }
    if (poll.status === "DENIED") {
      throw new Error("Pairing request was denied.");
    }
    if (poll.status === "EXPIRED") {
      throw new Error("Pairing code expired. Run `studyos-dev login` again.");
    }
  }
  throw new Error("Pairing timed out waiting for approval.");
}
