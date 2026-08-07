import { version as appVersion } from "../../../package.json";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/admin/settings";

export type ServiceStatus = "ok" | "down";

export type SystemStatus = {
  server: ServiceStatus;
  database: ServiceStatus;
  cache: ServiceStatus;
  version: string;
  nodeVersion: string;
  environment: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  aiEnabled: boolean;
};

export async function getSystemStatus(): Promise<SystemStatus> {
  let database: ServiceStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "down";
  }

  const settings = await getAllSettings();

  return {
    // We're executing, so the server is up. The DB is probed live above.
    server: "ok",
    database,
    // No external cache layer; Next's data cache is in-process and healthy
    // whenever the server responds.
    cache: "ok",
    version: appVersion,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV ?? "development",
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    aiEnabled: settings.aiEnabled,
  };
}
