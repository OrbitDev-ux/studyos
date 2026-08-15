import { afterEach, describe, expect, it, vi } from "vitest";
import { isRuntimeConfigured, runtimeWsBaseUrl } from "@/features/dev/runtime-client-core";

describe("isRuntimeConfigured / runtimeWsBaseUrl (§5 backend selection)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is unconfigured when DEV_RUNTIME_URL is unset — the honest v1 default", () => {
    vi.stubEnv("DEV_RUNTIME_URL", "");
    expect(isRuntimeConfigured()).toBe(false);
    expect(runtimeWsBaseUrl()).toBeNull();
  });

  it("is configured once DEV_RUNTIME_URL is set", () => {
    vi.stubEnv("DEV_RUNTIME_URL", "https://runtime.example.com");
    expect(isRuntimeConfigured()).toBe(true);
  });

  it("derives wss:// from https:// DEV_RUNTIME_URL", () => {
    vi.stubEnv("DEV_RUNTIME_URL", "https://runtime.example.com/");
    expect(runtimeWsBaseUrl()).toBe("wss://runtime.example.com");
  });

  it("DEV_RUNTIME_WS_URL overrides the derived host", () => {
    vi.stubEnv("DEV_RUNTIME_URL", "https://runtime.example.com");
    vi.stubEnv("DEV_RUNTIME_WS_URL", "wss://ws.example.com");
    expect(runtimeWsBaseUrl()).toBe("wss://ws.example.com");
  });
});
