export const siteConfig = {
  name: "StudyOS",
  description:
    "StudyOS는 과목별 Todo·목표·공부시간 관리부터 AI 문제 생성, 오답 DNA 분석, 나만의 교재 만들기, 모의고사, 친구와의 랭킹·배틀까지 한 곳에서 관리하는 학생용 올인원 학습 플랫폼입니다. 무료로 시작할 수 있어요.",
} as const;

/**
 * 서비스 마일스톤 기념 배너(예: 1주 축하) 설정. 노출 여부는 실제 서비스 시작일을
 * 기준으로 계산되며(features/announcements/milestone), 창이 지나면 자동으로 사라진다.
 * 현재 날짜를 하드코딩해 영구 노출하지 않기 위한 단일 설정 지점이다.
 */
export const MILESTONE_BANNER = {
  /** 실제 서비스 시작일(YYYY-MM-DD, KST). init 마이그레이션(2026-08-06) 기준. */
  launchDate: "2026-08-06",
  /** 기념 마일스톤(주). 1 = 1주 기념. */
  milestoneWeeks: 1,
  /** 마일스톤 노출 창(일). 시작일 이후 (milestoneWeeks*7 + windowDays)일이 지나면 종료. */
  windowDays: 7,
} as const;

// 공개 서비스 문의처. 출시 전 실제 운영 도메인 메일로 교체 필요(개인 Gmail 금지).
// 이 값은 문의 페이지·정지 안내·법적 문서(약관/개인정보)에서 모두 참조된다.
export const CONTACT_EMAIL = "support@studyos.app";

/**
 * 마케팅 콘텐츠(랜딩 페이지 등)를 실제로 편집한 마지막 날짜(YYYY-MM-DD). 홈페이지
 * 콘텐츠나 sitemap.ts의 마케팅 경로 lastModified를 실제 변경 시점에 맞게 유지하기
 * 위한 단일 지점 — 콘텐츠를 고칠 때만 사람이 직접 갱신한다. 자동으로 오늘 날짜를
 * 넣지 않는 이유: sitemap의 lastModified는 "실제로 바뀐 날짜"를 의미해야 하며,
 * 매 방문마다 오늘 날짜가 찍히면 검색엔진에 잘못된 신선도 신호를 준다.
 */
export const CONTENT_UPDATED_AT = "2026-08-19";
