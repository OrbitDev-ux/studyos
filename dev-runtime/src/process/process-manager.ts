import { Writable } from "node:stream";
import { docker } from "../docker/container-manager.js";
import { containerNameFor } from "../docker/naming.js";
import { execCapture } from "../docker/exec.js";
import { config } from "../config.js";

export type ProcessStatus = "RUNNING" | "STOPPED" | "FAILED";

export type ProcessRecord = {
  id: string;
  workspaceId: string;
  command: string;
  status: ProcessStatus;
  startedAt: number;
  finishedAt: number | null;
  containerPid: number | null; // PID inside the container's own namespace
  logBytes: number;
};

type InternalRecord = ProcessRecord & { log: string[] };

const MAX_LOG_BYTES = 500_000;
const PID_MARKER = "__STUDYOS_PID__:";

const processes = new Map<string, InternalRecord>();

/** Very small whitespace/quote tokenizer — sufficient for v1's target
 * commands (`npm run dev`, `python3 main.py`, …). Documented limitation: no
 * complex shell quoting/escaping support. Tokens are ALWAYS passed to Docker
 * as discrete argv elements (never re-interpolated into shell text), so this
 * is a UX limitation, not a security one — see writeFile/exec's docs. */
function tokenize(command: string): string[] {
  const matches = command.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  return matches.map((tok) => (tok.startsWith('"') && tok.endsWith('"') ? tok.slice(1, -1) : tok));
}

export function listProcesses(workspaceId: string): ProcessRecord[] {
  return [...processes.values()]
    .filter((p) => p.workspaceId === workspaceId)
    .map(({ log: _log, ...rest }) => rest)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function getLogs(id: string): string | null {
  const record = processes.get(id);
  return record ? record.log.join("") : null;
}

export async function startProcess(workspaceId: string, command: string): Promise<ProcessRecord> {
  const tokens = tokenize(command);
  if (tokens.length === 0) throw new Error("empty_command");

  const id = `${workspaceId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const record: InternalRecord = {
    id,
    workspaceId,
    command,
    status: "RUNNING",
    startedAt: Date.now(),
    finishedAt: null,
    containerPid: null,
    logBytes: 0,
    log: [],
  };
  processes.set(id, record);

  const container = docker.getContainer(containerNameFor(workspaceId));
  const exec = await container.exec({
    // Print our own marker with the real container-namespace PID (persists
    // across `exec` replacing the shell image), then hand off to the command.
    Cmd: ["sh", "-c", `echo "${PID_MARKER}$$"; exec "$@"`, "--", ...tokens],
    AttachStdout: true,
    AttachStderr: true,
    WorkingDir: "/workspace",
  });
  const stream = await exec.start({ hijack: true, stdin: false });

  const append = (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    const marker = text.indexOf(PID_MARKER);
    if (marker !== -1 && record.containerPid === null) {
      const rest = text.slice(marker + PID_MARKER.length);
      const pid = Number(rest.split(/\s/)[0]);
      if (Number.isFinite(pid)) record.containerPid = pid;
      const withoutMarkerLine = text.slice(0, marker) + rest.replace(/^\d+\r?\n?/, "");
      pushLog(record, withoutMarkerLine);
      return;
    }
    pushLog(record, text);
  };
  const sink = new Writable({
    write(chunk, _enc, cb) {
      append(chunk);
      cb();
    },
  });
  docker.modem.demuxStream(stream, sink, sink);

  stream.on("end", async () => {
    try {
      const info = await exec.inspect();
      record.status = info.ExitCode === 0 ? "STOPPED" : "FAILED";
    } catch {
      record.status = "FAILED";
    }
    record.finishedAt = Date.now();
  });

  // Hard timeout (§9/§21) — a forgotten `npm run dev` or runaway build can't
  // run forever.
  setTimeout(() => {
    if (record.status === "RUNNING") void stopProcess(id).catch(() => {});
  }, config.processTimeoutSeconds * 1000).unref();

  return { ...record };
}

export async function stopProcess(id: string): Promise<boolean> {
  const record = processes.get(id);
  if (!record || record.status !== "RUNNING") return false;
  if (record.containerPid !== null) {
    await execCapture(docker, containerNameFor(record.workspaceId), [
      "kill",
      "-TERM",
      String(record.containerPid),
    ]).catch(() => {});
  }
  record.status = "STOPPED";
  record.finishedAt = Date.now();
  return true;
}

function pushLog(record: InternalRecord, text: string): void {
  if (!text) return;
  record.log.push(text);
  record.logBytes += Buffer.byteLength(text, "utf8");
  // Rolling cap (§19) — never let one chatty process grow memory unbounded.
  while (record.logBytes > MAX_LOG_BYTES && record.log.length > 1) {
    const dropped = record.log.shift();
    if (dropped) record.logBytes -= Buffer.byteLength(dropped, "utf8");
  }
}
