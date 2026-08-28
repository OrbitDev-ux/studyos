import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, unlink, chmod, mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";

const execFileAsync = promisify(execFile);

const SERVICE_NAME = "studyos-dev";
const ACCOUNT_NAME = "device-secret";
const FALLBACK_FILE = path.join(config.homeDir, "credential");

/**
 * §6: the device's long-lived secret is never written to a plain config file
 * if the OS offers something better. macOS Keychain is used via the `security`
 * CLI (no extra native dependency — `keytar`-style bindings are unmaintained
 * and unnecessary here). Every other platform falls back to a single file
 * with owner-only permissions (0600) and a printed warning — honestly a
 * weaker guarantee than Keychain, documented in SECURITY.md, not silently
 * pretended to be equivalent.
 */
export interface CredentialStore {
  save(secret: string): Promise<void>;
  load(): Promise<string | null>;
  clear(): Promise<void>;
  /** For `studyos-dev doctor` — never returns the secret itself. */
  readonly backend: "keychain" | "file";
}

class MacKeychainStore implements CredentialStore {
  readonly backend = "keychain" as const;

  async save(secret: string): Promise<void> {
    // -U updates in place if an entry already exists, so re-pairing doesn't
    // require a manual delete first.
    await execFileAsync("security", [
      "add-generic-password",
      "-a",
      ACCOUNT_NAME,
      "-s",
      SERVICE_NAME,
      "-w",
      secret,
      "-U",
    ]);
  }

  async load(): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync("security", [
        "find-generic-password",
        "-a",
        ACCOUNT_NAME,
        "-s",
        SERVICE_NAME,
        "-w",
      ]);
      const value = stdout.trim();
      return value.length > 0 ? value : null;
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    await execFileAsync("security", ["delete-generic-password", "-a", ACCOUNT_NAME, "-s", SERVICE_NAME]).catch(
      () => {},
    );
  }
}

class FileStore implements CredentialStore {
  readonly backend = "file" as const;

  async save(secret: string): Promise<void> {
    await mkdir(config.homeDir, { recursive: true, mode: 0o700 });
    await writeFile(FALLBACK_FILE, secret, { encoding: "utf8", mode: 0o600 });
    await chmod(FALLBACK_FILE, 0o600);
  }

  async load(): Promise<string | null> {
    try {
      const value = await readFile(FALLBACK_FILE, "utf8");
      return value.trim() || null;
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    await unlink(FALLBACK_FILE).catch(() => {});
  }
}

export function createCredentialStore(): CredentialStore {
  if (process.platform === "darwin") return new MacKeychainStore();
  return new FileStore();
}
