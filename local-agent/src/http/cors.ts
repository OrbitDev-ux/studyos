import type { IncomingMessage, ServerResponse } from "node:http";
import { config } from "../config.js";

/**
 * §14 defense-in-depth: even though the real gate is the per-request session
 * token (session-auth.ts), only an allow-listed StudyOS origin is even
 * allowed to ATTEMPT a request here — a random page open in the same browser
 * can't quietly probe this port. Loopback-only binding (server.ts) is the
 * primary boundary; this is a second one on top.
 */
export function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin;
  if (origin && config.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-StudyOS-Session");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  return !!origin && config.allowedOrigins.includes(origin);
}
