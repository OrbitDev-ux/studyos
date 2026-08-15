// Some npm install pipelines (certain sandboxed/CI tarball-extraction paths)
// don't preserve the executable bit on node-pty's prebuilt `spawn-helper`
// binary, which then fails at runtime with "posix_spawnp failed" the first
// time a PTY is spawned. No-op wherever the bit is already set correctly.
import { chmodSync, existsSync } from "node:fs";
import { join } from "node:path";

const candidates = [
  "node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper",
  "node_modules/node-pty/prebuilds/darwin-x64/spawn-helper",
  "node_modules/node-pty/prebuilds/linux-arm64/spawn-helper",
  "node_modules/node-pty/prebuilds/linux-x64/spawn-helper",
];

for (const rel of candidates) {
  const path = join(process.cwd(), rel);
  if (existsSync(path)) {
    chmodSync(path, 0o755);
  }
}
