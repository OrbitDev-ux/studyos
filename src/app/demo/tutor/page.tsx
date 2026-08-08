import type { Metadata } from "next";
import { DemoTutor } from "@/features/demo/components/demo-tutor";

export const metadata: Metadata = { title: "AI 튜터" };

export default function DemoTutorPage() {
  return <DemoTutor />;
}
