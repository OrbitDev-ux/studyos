#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { createCredentialStore } from "./credential-store.js";
import { readLocalConfig, setDeviceId } from "./local-config.js";
import { runPairingFlow } from "./pairing.js";
import { runAgent } from "./server.js";

const execFileAsync = promisify(execFile);
const PID_FILE = path.join(config.homeDir, "agent.pid");

function log(line: string): void {
  console.log(line);
}

async function readPid(): Promise<number | null> {
  try {
    const raw = await readFile(PID_FILE, "utf8");
    const pid = Number(raw.trim());
    return Number.isInteger(pid) ? pid : null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function cmdLogin(): Promise<void> {
  const store = createCredentialStore();
  const result = await runPairingFlow(log);
  await store.save(result.deviceSecret);
  await setDeviceId(result.deviceId);
  log(`Device id: ${result.deviceId}`);
  log(`Credential stored via: ${store.backend}${store.backend === "file" ? " (see `studyos-dev doctor` — Keychain is preferred where available)" : ""}`);
  log("");
  log("Next: run `studyos-dev connect`, then open StudyOS Dev in your browser.");
}

async function cmdConnect(): Promise<void> {
  const local = await readLocalConfig();
  if (!local.deviceId) {
    log("Not paired yet. Run `studyos-dev login` first.");
    process.exitCode = 1;
    return;
  }
  const store = createCredentialStore();
  const secret = await store.load();
  if (!secret) {
    log("No stored credential found for this device. Run `studyos-dev login` again.");
    process.exitCode = 1;
    return;
  }

  const existingPid = await readPid();
  if (existingPid && isProcessAlive(existingPid)) {
    log(`Already connected (pid ${existingPid}). Run \`studyos-dev disconnect\` first if you want to restart it.`);
    process.exitCode = 1;
    return;
  }

  await mkdir(config.homeDir, { recursive: true, mode: 0o700 });
  await writeFile(PID_FILE, String(process.pid), "utf8");

  const { stop } = await runAgent(async () => secret);
  log(`● Local Agent connected — listening on 127.0.0.1:${config.port}`);
  log(`  StudyOS: ${config.studyosUrl}/dev`);
  log("  Press Ctrl+C to disconnect.");

  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    log("\nDisconnecting…");
    await stop();
    await unlink(PID_FILE).catch(() => {});
    process.exit(0);
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function cmdStatus(): Promise<void> {
  const local = await readLocalConfig();
  const store = createCredentialStore();
  const secret = local.deviceId ? await store.load() : null;

  log(`Paired: ${local.deviceId ? "yes" : "no"}`);
  if (local.deviceId) log(`Device id: ${local.deviceId}`);
  log(`Credential: ${secret ? `present (${store.backend})` : "missing"}`);
  log(`Workspaces: ${local.workspaces.length === 0 ? "none" : ""}`);
  for (const w of local.workspaces) log(`  - ${w.name} (${w.path})`);

  const pid = await readPid();
  const running = !!pid && isProcessAlive(pid);
  log(`Agent process: ${running ? `running (pid ${pid})` : "not running"}`);

  if (running) {
    try {
      const res = await fetch(`http://127.0.0.1:${config.port}/health`);
      log(`Local server: ${res.ok ? "reachable" : `unexpected status ${res.status}`}`);
    } catch {
      log("Local server: not reachable (stale pid file? try `studyos-dev disconnect`)");
    }
  }
}

async function cmdDisconnect(): Promise<void> {
  const pid = await readPid();
  if (!pid || !isProcessAlive(pid)) {
    log("Not connected.");
    await unlink(PID_FILE).catch(() => {});
    return;
  }
  process.kill(pid, "SIGTERM");
  log(`Sent disconnect signal to pid ${pid}.`);
}

async function cmdDoctor(): Promise<void> {
  log(`Node: ${process.version}`);
  log(`Platform: ${process.platform}`);

  try {
    await import("node-pty");
    log("node-pty: OK");
  } catch (err) {
    log(`node-pty: FAILED — ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const { stdout } = await execFileAsync("git", ["--version"]);
    log(`git: ${stdout.trim()}`);
  } catch {
    log("git: not found on PATH (git status/diff/commit will fail)");
  }

  if (process.platform === "darwin") {
    try {
      await execFileAsync("security", ["-h"]);
      log("macOS Keychain (`security` CLI): OK");
    } catch {
      log("macOS Keychain (`security` CLI): not available — falling back to file credential storage");
    }
  }

  try {
    const res = await fetch(`${config.studyosUrl}/api/system/health`, { method: "GET" });
    log(`StudyOS reachable at ${config.studyosUrl}: ${res.ok ? "yes" : `HTTP ${res.status}`}`);
  } catch {
    log(`StudyOS reachable at ${config.studyosUrl}: no (check network / STUDYOS_URL)`);
  }

  const pid = await readPid();
  log(`Agent process: ${pid && isProcessAlive(pid) ? `running (pid ${pid})` : "not running"}`);
}

async function main(): Promise<void> {
  const [, , command] = process.argv;
  try {
    switch (command) {
      case "login":
        await cmdLogin();
        break;
      case "connect":
        await cmdConnect();
        break;
      case "status":
        await cmdStatus();
        break;
      case "disconnect":
        await cmdDisconnect();
        break;
      case "doctor":
        await cmdDoctor();
        break;
      default:
        log("Usage: studyos-dev <login|connect|status|disconnect|doctor>");
        process.exitCode = command ? 1 : 0;
    }
  } catch (err) {
    log(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}

void main();
