# Local Agent

The Local Agent (`local-agent/`, npm package `studyos-dev-agent`, CLI
`studyos-dev`) is a small Node.js process that runs **on your own computer**.
It is what actually reads/writes files, runs your shell, and calls `git` —
StudyOS Web (the Next.js app on Vercel) never does any of that itself. See
[`SECURITY.md`](./SECURITY.md) for why.

```
Browser (StudyOS Dev)                 StudyOS Web (Vercel)
        │                                     │
        │  1. server action: mint a           │
        │     short-lived, permission-        │
        │     checked session token   ───────▶│
        │◀───────────────────────────────────│
        │                                     │
        │  2. WS/HTTP directly to             │
        │     127.0.0.1:<port>                │
        ▼                                     │
  Local Agent (your machine)                  │
        │  3. redeems the session token  ─────▶  agent/verify-session
        │     against StudyOS Web             │  (device-authenticated)
        │◀───────────────────────────────────│
        ▼
  Your filesystem / shell / git
```

The browser and the agent are expected to run on the **same machine** — that
is the whole point. StudyOS Web is only ever involved in (a) the one-time
pairing handshake and (b) minting/verifying short-lived session tokens; it
never proxies file, terminal, or git traffic.

## Install & commands

```bash
cd local-agent
npm install
npm run build

studyos-dev login        # pair this computer with your StudyOS account
studyos-dev connect       # start the agent (foreground; Ctrl+C to stop)
studyos-dev status        # what's paired, what's running, is it reachable
studyos-dev disconnect    # stop a `connect` running in another terminal
studyos-dev doctor         # environment diagnostics (node-pty, git, Keychain, network)
```

## Pairing (§5)

`studyos-dev login` implements a device-code flow (the same shape as OAuth's
Device Authorization Grant):

1. The agent calls `POST /api/dev/pairing/start` (no auth — this is the one
   endpoint an unpaired agent can call) and gets back a short code
   (`WXPK-7RTN`) plus a `pairingRequestId`.
2. The agent prints the code and polls `POST /api/dev/pairing/poll` every 2s.
3. A signed-in human opens `/dev/pair`, sees the device's self-reported name,
   and clicks **Allow** or **Cancel** — nothing is created until then.
4. On Allow, StudyOS Web generates a random 256-bit device secret, stores
   only its SHA-256 hash, and stages the raw secret in the pairing row for
   **exactly one** subsequent poll to pick up (cleared in the same
   transaction that reads it — see `SECURITY.md`).
5. The agent's next poll receives `{ deviceId, deviceSecret }` once and
   stores the secret in the OS Keychain (macOS) or a `0600` file elsewhere.

The pairing *code* itself is never stored anywhere in plaintext — only its
hash, the same convention `PasswordResetToken` already uses in this codebase.

## Workspaces (§8)

A "workspace" is a folder the user explicitly chooses on their own machine —
via a native macOS folder picker (`osascript`) or a typed path. StudyOS Web
never learns the real absolute path; it only ever sees a `deviceId` and an
agent-local `workspaceId`. The agent's own `~/.studyos-dev/config.json` is
the only place the mapping from `workspaceId` → real path lives.

Every filesystem/git operation resolves through `resolveInWorkspace()`
(`local-agent/src/workspace-path.ts`), which:

- rejects `..`/absolute/drive/scheme paths at the string level, and
- **canonicalizes** the result with `fs.realpath` (walking up to the nearest
  existing ancestor for not-yet-created paths) and checks it's still inside
  the canonical workspace root — so a symlink planted inside the workspace
  that points outside it is rejected too, not just literal `../`.

## Sessions (the browser → agent connect token)

1. The browser (a client component) calls the server action
   `createAgentSession(deviceId, scope)`. StudyOS Web checks the caller owns
   the device and — for anything beyond read access — that the permission
   is currently granted (`/dev/settings`). It returns a random, single-use
   `DevAgentSession` id valid for 60 seconds.
2. The browser opens a request/WebSocket straight to
   `http://127.0.0.1:<port>` with that token in `X-StudyOS-Session` (HTTP) or
   `?session=` (the terminal WS upgrade).
3. The agent calls `POST /api/dev/agent/verify-session`, authenticating
   itself with its own device secret. StudyOS Web marks the token consumed
   and returns the userId + scope it was minted for.
4. The agent caches that verified result in memory (15 min) so it doesn't
   re-verify on every keystroke — a revoked permission still takes effect
   the moment a *new* session token is presented, because step 3 always
   re-checks the live grant, never a cached one, on that first verify.

## Terminal (§13)

`local-agent/src/pty-session-manager.ts` spawns the user's own shell
(`$SHELL`, or `/bin/bash`) directly via `node-pty` — a real PTY, not a
simulated one. `local-agent/src/ws/terminal-server.ts` is the WebSocket
bridge xterm.js talks to. Output is rate-limited and buffer-capped so a
runaway `yes`/infinite loop can't grow memory unboundedly; idle sessions are
reaped after an hour.

## Filesystem (§9–§12)

`local-agent/src/fs-operations.ts`. Writes are atomic (temp file in the same
directory, `fsync`, then `rename` — a crash mid-write can never leave a
half-written file). Reads and writes are capped at 1 MiB
(`STUDYOS_DEV_AGENT_MAX_FILE_BYTES`).

## Git (§18–§19)

`local-agent/src/git-operations.ts` shells out to the real `git` binary via
`execFile` (never a shell string — arguments are always real argv elements,
so a validator bug can't become a shell-injection primitive). Commits only
ever happen from an explicit "Add & Commit" click in `/dev/git`.

## Run / Preview (§17)

`local-agent/src/process-manager.ts` starts a command (e.g. `npm run dev`)
as a real child process, capturing bounded stdout/stderr for `/dev/run`'s
log view. `/dev/preview` doesn't proxy anything — since the browser and the
agent are on the same machine, it's just an iframe pointed at
`http://localhost:<port>`.

## Uninstalling / revoking

- **From StudyOS**: `/dev` → remove the device. This stops StudyOS Web from
  accepting new sessions or heartbeats from it — it does **not** reach into
  your computer and stop the process (StudyOS Web has no channel to do
  that; see `SECURITY.md`).
- **On your computer**: `studyos-dev disconnect` (or Ctrl+C in the terminal
  running `connect`) stops the agent and closes every terminal/process it
  owns. Delete `~/.studyos-dev/` to remove local state, and remove the
  Keychain entry with `security delete-generic-password -a device-secret -s
  studyos-dev` (macOS) if you want the credential gone too.

## Future: AI integration extension point (§20)

Not implemented in v1. The intended shape is a **Dev Tool abstraction**
between StudyOS's AI features and the Local Agent's HTTP API — the same
file/terminal/git routes this doc describes, called by a tool-use loop
instead of a browser. No provider-specific (Claude/Groq/etc.) logic belongs
in `local-agent/`; that stays entirely on the StudyOS Web side.
