export const siteConfig = {
  name: "StudyOS",
  description: "학생을 위한 올인원 공부 관리 플랫폼",
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
