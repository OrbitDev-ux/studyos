import { version as appVersion } from "../../../package.json";
import { getMaintenance } from "@/lib/maintenance";

/**
 * Version/environment/maintenance info for the admin system page. The
 * per-service OPERATIONAL/DEGRADED/DOWN/UNKNOWN health grid this used to also
 * return (server/database/cache, 2-state only) is superseded by the Status
 * Dashboard (features/admin/status.ts) — kept here would just be a second,
 * cruder version of the same database check running on the same page.
 */
export type SystemStatus = {
  version: string;
  nodeVersion: string;
  environment: string;
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
};

export async function getSystemStatus(): Promise<SystemStatus> {
  const maintenance = await getMaintenance();

  return {
    version: appVersion,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV ?? "development",
    maintenanceMode: maintenance.enabled,
    maintenanceTitle: maintenance.title ?? "",
    maintenanceMessage: maintenance.message ?? "",
  };
}
