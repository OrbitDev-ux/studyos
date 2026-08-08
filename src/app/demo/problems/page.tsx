import type { Metadata } from "next";
import { DemoProblems } from "@/features/demo/components/demo-problems";

export const metadata: Metadata = { title: "문제 풀기" };

export default function DemoProblemsPage() {
  return <DemoProblems />;
}
