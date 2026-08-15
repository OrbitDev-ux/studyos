import http, { type IncomingMessage, type ServerResponse } from "node:http";
import net from "node:net";
import type { Duplex } from "node:stream";
import { docker } from "../docker/container-manager.js";
import { containerNameFor } from "../docker/naming.js";
import { verifyCapabilityToken } from "../auth.js";
import { config } from "../config.js";

/** `/preview/:workspaceId/:port/...rest` — matched manually (not via the JSON
 * router) since this needs raw byte streaming, not a JSON response. */
const PREVIEW_PATH = /^\/preview\/([^/]+)\/(\d+)(\/.*)?$/;

async function getContainerIp(workspaceId: string): Promise<string | null> {
  try {
    const info = await docker.getContainer(containerNameFor(workspaceId)).inspect();
    if (!info.State.Running) return null;
    const networks = info.NetworkSettings.Networks;
    const first = Object.values(networks)[0];
    return first?.IPAddress || info.NetworkSettings.IPAddress || null;
  } catch {
    return null;
  }
}

function checkToken(url: URL, workspaceId: string): boolean {
  const token = url.searchParams.get("token") ?? "";
  const payload = verifyCapabilityToken(token, config.capabilitySecret, "preview");
  return !!payload && payload.wsid === workspaceId;
}

/**
 * Reverse-proxies an authenticated HTTP request into the container's dev
 * server (§25/§26). Never exposes a host port for the container directly —
 * this proxy, over the internal Docker network, is the only path in.
 */
export async function handlePreviewHttp(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? "", "http://internal");
  const match = PREVIEW_PATH.exec(url.pathname);
  if (!match) return false;

  const [, workspaceId, portStr, rest] = match;
  if (!workspaceId || !portStr) {
    res.writeHead(400).end("Bad preview URL");
    return true;
  }
  if (!checkToken(url, workspaceId)) {
    res.writeHead(401).end("Unauthorized");
    return true;
  }

  const ip = await getContainerIp(workspaceId);
  if (!ip) {
    res.writeHead(502).end("Workspace container is not running.");
    return true;
  }

  const upstream = http.request(
    {
      host: ip,
      port: Number(portStr),
      method: req.method,
      path: (rest || "/") + url.search,
      headers: { ...req.headers, host: `${ip}:${portStr}` },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502);
    res.end("Preview upstream unavailable.");
  });
  req.pipe(upstream);
  return true;
}

/** Best-effort raw relay for the preview's WebSocket traffic (e.g. Vite/webpack
 * dev-server HMR) — a byte-level TCP pipe after replaying the original
 * upgrade request to the container. */
export async function handlePreviewUpgrade(
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): Promise<boolean> {
  const url = new URL(req.url ?? "", "http://internal");
  const match = PREVIEW_PATH.exec(url.pathname);
  if (!match) return false;

  const [, workspaceId, portStr, rest] = match;
  if (!workspaceId || !portStr || !checkToken(url, workspaceId)) {
    socket.destroy();
    return true;
  }
  const ip = await getContainerIp(workspaceId);
  if (!ip) {
    socket.destroy();
    return true;
  }

  const upstream = net.connect(Number(portStr), ip, () => {
    const requestLine = `${req.method} ${(rest || "/") + url.search} HTTP/1.1\r\n`;
    const headerLines = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}\r\n`)
      .join("");
    upstream.write(requestLine + headerLines + "\r\n");
    if (head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
  return true;
}
