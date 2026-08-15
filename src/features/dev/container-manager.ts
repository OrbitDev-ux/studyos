import "server-only";
import { UnavailableContainerManager, type ContainerManager } from "@/features/dev/unavailable-container-manager";
import { RemoteContainerManager } from "@/features/dev/remote-container-manager";
import { isRuntimeConfigured } from "@/features/dev/runtime-client";

export type { ContainerManager, ContainerManagerResult } from "@/features/dev/unavailable-container-manager";

/**
 * The container manager the app uses — selected by whether `DEV_RUNTIME_URL`
 * is configured (§5). No other file needs to change when a real backend is
 * plugged in: this is the ONLY place that decides which implementation runs.
 */
export const containerManager: ContainerManager = isRuntimeConfigured()
  ? new RemoteContainerManager()
  : new UnavailableContainerManager();
