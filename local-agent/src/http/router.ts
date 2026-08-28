import type { IncomingMessage, ServerResponse } from "node:http";

export type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
  body: unknown,
) => Promise<void> | void;

type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler };

const MAX_BODY_BYTES = 2 * 1024 * 1024; // headroom above config.maxFileBytes (1 MiB) for JSON overhead

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("payload_too_large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve(undefined);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

export function respondJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) });
  res.end(payload);
}

/** Never leaks internal error details (stack traces, absolute filesystem
 * paths) to the browser (§23) — only a stable machine code + safe message. */
export function respondError(res: ServerResponse, status: number, code: string, message: string): void {
  respondJson(res, status, { error: { code, message } });
}

export class Router {
  private routes: Route[] = [];

  private add(method: string, path: string, handler: Handler): void {
    const keys: string[] = [];
    const source = path
      .split("/")
      .map((segment) => {
        if (segment.startsWith(":")) {
          keys.push(segment.slice(1));
          return "([^/]+)";
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    this.routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handler });
  }

  get(path: string, handler: Handler): void {
    this.add("GET", path, handler);
  }
  post(path: string, handler: Handler): void {
    this.add("POST", path, handler);
  }
  put(path: string, handler: Handler): void {
    this.add("PUT", path, handler);
  }
  delete(path: string, handler: Handler): void {
    this.add("DELETE", path, handler);
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://internal");
    for (const route of this.routes) {
      if (route.method !== req.method) continue;
      const match = route.pattern.exec(url.pathname);
      if (!match) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(match[i + 1] ?? "");
      });
      let body: unknown;
      if (req.method === "POST" || req.method === "PUT") {
        try {
          body = await readJsonBody(req);
        } catch (err) {
          respondError(res, 400, "BAD_REQUEST", err instanceof Error ? err.message : "invalid body");
          return true;
        }
      }
      try {
        await route.handler(req, res, params, body);
      } catch (err) {
        console.error(`[route error] ${req.method} ${url.pathname}:`, err);
        respondError(res, 500, "FILESYSTEM_ERROR", "Something went wrong.");
      }
      return true;
    }
    return false;
  }
}
