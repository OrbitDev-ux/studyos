import type { Metadata } from "next";
import { DemoReview } from "@/features/demo/components/demo-review";

export const metadata: Metadata = { title: "오답노트" };

export default function DemoReviewPage() {
  return <DemoReview />;
}
