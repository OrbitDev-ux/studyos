import type { Metadata } from "next";
import { DemoAnalytics } from "@/features/demo/components/demo-analytics";

export const metadata: Metadata = { title: "통계" };

export default function DemoAnalyticsPage() {
  return <DemoAnalytics />;
}
