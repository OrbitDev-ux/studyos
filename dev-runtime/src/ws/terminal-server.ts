import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { verifyCapabilityToken } from "../auth.js";
import { config } from "../config.js";
import { createSession, removeSession, PID_MARKER } from "../pty/session-manager.js";

type ClientMessage =
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number };

/**
 * Browser ⇄ WebSocket ⇄ PTY ⇄ bash (§13). WebSocket auth (§17): the upgrade
 * request must carry a valid, unexpired, workspace-scoped capability token —
 * StudyOS Web only mints one after `requireCurrentUser()` + a DB ownership
 * check, so a tampered/foreign workspaceId can never produce a valid token.
 */
export function attachTerminalServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (!req.url?.startsWith("/ws/terminal")) return;

    const url = new URL(req.url, "http://internal");
    const token = url.searchParams.get("token") ?? "";
    const payload = verifyCapabilityToken(token, config.capabilitySecret, "terminal");
    if (!payload) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, payload.sub, payload.wsid);
    });
  });

  wss.on("connection", (ws: WebSocket, userId: string, workspaceId: string) => {
    const session = createSession(userId, workspaceId);

    // ── Output throttling (§19) — a runaway `yes`/infinite loop must not
    // take the server or the browser down. Buffer pty output and flush at a
    // bounded rate; if the buffer grows past the hard cap faster than we can
    // drain it, kill the session outright instead of buffering unboundedly.
    let queue: Buffer[] = [];
    let queuedBytes = 0;
    let closed = false;

    const maxBytesPerTick = Math.ceil(config.terminalOutputRateBytesPerSec / 10); // 100ms ticks
    let slowClientTicks = 0;
    const flushTimer = setInterval(() => {
      if (ws.readyState !== ws.OPEN) return;
      // Backpressure guard: if the CLIENT isn't draining fast enough, ws's own
      // internal send buffer grows regardless of our queue above. Skip sending
      // (and eventually kill) rather than let that buffer grow unbounded.
      if (ws.bufferedAmount > config.terminalBufferHardCapBytes) {
        slowClientTicks += 1;
        if (slowClientTicks > 20) {
          // ~2s of a client that can't keep up at all.
          safeSend({ type: "error", message: "Client too slow — session terminated." });
          cleanup();
        }
        return;
      }
      slowClientTicks = 0;
      if (queue.length === 0) return;
      const chunk = Buffer.concat(queue);
      queue = [];
      queuedBytes = 0;
      const toSend = chunk.subarray(0, maxBytesPerTick); // drop excess rather than buffer forever
      ws.send(JSON.stringify({ type: "data", data: toSend.toString("utf8") }));
    }, 100);

    session.pty.onData((rawData) => {
      session.lastActiveAt = Date.now();
      const data = stripPidMarker(rawData);
      if (data.length === 0) return;
      const buf = Buffer.from(data, "utf8");
      queue.push(buf);
      queuedBytes += buf.length;
      if (queuedBytes > config.terminalBufferHardCapBytes) {
        safeSend({ type: "error", message: "Output limit exceeded — session terminated." });
        cleanup();
      }
    });

    // The very first chunk(s) of output start with our PID marker line
    // (session-manager.ts) — captured here and never shown to the user.
    // node-pty can (and in testing, does) deliver this split across MULTIPLE
    // onData calls, so the marker+digits+newline must be matched against an
    // accumulator, not a single chunk — matching on single chunks silently
    // lost the PID whenever the split landed mid-marker (verified live: this
    // is exactly what caused the process-group cleanup below to no-op).
    let markerBuffer = "";
    let markerResolved = false;
    const MARKER_SCAN_CAP = 200; // give up gracefully if it never appears
    function stripPidMarker(data: string): string {
      if (markerResolved) return data;
      markerBuffer += data;
      const match = new RegExp(`${PID_MARKER}(\\d+)\\r?\\n?`).exec(markerBuffer);
      if (match?.[1]) {
        session.containerPid = Number(match[1]);
        markerResolved = true;
        return markerBuffer.slice(0, match.index) + markerBuffer.slice(match.index + match[0].length);
      }
      if (markerBuffer.length > MARKER_SCAN_CAP) {
        // Marker never showed up (unexpected) — stop scanning and pass
        // buffered output through rather than holding it back forever.
        markerResolved = true;
        return markerBuffer;
      }
      return ""; // hold back until resolved, so partial marker text never leaks
    }

    session.pty.onExit(({ exitCode }) => {
      safeSend({ type: "exit", exitCode });
      cleanup();
    });

    ws.on("message", (raw) => {
      session.lastActiveAt = Date.now();
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === "input" && typeof msg.data === "string") {
        session.pty.write(msg.data);
      } else if (msg.type === "resize") {
        const cols = Math.max(1, Math.min(500, Math.floor(msg.cols)));
        const rows = Math.max(1, Math.min(200, Math.floor(msg.rows)));
        session.pty.resize(cols, rows);
      }
    });

    ws.on("close", cleanup);
    ws.on("error", cleanup);

    function safeSend(payload: unknown) {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
    }

    function cleanup() {
      if (closed) return;
      closed = true;
      clearInterval(flushTimer);
      void removeSession(session.id);
      try {
        ws.close();
      } catch {
        // Already closed — fine.
      }
    }
  });

  return wss;
}
