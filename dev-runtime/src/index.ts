import http from "node:http";
import { config, assertConfigured } from "./config.js";
import { Router, respondJson } from "./http/router.js";
import { registerContainerRoutes } from "./routes/containers.js";
import { registerFsRoutes } from "./routes/fs.js";
import { registerProcessRoutes } from "./routes/process.js";
import { registerGitRoutes } from "./routes/git.js";
import { attachTerminalServer } from "./ws/terminal-server.js";
import { handlePreviewHttp, handlePreviewUpgrade } from "./preview/proxy.js";

assertConfigured();

const router = new Router();
router.get("/healthz", (_req, res) => respondJson(res, 200, { ok: true }));
registerContainerRoutes(router);
registerFsRoutes(router);
registerProcessRoutes(router);
registerGitRoutes(router);

const server = http.createServer((req, res) => {
  void (async () => {
    // Preview is handled outside the JSON router (raw byte streaming).
    if (req.url?.startsWith("/preview/")) {
      const handled = await handlePreviewHttp(req, res);
      if (handled) return;
    }
    const handled = await router.handle(req, res);
    if (!handled) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "not_found", message: "No such route." } }));
    }
  })();
});

// Terminal WebSocket (§13/§17).
attachTerminalServer(server);

// Preview WebSocket relay (HMR) — separate from the terminal's /ws/terminal
// upgrade handler; both listen on the same 'upgrade' event and no-op if the
// path doesn't match theirs.
server.on("upgrade", (req, socket, head) => {
  if (!req.url?.startsWith("/preview/")) return;
  void handlePreviewUpgrade(req, socket, head);
});

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[dev-runtime] listening on :${config.port}`);
});
