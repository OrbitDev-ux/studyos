import type { Metadata } from "next";
import { DemoWeakness } from "@/features/demo/components/demo-weakness";

export const metadata: Metadata = { title: "약점 문제" };

export default function DemoWeaknessPage() {
  return <DemoWeakness />;
}
