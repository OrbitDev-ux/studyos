import { config } from "./config.js";
import { verifySession } from "./web-client.js";

export type VerifiedSession = { userId: string; scope: string; cachedAt: number };

/**
 * §14/§21: authenticated session + paired device + authorized workspace +
 * session validation, all before a single file/terminal/git operation runs.
 * The FIRST time the browser presents a given session token, this calls
 * StudyOS Web's agent/verify-session (device-authenticated, so StudyOS Web
 * knows exactly which paired device is asking) and caches the result for
 * `sessionCacheTtlMs` — subsequent requests using the SAME token in that
 * window don't re-hit the network, but a revoked permission still takes
 * effect on the token's first verify (StudyOS Web is always the source of
 * truth for grants, never something cached indefinitely here).
 */
export class SessionAuthenticator {
  private cache = new Map<string, VerifiedSession>();

  constructor(private getDeviceSecret: () => Promise<string | null>) {}

  async verify(sessionToken: string | undefined): Promise<VerifiedSession | null> {
    if (!sessionToken) return null;

    const cached = this.cache.get(sessionToken);
    if (cached && Date.now() - cached.cachedAt < config.sessionCacheTtlMs) return cached;

    const secret = await this.getDeviceSecret();
    if (!secret) return null;

    const result = await verifySession(secret, sessionToken);
    if (!result.ok) return null;

    const verified: VerifiedSession = { userId: result.userId, scope: result.scope, cachedAt: Date.now() };
    this.cache.set(sessionToken, verified);
    return verified;
  }

  /** Requires the verified session's scope to match exactly — a
   * dev.workspace.read session can never be used to authorize a write. */
  async requireScope(sessionToken: string | undefined, scope: string): Promise<VerifiedSession | null> {
    const verified = await this.verify(sessionToken);
    if (!verified || verified.scope !== scope) return null;
    return verified;
  }
}
