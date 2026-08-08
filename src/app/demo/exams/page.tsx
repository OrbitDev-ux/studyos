import type { Metadata } from "next";
import { DemoExams } from "@/features/demo/components/demo-exams";

export const metadata: Metadata = { title: "모의고사" };

export default function DemoExamsPage() {
  return <DemoExams />;
}
