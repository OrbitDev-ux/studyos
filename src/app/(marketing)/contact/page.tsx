import { Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { CONTACT_EMAIL, siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `문의하기 - ${siteConfig.name}`,
};

export default function ContactPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="flex w-full max-w-md flex-col gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">문의하기</h1>
          <p className="text-muted-foreground text-sm">
            서비스 이용 중 궁금한 점이나 문제가 있다면 아래 이메일로 연락해주세요.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-left">
              <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                <Mail className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-xs font-medium">이메일 문의</span>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-primary truncate text-sm hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 text-left">
              <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
                <MessageCircle className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-xs font-medium">커뮤니티 문의</span>
                <span className="text-muted-foreground text-sm">
                  Discord 문의 채널을 준비 중이에요. 오픈되면 이 페이지에 안내할게요.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
