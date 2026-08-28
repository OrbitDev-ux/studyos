import { createServer, type Server } from "node:http";
import { config } from "./config.js";
import { Router, respondJson, respondError } from "./http/router.js";
import { applyCors, isAllowedOrigin } from "./http/cors.js";
import { SessionAuthenticator } from "./session-auth.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";
import { registerFsRoutes } from "./routes/fs.js";
import { registerGitRoutes } from "./routes/git.js";
import { registerProcessRoutes } from "./routes/processes.js";
import { attachTerminalServer } from "./ws/terminal-server.js";
import { startIdleReaper, disconnectAllSessions } from "./pty-session-manager.js";
import { stopAllProcesses } from "./process-manager.js";
import { heartbeat } from "./web-client.js";

/**
 * §3/§27/§28: this HTTP/WS server is bound to 127.0.0.1 ONLY — never
 * 0.0.0.0 — so it is unreachable from anywhere except this same machine.
 * StudyOS Web (Vercel) never talks to it directly; only the browser running
 * on this machine does, and only after a permission-checked session token
 * StudyOS Web minted. When this process exits, every terminal/process it
 * owns is torn down with it (§28: no hidden background shell survives).
 */
export function createAgentServer(getDeviceSecret: () => Promise<string | null>): {
  server: Server;
  auth: SessionAuthenticator;
} {
  const auth = new SessionAuthenticator(getDeviceSecret);
  const router = new Router();

  router.get("/health", (_req, res) => {
    respondJson(res, 200, { ok: true, version: "0.1.0" });
  });

  registerWorkspaceRoutes(router, auth);
  registerFsRoutes(router, auth);
  registerGitRoutes(router, auth);
  registerProcessRoutes(router, auth);

  const server = createServer((req, res) => {
    if (applyCors(req, res)) return;
    // /health is intentionally origin-unchecked (§25: the browser needs to
    // detect "agent not running" before it has any session to present) but
    // everything else requires an allow-listed origin AND a valid session.
    if (req.url !== "/health" && !isAllowedOrigin(req.headers.origin)) {
      respondError(res, 403, "PERMISSION_DENIED", "Origin not allowed.");
      return;
    }
    void router.handle(req, res).then((handled) => {
      if (!handled) respondError(res, 404, "NOT_FOUND", "No such route.");
    });
  });

  attachTerminalServer(server, auth);
  startIdleReaper();

  return { server, auth };
}

/** Binds and starts heartbeating. Resolves once listening. */
export async function runAgent(getDeviceSecret: () => Promise<string | null>): Promise<{
  server: Server;
  stop: () => Promise<void>;
}> {
  const { server } = createAgentServer(getDeviceSecret);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, "127.0.0.1", () => resolve());
  });

  const heartbeatTimer = setInterval(() => {
    void (async () => {
      const secret = await getDeviceSecret();
      if (!secret) return;
      try {
        await heartbeat(secret, config.port);
      } catch {
        // Transient network issue — the next tick tries again. StudyOS Web's
        // own lastSeenAt staleness is what shows "disconnected" in the UI;
        // this agent doesn't need to track that itself (§27 offline safety —
        // it keeps serving the browser on this machine regardless).
      }
    })();
  }, config.heartbeatIntervalMs);
  heartbeatTimer.unref();
  // Fire one immediately rather than waiting a full interval.
  void (async () => {
    const secret = await getDeviceSecret();
    if (secret) await heartbeat(secret, config.port).catch(() => {});
  })();

  const stop = async () => {
    clearInterval(heartbeatTimer);
    disconnectAllSessions();
    stopAllProcesses();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };

  return { server, stop };
}
