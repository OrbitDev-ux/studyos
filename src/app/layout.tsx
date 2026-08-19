import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminShortcut } from "@/features/admin/components/admin-shortcut";
import { IpUnbanShortcut } from "@/features/admin/components/ip-unban-shortcut";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { SITE_URL } from "@/lib/site-url";
import { siteConfig } from "@/config/site";
import "./globals.css";
// Pretendard: the vendor's "dynamic subset" distribution instead of next/font
// (see fonts/pretendard-dynamic-subset.css for why) — 92 @font-face rules,
// each a small (~30KB) unicode-range slice shared across ALL weights via
// `format('woff2-variations')`. The browser fetches only the slices that
// intersect glyphs actually rendered on the page, instead of one file
// carrying the full Korean glyph set. Sets font-family: 'Pretendard
// Variable'; globals.css's --font-pretendard points at that name.
import "./fonts/pretendard-dynamic-subset.css";

// 영문·숫자는 Inter, 한글은 Pretendard로 렌더한다. globals.css의 --font-sans
// 스택에서 Inter를 먼저 두어 라틴/숫자를 Inter가 매칭하고, Inter에 없는 한글
// 글리프는 Pretendard로 폴백된다.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = `${siteConfig.name} - AI 문제 생성부터 오답노트, 모의고사까지 학생을 위한 올인원 학습 플랫폼`;
const description = siteConfig.description;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "StudyOS",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // NOTE: <html lang> stays static here to keep marketing/legal pages statically
  // generated (reading cookies/headers in the root layout would force every route
  // dynamic). The resolved UI locale is applied in the dynamic (app) layout.
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          {/* Global hidden admin entry: ⌘+Shift+A opens the login modal. */}
          <AdminShortcut />
          {/* Global recovery: ⌘+Option+3 lifts the caller's IP block. */}
          <IpUnbanShortcut />
        </ThemeProvider>
        {/* PWA: register the service worker (installability + offline fallback). */}
        <ServiceWorkerRegister />
        {/* Vercel Web Analytics — only sends data on the Vercel deployment. */}
        <Analytics />
      </body>
    </html>
  );
}
