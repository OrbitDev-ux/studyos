import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `이용약관 - ${siteConfig.name}`,
};

const SECTIONS = [
  {
    title: "1. 서비스 이용",
    body: [
      `${siteConfig.name}(이하 "서비스")는 학생의 학습 관리를 돕는 온라인 플랫폼입니다. 이용자는 관련 법령과 이 약관을 준수하며 서비스를 이용해야 하고, 서비스가 제공하는 기능을 본래 목적과 다르게 악용해서는 안 됩니다.`,
    ],
  },
  {
    title: "2. 계정",
    body: [
      "서비스는 Google 계정을 통한 로그인을 지원합니다. 계정 정보의 관리 책임은 이용자 본인에게 있으며, 계정이 무단으로 사용된 것을 알게 된 경우 즉시 서비스에 알려야 합니다.",
      "관련 법령을 위반하거나 다른 이용자에게 피해를 주는 방식으로 계정을 사용하는 경우, 사전 통지 없이 이용이 제한될 수 있습니다.",
    ],
  },
  {
    title: "3. 책임 제한",
    body: [
      "서비스는 학습에 도움이 되는 정보와 AI 생성 콘텐츠(문제, 해설, 분석 리포트 등)를 제공하지만, 그 정확성이나 완전성을 보장하지 않습니다. AI가 생성한 문제·해설에는 오류가 포함될 수 있으므로 학습 참고용으로만 활용해주세요.",
      "서비스는 천재지변, 통신 장애 등 통제할 수 없는 사유로 발생한 손해에 대해 책임을 지지 않으며, 관련 법령이 허용하는 범위 내에서 서비스 이용으로 발생한 손해에 대한 책임을 제한합니다.",
    ],
  },
  {
    title: "4. 서비스 변경",
    body: [
      "서비스는 운영상, 기술상 필요에 따라 제공하는 기능의 전부 또는 일부를 추가, 변경하거나 중단할 수 있습니다. 이용자에게 중대한 영향을 미치는 변경 사항은 서비스 내 공지 또는 이 페이지를 통해 안내합니다.",
      "이 약관은 필요한 경우 개정될 수 있으며, 개정된 약관은 이 페이지에 게시함으로써 효력이 발생합니다.",
    ],
  },
  {
    title: "5. 문의",
    body: ["약관과 관련해 궁금한 점이 있다면 문의하기 페이지를 통해 연락해주세요."],
  },
];

export default function TermsPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">이용약관</h1>
          <p className="text-muted-foreground text-sm">
            시행일: 2026년 8월 5일 · 본 약관은 스타트업 초기 서비스 수준으로 간결하게
            작성되었습니다.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <section key={section.title} className="flex flex-col gap-2">
              <h2 className="text-base font-semibold">{section.title}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="text-muted-foreground text-sm leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
