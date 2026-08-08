import type { Metadata } from "next";
import { DemoDashboard } from "@/features/demo/components/demo-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function DemoDashboardPage() {
  return <DemoDashboard />;
}
