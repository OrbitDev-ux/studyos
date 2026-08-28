import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { config } from "../config.js";
import { isAllowedOrigin } from "../http/cors.js";
import type { SessionAuthenticator } from "../session-auth.js";
import { getWorkspace } from "../local-config.js";
import { createSession, removeSession, TerminalLimitError, type TerminalSession } from "../pty-session-manager.js";
import { recordAuditEvent } from "../audit-log.js";

type ClientMessage = { type: "input"; data: string } | { type: "resize"; cols: number; rows: number };

/**
 * Browser ⇄ WebSocket ⇄ PTY ⇄ the user's own shell (§13). Auth (§14): the
 * upgrade request must (a) come from an allow-listed StudyOS origin and (b)
 * carry a session token that verifies with scope dev.terminal.execute — a
 * scope StudyOS Web only ever hands out if the user has explicitly granted
 * dev.terminal.execute to this device (§21 default-deny).
 */
export function attachTerminalServer(server: Server, auth: SessionAuthenticator): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (!req.url?.startsWith("/ws/terminal/")) return;

    if (!isAllowedOrigin(req.headers.origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    const url = new URL(req.url, "http://internal");
    const workspaceId = url.pathname.replace("/ws/terminal/", "");
    const sessionToken = url.searchParams.get("session") ?? undefined;

    void (async () => {
      const verified = await auth.requireScope(sessionToken, "dev.terminal.execute");
      if (!verified) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      const workspace = await getWorkspace(workspaceId);
      if (!workspace) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, workspace.id, workspace.path, workspace.name);
      });
    })();
  });

  wss.on("connection", (ws: WebSocket, workspaceId: string, workspacePath: string, workspaceName: string) => {
    let session: TerminalSession;
    try {
      session = createSession(workspaceId, workspacePath);
    } catch (err) {
      if (err instanceof TerminalLimitError) {
        ws.send(JSON.stringify({ type: "error", message: "Too many terminal sessions are open." }));
      }
      ws.close();
      return;
    }
    void recordAuditEvent({ tool: "terminal", action: "open", workspace: workspaceName, success: true });

    let queue: Buffer[] = [];
    let queuedBytes = 0;
    let closed = false;

    const maxBytesPerTick = Math.ceil(config.terminalOutputRateBytesPerSec / 10);
    let slowClientTicks = 0;
    const flushTimer = setInterval(() => {
      if (ws.readyState !== ws.OPEN) return;
      if (ws.bufferedAmount > config.terminalBufferHardCapBytes) {
        slowClientTicks += 1;
        if (slowClientTicks > 20) {
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
      const toSend = chunk.subarray(0, maxBytesPerTick);
      ws.send(JSON.stringify({ type: "data", data: toSend.toString("utf8") }));
    }, 100);

    session.pty.onData((data) => {
      session.lastActiveAt = Date.now();
      const buf = Buffer.from(data, "utf8");
      queue.push(buf);
      queuedBytes += buf.length;
      if (queuedBytes > config.terminalBufferHardCapBytes) {
        safeSend({ type: "error", message: "Output limit exceeded — session terminated." });
        cleanup();
      }
    });

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
      removeSession(session.id);
      void recordAuditEvent({ tool: "terminal", action: "close", workspace: workspaceName, success: true });
      try {
        ws.close();
      } catch {
        // Already closed.
      }
    }
  });

  return wss;
}
