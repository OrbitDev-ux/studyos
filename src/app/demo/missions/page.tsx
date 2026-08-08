import type { Metadata } from "next";
import { DemoMissions } from "@/features/demo/components/demo-missions";

export const metadata: Metadata = { title: "오늘의 미션" };

export default function DemoMissionsPage() {
  return <DemoMissions />;
}
