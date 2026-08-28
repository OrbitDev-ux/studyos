# StudyOS Dev — Security

## Why StudyOS's server never executes your commands

StudyOS Web runs on Vercel: stateless serverless functions, no Docker
daemon, no long-lived process. Even setting that constraint aside, running a
user's shell commands *on StudyOS's own infrastructure* would mean every
`npm install`, every arbitrary script, every `git clone` executes on a
machine StudyOS operates and is responsible for — a large, ongoing security
and abuse surface (resource exhaustion, network egress abuse, one tenant's
code reading another's data) for a feature whose entire value proposition is
"work on *your* project."

So StudyOS Dev inverts the usual cloud-IDE shape: the thing that reads
files, spawns a PTY, and shells out to `git` is a small process **you run,
on your own computer** — the Local Agent (`local-agent/`). StudyOS Web's
role is reduced to two things it's already good at: authenticating you, and
brokering a short-lived permission handshake. It is never in the path of an
actual file read, keystroke, or git command.

```
Browser ──(1. mint session token, permission-checked)──▶ StudyOS Web
   │
   └──(2. WS/HTTP, same machine, 127.0.0.1)──▶ Local Agent ──▶ your files/shell/git
                                                    │
                                                    └──(3. redeem token)──▶ StudyOS Web
```

StudyOS Web is reachable in step 3 (agent → web, outbound, device-
authenticated) but is **never** the one initiating a connection into your
machine, and never sees your file contents, your terminal output, or a git
diff pass through it at all.

## Threat model summary

| Actor | Can do | Cannot do |
| --- | --- | --- |
| StudyOS Web (the server) | Auth users, broker pairing, mint/verify short-lived scoped session tokens | Read your files, run commands, see terminal output, reach your machine unprompted |
| An unpaired computer | Nothing — `pairing/start` only creates a request a human must approve | Access any workspace |
| A paired device, no grants | Read the chosen workspace's files and git history | Write files, run a terminal, commit, start a process |
| A paired device with a grant | The one specific thing granted (§ Permission model) | Anything outside the chosen workspace root |
| A page in the same browser, wrong origin | Nothing — the agent's CORS allow-list and WS `Origin` check reject it | Reach the agent's loopback port |

## Local Agent network posture

- Binds **`127.0.0.1` only** (`local-agent/src/server.ts`) — never `0.0.0.0`.
  Nothing off your machine can reach it, full stop; this is the primary
  boundary, everything else is defense in depth on top of it.
- Every HTTP request and every WebSocket upgrade is also checked against an
  `Origin` allow-list (`STUDYOS_DEV_AGENT_ORIGINS`, defaults to
  `https://studyos.app` + `http://localhost:3000`) before anything else runs
  — a different site open in the same browser can't probe the port.
- `/health` is the one unauthenticated route (so the browser can tell
  "agent not running" apart from "agent running, session invalid" per §25) —
  it returns only `{ ok: true, version }`, nothing sensitive.
- Nothing here is a background remote shell: when the `studyos-dev connect`
  process exits (Ctrl+C, `disconnect`, or the machine shutting down), every
  terminal session and every process it started is torn down with it. There
  is no daemon StudyOS (or anyone else) can command remotely while you're
  not running it.

## Credential handling (§6)

- The device's long-lived secret (256-bit random) is generated once, at
  pairing approval, by StudyOS Web. From that instant StudyOS stores **only
  its SHA-256 hash** — the same convention this codebase already uses for
  `PasswordResetToken`.
- The raw secret reaches the agent through exactly one subsequent poll
  response, then is cleared from the pairing row in the same database
  transaction that read it. It is **never** sent to, or displayed in, the
  browser at any point.
- On the agent's machine it's stored via the OS's credential manager —
  macOS Keychain (`security add-generic-password`/`find-generic-password`,
  no extra native dependency). Non-macOS platforms fall back to a single
  `0600` file (`~/.studyos-dev/credential`) and `studyos-dev doctor` reports
  which backend is in use — this is honestly a weaker guarantee than
  Keychain and is disclosed as such, not silently treated as equivalent.
- The browser only ever holds a single-use, 60-second session token — never
  the device secret, never anything that outlives one connection attempt.

**Known trade-off, disclosed rather than hidden**: approving a pairing
request stages the raw device secret in Postgres for up to 5 minutes
(`DevAgentPairingRequest.deviceSecretPlain`), read-once, before the agent's
poll picks it up. This is a deliberate, narrow exception to "hash only" —
the alternative (a symmetric secret StudyOS Web can independently re-derive
for browser-facing token signing) would mean storing something *recoverable*
long-term instead, which is a strictly larger exposure. The staged value is
short-lived, single-read, and never leaves the database until the one
`pairing/poll` call that clears it.

## Permission model (§21)

Every capability request maps to one of six scopes:

| Permission | Default | Gates |
| --- | --- | --- |
| `dev.workspace.read` | **allow** | list/read files |
| `dev.git.read` | **allow** | `git status`/`diff`/`log` |
| `dev.workspace.write` | deny | write/create/rename/delete files |
| `dev.terminal.execute` | deny | open a terminal (PTY) |
| `dev.git.write` | deny | `git add`/`commit` |
| `dev.preview.start` | deny | start/stop a process (`/dev/run`) |

Grants are per-device, explicit, and revocable in `/dev/settings`
(`DevAgentPermissionGrant`, `@@unique([deviceId, permission])`). A revoke
takes effect on the *next* session token minted for that scope — there is no
long-lived cached "yes" anywhere that would let a revoked grant keep working.
Every session-verify call (`agent/verify-session`) re-checks the live grant
server-side, even though the agent also enforces it locally from its last
heartbeat — that's deliberate defense in depth (§14), not redundancy for its
own sake.

## Workspace boundary (§8)

The user explicitly chooses a folder (native macOS picker or a typed path);
the agent treats it as a root boundary enforced by
`resolveInWorkspace()` (`local-agent/src/workspace-path.ts`):

1. String-level rejection of `..`, absolute paths, drive letters, and
   `scheme://` prefixes.
2. **Canonical (real) path verification** — the candidate path (or, for a
   not-yet-created file, its nearest existing ancestor) is resolved with
   `fs.realpath` and checked to be inside the canonicalized workspace root.
   This is what stops a symlink planted inside the workspace from pointing
   somewhere else on disk and being followed — string matching alone (just
   rejecting `..`) does not catch that; see `local-agent/test/workspace-path.test.ts`
   for the symlink-escape test cases.

Real absolute paths never reach StudyOS's database — only the agent's own
`~/.studyos-dev/config.json` knows them.

## Audit logging (§22)

The agent writes a local, size-capped, rotating JSONL log
(`~/.studyos-dev/audit.log`) recording `{ tool, action, workspace, path,
success, timestamp }` for every sensitive operation. It never records file
contents, passwords, API keys, tokens, or `.env` contents — see
`local-agent/src/audit-log.ts`. This log is local to your machine; StudyOS
Web does not receive it.

## What v1 does not claim

- No sandboxing/isolation of the workspace from the rest of your account —
  the Local Agent runs with your own user permissions, the same as running
  `git`/`npm`/a terminal yourself would. It is a convenience layer over doing
  that manually, not a security boundary between "your project" and "your
  computer."
- No Windows PTY support yet (tracked in `docs/STUDYOS_DEV.md`).
- No rate limiting on the agent's own loopback HTTP server beyond the
  terminal's output-rate/buffer caps — acceptable because nothing but this
  same machine, from an allow-listed origin, with a valid session, can reach
  it at all.
