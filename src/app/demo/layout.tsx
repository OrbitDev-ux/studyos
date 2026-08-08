import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DemoBanner } from "@/features/demo/components/demo-banner";
import { DemoSidebar } from "@/features/demo/components/demo-sidebar";
import { DemoTourLauncher } from "@/features/demo/components/demo-tour-launcher";
import { DemoProvider } from "@/features/demo/state";

// Public demo section: reuses the real app shell (sidebar/header primitives) but
// requires NO authentication and reads NO real data. Titles are agent/SEO
// friendly ("StudyOS Demo — <page>").
export const metadata: Metadata = {
  title: {
    default: "StudyOS Demo",
    template: "StudyOS Demo — %s",
  },
  description: "계정 없이 StudyOS의 핵심 학습 기능(문제 풀이·오답 분석·자동 복습·AI 추천)을 체험해보세요.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <SidebarProvider>
        <DemoSidebar />
        <SidebarInset>
          <Header />
          <DemoBanner />
          <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
          {/* Onboarding tour auto-starts once per tab; no server state written. */}
          <DemoTourLauncher />
        </SidebarInset>
      </SidebarProvider>
    </DemoProvider>
  );
}
