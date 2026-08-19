import type { Metadata } from "next";
import { DemoDashboard } from "@/features/demo/components/demo-dashboard";

// The parent layout's title.template ("StudyOS Demo — %s") only applies to
// segments nested BELOW it, not to a page.tsx at the same segment as the
// layout — so this needs the full string spelled out, not just "체험하기".
export const metadata: Metadata = { title: "StudyOS Demo — 체험하기" };

export default function DemoDashboardPage() {
  return <DemoDashboard />;
}
