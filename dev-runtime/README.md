# Study OS Dev — Runtime Backend

Manages per-user Docker Linux containers, PTY terminal sessions, filesystem,
processes, git, and preview proxying for StudyOS's `/dev/*` pages.

**This is a separate service from the StudyOS Next.js app.** StudyOS Web
deploys to Vercel, which has no Docker daemon and no long-lived process — it
is architecturally incapable of running this. This service must run on its
own host that *does* have a Docker daemon (a small VM, e.g. a $5–10/mo box on
Fly.io/Hetzner/DigitalOcean/EC2/etc., or a dedicated server). StudyOS Web
talks to it over HTTPS (REST) and the browser talks to it directly over
WebSocket (terminal) and HTTPS (preview iframe).

```
Browser ──HTTPS (REST, via Next.js server actions)──▶ StudyOS Web (Vercel)
   │                                                         │
   │                                                  service token (server-to-server)
   │                                                         ▼
   ├──WSS (terminal, capability token)──────────────▶ Dev Runtime Backend ──▶ Docker Engine
   └──HTTPS (preview iframe, capability token)──────▶        │                    │
                                                               └── PTY / fs / run / git / metrics
                                                                                    │
                                                                       ┌────────────┼────────────┐
                                                                       ▼            ▼            ▼
                                                                 Container A  Container B  Container C
                                                                  (user A)     (user B)     (user C)
```

## Why two auth mechanisms

- **Service token** (`DEV_RUNTIME_SERVICE_TOKEN`) — a static shared secret.
  Sent by StudyOS Web on every server-to-server REST call (container
  lifecycle, filesystem, run, git, metrics). Web has *already* run
  `requireCurrentUser()` and checked workspace ownership in the DB before
  ever calling here — this only proves "the caller is StudyOS Web itself".
- **Capability token** (`DEV_RUNTIME_CAPABILITY_SECRET`) — a short-lived
  (default 60s to *open* the connection), HMAC-signed, workspace-scoped token
  minted by a StudyOS Web server action (after the same ownership check) for
  the two things the **browser** hits directly, bypassing Web: the terminal
  WebSocket and the preview proxy. Self-verifying — no DB round-trip needed
  here, and this service never re-implements StudyOS's user login/session
  system (it doesn't know what a "user" is beyond an opaque id in the token).

## Container security (§8/§9 of the spec)

Every workspace container is created with:
- `Privileged: false`, `CapDrop: ["ALL"]`, `no-new-privileges`
- No Docker socket mount, no host network, no host PID namespace
- No published ports (preview reaches the container over the internal Docker
  network directly — never a host port)
- CPU / memory / PIDs limits (env-configurable, conservative defaults)
- A named Docker volume mounted at `/workspace` (survives container
  recreation — see "Persistence" below)
- Runs the terminal/exec session as a non-root `dev` user (image-defined)

## Persistence

`/workspace` is a **named Docker volume**, not the container's writable
layer. Destroying/recreating the container (restart, rebuild) does not lose
the volume; only explicitly destroying the *workspace* (`DELETE
/containers/:workspaceId`) removes the volume too.

## Setup (local development)

Requires a running Docker daemon (Docker Desktop or Colima on macOS).

```bash
# 1. Build the user sandbox image
docker build -f docker/sandbox.Dockerfile -t studyos-dev-sandbox:latest .

# 2. Install deps
npm install

# 3. Configure
cp .env.example .env
# fill in DEV_RUNTIME_SERVICE_TOKEN / DEV_RUNTIME_CAPABILITY_SECRET
# (openssl rand -base64 32)

# 4. Run
npm run dev        # tsx watch, or:
npm run build && npm start
```

## Deployment

```bash
docker build -f docker/sandbox.Dockerfile -t studyos-dev-sandbox:latest .
docker compose up -d --build
```

The host running this container needs Docker-in-Docker access via the
mounted socket (`/var/run/docker.sock`) — see `docker-compose.yml`. On
StudyOS Web's side, set:

```
DEV_RUNTIME_URL=https://<this-service's-public-host>
DEV_RUNTIME_SERVICE_TOKEN=<same value as here>
DEV_RUNTIME_CAPABILITY_SECRET=<same value as here>
```

Setting `DEV_RUNTIME_URL` is what switches StudyOS Web from
`UnavailableContainerManager` to `RemoteContainerManager` — see
`src/features/dev/container-manager.ts` in the main app.

## API surface

All routes below (except `/healthz`, `/ws/terminal`, `/preview/*`) require
`Authorization: Bearer <DEV_RUNTIME_SERVICE_TOKEN>` and are called only from
StudyOS Web's server actions, never directly by a browser.

- `POST /containers/:workspaceId/{ensure,start,stop,restart}`, `DELETE /containers/:workspaceId`
- `GET /containers/:workspaceId/{status,metrics}`
- `GET /fs/:workspaceId/list?path=`, `GET|PUT /fs/:workspaceId/file?path=`
- `POST /fs/:workspaceId/{mkdir,rename}`, `DELETE /fs/:workspaceId/entry?path=`
- `POST /processes/:workspaceId`, `GET /processes/:workspaceId`
- `POST /processes/:workspaceId/:id/{stop,restart}`, `GET /processes/:workspaceId/:id/logs`
- `GET /git/:workspaceId/{status,diff,log}`, `POST /git/:workspaceId/{add,commit}`
- `GET /ws/terminal?token=<capability token, scope=terminal>` — browser connects directly
- `GET /preview/:workspaceId/:port/*?token=<capability token, scope=preview>` — browser iframe src points here directly

## Known limitations (v1, honestly documented — §31/§39)

- **Network egress is not filtered.** Containers can reach the internet
  through the default Docker bridge (needed for `npm install`/`pip
  install`/`git clone`). No published inbound ports, but outbound abuse
  (e.g. using a container to proxy traffic) is not yet mitigated by an
  egress allowlist/firewall — that needs a dedicated proxy (e.g. Squid) or
  iptables rules on the Docker bridge, which is future work, not implemented
  here. Do not treat v1 as fully abuse-hardened on the network dimension.
- **Session/process state is in-memory, single-instance.** Terminal sessions
  and the process table live in this process's memory (per the spec's "output
  전체를 DB에 저장하지 마십시오" / "memory/Redis 등 현재 인프라에 맞게").
  Restarting this service drops live terminal connections (the underlying
  container and its files are unaffected) and this service cannot yet be
  horizontally scaled behind a load balancer without sticky sessions or a
  shared session store.
- **Disk quota is best-effort.** `DEV_CONTAINER_DISK_QUOTA_MB` is not
  currently enforced by a hard filesystem quota (Docker volumes don't have a
  built-in per-volume cap on every storage driver); `du` is used for
  reporting, not enforcement. A hard cap needs a quota-capable volume driver
  or a loopback-mounted, sized filesystem per workspace.
