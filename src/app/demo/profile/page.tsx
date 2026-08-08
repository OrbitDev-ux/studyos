import type { Metadata } from "next";
import { DemoProfile } from "@/features/demo/components/demo-profile";

export const metadata: Metadata = { title: "프로필" };

export default function DemoProfilePage() {
  return <DemoProfile />;
}
