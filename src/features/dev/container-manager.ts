import "server-only";
import { UnavailableContainerManager, type ContainerManager } from "@/features/dev/unavailable-container-manager";

export type { ContainerManager, ContainerManagerResult } from "@/features/dev/unavailable-container-manager";

/** The container manager the app uses. v1: always unavailable (see
 * unavailable-container-manager.ts doc) — swap this single line for a real
 * implementation when one exists. */
export const containerManager: ContainerManager = new UnavailableContainerManager();
