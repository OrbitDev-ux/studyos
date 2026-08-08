import type { Metadata } from "next";
import { DemoDashboard } from "@/features/demo/components/demo-dashboard";

// Alias of /demo so /demo/dashboard is directly accessible too.
export const metadata: Metadata = { title: "Dashboard" };

export default function DemoDashboardAliasPage() {
  return <DemoDashboard />;
}
