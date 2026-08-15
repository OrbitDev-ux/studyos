import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyServiceToken } from "../auth.js";
import { config } from "../config.js";
import { respondError } from "./router.js";

/** Guards every internal (Web → Runtime) route (§4/§9 of the container API:
 * "모든 요청은 반드시 authenticated user + workspace ownership를 검증"). Web
 * has already done both checks in the DB before calling; this proves the
 * caller genuinely IS StudyOS Web. Returns false (and has already written the
 * 401 response) if the check fails — callers must stop on a false return. */
export function requireServiceAuth(req: IncomingMessage, res: ServerResponse): boolean {
  if (!verifyServiceToken(req.headers.authorization, config.serviceToken)) {
    respondError(res, 401, "unauthorized", "Missing or invalid service token.");
    return false;
  }
  return true;
}
