import type { Metadata } from "next";
import { CONTACT_EMAIL, siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `개인정보처리방침 - ${siteConfig.name}`,
};

const SECTIONS = [
  {
    title: "1. 수집하는 정보",
    body: [
      "Google 로그인 시 이름, 이메일 주소, 프로필 이미지를 수집합니다.",
      "서비스 이용 과정에서 입력하는 학습 데이터(과목, Todo, 목표, 공부 시간, 문제 풀이 기록, 오답노트, 모의고사 결과 등)를 수집합니다.",
    ],
  },
  {
    title: "2. 이용 목적",
    body: [
      "회원 식별 및 로그인 유지, 학습 데이터 저장·조회 등 서비스 제공을 위해 정보를 이용합니다.",
      "AI 문제 생성, 오답 분석, 학습 리포트 등 AI 기반 기능을 제공하기 위해 학습 데이터의 일부가 AI 처리에 사용됩니다.",
    ],
  },
  {
    title: "3. 보관 기간",
    body: [
      "회원 정보와 학습 데이터는 회원 탈퇴 시까지 보관하며, 탈퇴 시 지체 없이 파기합니다. 관련 법령에 따라 별도 보관이 필요한 정보는 해당 기간 동안 보관 후 파기합니다.",
    ],
  },
  {
    title: "4. Google 로그인",
    body: [
      `${siteConfig.name}는 자체 비밀번호 없이 Google OAuth를 통해 로그인을 제공합니다. 이 과정에서 Google로부터 이름, 이메일, 프로필 이미지를 전달받으며, Google 계정의 비밀번호는 서비스에 저장되거나 전달되지 않습니다.`,
    ],
  },
  {
    title: "5. Gemini API 사용",
    body: [
      "AI 문제 생성, 오답 분석, 학습 리포트 작성 등의 기능은 Google Gemini API를 통해 처리됩니다. 이 과정에서 문제 생성에 필요한 최소한의 학습 데이터(과목명, 단원, 오답 문제 내용 등)가 API 요청에 포함되어 Google로 전송될 수 있습니다.",
      "AI 응답 결과는 서비스에 저장되어 다시 조회할 수 있도록 제공되며, 별도의 광고나 마케팅 목적으로 사용되지 않습니다.",
    ],
  },
  {
    title: "6. 문의 이메일",
    body: [
      `개인정보 처리와 관련해 궁금한 점이나 삭제 요청이 있다면 ${CONTACT_EMAIL}로 연락해주세요.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">개인정보처리방침</h1>
          <p className="text-muted-foreground text-sm">시행일: 2026년 8월 5일</p>
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
