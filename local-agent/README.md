# studyos-dev-agent — StudyOS Dev Local Agent

Runs on **your own computer** and gives StudyOS Dev (the browser IDE at
`/dev` in the main StudyOS app) authenticated access to a real local
filesystem, terminal, and git. StudyOS's own server (Vercel) never executes
anything itself — see [`../docs/SECURITY.md`](../docs/SECURITY.md) for why,
and [`../docs/LOCAL_AGENT.md`](../docs/LOCAL_AGENT.md) for the full protocol.

```
Browser ──(session token, minted by StudyOS Web)──▶ Local Agent (this) ──▶ your files/shell/git
```

## Setup

```bash
npm install
npm run build

npm link            # or: npm install -g .
studyos-dev login
studyos-dev connect
```

Or without installing globally:

```bash
npm run build && node dist/cli.js login
npm run build && node dist/cli.js connect
```

## Commands

- `studyos-dev login` — pair this computer with your StudyOS account (prints
  a short code; approve it at `/dev/pair`).
- `studyos-dev connect` — start the agent (foreground; binds `127.0.0.1`
  only). Ctrl+C to stop.
- `studyos-dev status` — pairing state, workspaces, whether the agent is
  currently running and reachable.
- `studyos-dev disconnect` — stop a `connect` running in another terminal.
- `studyos-dev doctor` — environment diagnostics: Node version, `node-pty`
  load check, `git` presence, macOS Keychain availability, StudyOS
  reachability.

## Configuration (env vars)

| Var | Default | What |
| --- | --- | --- |
| `STUDYOS_URL` | `https://studyos.app` | Where pairing/heartbeat/verify-session go |
| `STUDYOS_DEV_AGENT_PORT` | `4739` | Loopback port the agent listens on |
| `STUDYOS_DEV_AGENT_ORIGINS` | `https://studyos.app,http://localhost:3000` | Comma-separated browser origins allowed to connect |
| `STUDYOS_DEV_AGENT_MAX_FILE_BYTES` | `1048576` (1 MiB) | Per-file read/write cap |
| `STUDYOS_DEV_AGENT_MAX_TERMINALS` | `8` | Concurrent terminal sessions |

See `src/config.ts` for the complete list.

## Development

```bash
npm run dev          # tsx watch src/cli.ts <command>
npm run typecheck
npm test
npm run build
```

## Layout

```
src/
  cli.ts                 studyos-dev entrypoint (login/connect/status/disconnect/doctor)
  pairing.ts              device-code pairing flow (§5)
  credential-store.ts      macOS Keychain / file fallback (§6)
  local-config.ts          ~/.studyos-dev/config.json — deviceId + workspace list (§8, §27)
  workspace-path.ts         canonical-path boundary enforcement, incl. symlink escape (§8)
  fs-operations.ts          atomic reads/writes, size limits (§9–§12)
  git-operations.ts         git status/diff/log/add/commit via execFile, never a shell string (§18–§19)
  pty-session-manager.ts     real PTY sessions via node-pty (§13/§15)
  process-manager.ts         Run/Preview process manager (§17)
  session-auth.ts            verifies browser session tokens against StudyOS Web (§14/§21)
  web-client.ts               agent → StudyOS Web calls (pairing, heartbeat, verify-session)
  audit-log.ts                local-only audit log, never file content (§22)
  http/, routes/, ws/          the loopback HTTP/WS server
test/                         vitest — see for the exact security properties covered
```
