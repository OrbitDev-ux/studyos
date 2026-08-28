# StudyOS Dev

StudyOS Dev is a browser-based development workspace — file explorer, code
editor, terminal, git, and a lightweight process/preview manager — for a
project on **your own computer**. It lives at `/dev` inside StudyOS.

Unlike a cloud IDE, StudyOS Dev never runs your code anywhere but your own
machine. See [`LOCAL_AGENT.md`](./LOCAL_AGENT.md) for how that works and
[`SECURITY.md`](./SECURITY.md) for why it's built this way.

## What it provides

| Area | Route | What it does |
| --- | --- | --- |
| Workspace | `/dev` | Paired devices, pairing, permissions, quick links |
| Pairing | `/dev/pair` | Approve/deny a computer that's trying to connect |
| IDE | `/dev/ide` | File tree + Monaco editor + tabs + integrated terminal |
| Terminal | `/dev/terminal` | A real terminal (xterm.js) into your own shell |
| Files | `/dev/files` | File tree + single-file preview/edit |
| Run | `/dev/run` | Start/stop a command (e.g. `npm run dev`), see its logs |
| Preview | `/dev/preview` | Open `http://localhost:<port>` for a running dev server |
| Git | `/dev/git` | `git status`/`diff`/`log`, stage + commit |
| Settings | `/dev/settings` | Editor/terminal preferences, device permissions |

## Getting started

```text
1. npm install -g studyos-dev-agent        # or: cd local-agent && npm run build
2. studyos-dev login                        # prints a short code
3. Open the printed studyos.app/dev/pair link, or type the code there
4. Click "Allow" — StudyOS now knows this computer's device id
5. studyos-dev connect                      # starts the local agent
6. Open StudyOS Dev (/dev), choose a workspace folder, start working
```

`studyos-dev connect` runs in the foreground — leave that terminal open (or
run it under your own process manager). `studyos-dev disconnect` (from
another terminal) or Ctrl+C stops it and closes every open terminal/process
it owns.

## Permissions

A newly paired device can only **read** your chosen workspace's files and
git history. Writing files, running a terminal, committing, and starting a
process each need an explicit grant in `/dev/settings` — off by default. See
[`SECURITY.md`](./SECURITY.md#permission-model) for the full model.

## What v1 does not do

- No cloud/container execution — see [`LOCAL_AGENT.md`](./LOCAL_AGENT.md).
- No autonomous AI coding loop. `docs/v2-ai-platform-roadmap.md` and the tool
  abstraction referenced in `LOCAL_AGENT.md`'s "Future: AI integration"
  section are the intended extension point, not something wired up yet.
- No Windows PTY support (the terminal needs `node-pty`'s ConPTY path
  exercised and verified — tracked, not done). Everything else (pairing,
  files, git, run, preview) is platform-agnostic Node.js and should work.
- No port-in-use detection for Preview — you tell it which port to open.
