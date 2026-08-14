import type { Locale } from "@/features/i18n/config";
import type { AchievementCategory, AchievementId } from "@/features/achievements/config";

/**
 * Achievement copy, colocated with the definitions and keyed by the request's
 * resolved i18n locale. Kept out of the central messages dictionary because the
 * per-badge title/description set is large and domain-specific; it still uses
 * the same Locale so switching language switches this text too.
 */
type Copy = { title: string; description: string };

export type AchievementSectionCopy = {
  sectionTitle: string;
  progress: string; // "{earned}/{total}"
  empty: string;
  categories: Record<AchievementCategory, string>;
  items: Record<AchievementId, Copy>;
};

export const ACHIEVEMENT_COPY: Record<Locale, AchievementSectionCopy> = {
  "ko-KR": {
    sectionTitle: "성취",
    progress: "{earned}/{total} 획득",
    empty: "아직 획득한 배지가 없어요. 학습을 시작해 첫 배지를 받아보세요.",
    categories: { study: "학습", problem: "문제", review: "복습", weakness: "약점 극복" },
    items: {
      FIRST_STUDY: { title: "첫 학습", description: "첫 학습을 완료했어요." },
      STUDY_STREAK_3: { title: "3일 연속", description: "3일 연속으로 학습했어요." },
      STUDY_STREAK_7: { title: "7일 연속", description: "7일 연속으로 학습했어요." },
      STUDY_STREAK_30: { title: "30일 연속", description: "30일 연속으로 학습했어요." },
      FIRST_PROBLEM: { title: "첫 문제", description: "첫 문제를 풀었어요." },
      PROBLEM_10: { title: "10문제", description: "문제 10개를 풀었어요." },
      PROBLEM_100: { title: "100문제", description: "문제 100개를 풀었어요." },
      PERFECT_10: { title: "연속 정답", description: "10문제를 연속으로 맞혔어요." },
      FIRST_REVIEW: { title: "첫 복습", description: "첫 복습을 완료했어요." },
      REVIEW_30: { title: "복습 30", description: "복습 30개를 완료했어요." },
      REVIEW_MASTER: { title: "복습 마스터", description: "복습 예정 항목을 모두 끝냈어요." },
      WEAKNESS_OVERCOME: { title: "약점 극복", description: "취약 문제를 복습으로 극복했어요." },
      WRONG_ANSWER_RECOVERY: { title: "오답 극복", description: "반복 오답을 꾸준히 극복했어요." },
    },
  },
  "en-US": {
    sectionTitle: "Achievements",
    progress: "{earned}/{total} earned",
    empty: "No badges yet. Start studying to earn your first one.",
    categories: { study: "Study", problem: "Problems", review: "Review", weakness: "Weakness" },
    items: {
      FIRST_STUDY: { title: "First study", description: "Completed your first study session." },
      STUDY_STREAK_3: { title: "3-day streak", description: "Studied 3 days in a row." },
      STUDY_STREAK_7: { title: "7-day streak", description: "Studied 7 days in a row." },
      STUDY_STREAK_30: { title: "30-day streak", description: "Studied 30 days in a row." },
      FIRST_PROBLEM: { title: "First problem", description: "Solved your first problem." },
      PROBLEM_10: { title: "10 problems", description: "Solved 10 problems." },
      PROBLEM_100: { title: "100 problems", description: "Solved 100 problems." },
      PERFECT_10: { title: "Perfect streak", description: "Answered 10 problems in a row." },
      FIRST_REVIEW: { title: "First review", description: "Completed your first review." },
      REVIEW_30: { title: "30 reviews", description: "Completed 30 reviews." },
      REVIEW_MASTER: { title: "Review master", description: "Cleared every due review." },
      WEAKNESS_OVERCOME: { title: "Weakness overcome", description: "Overcame weak problems through review." },
      WRONG_ANSWER_RECOVERY: { title: "Mistake recovery", description: "Steadily overcame repeated mistakes." },
    },
  },
  "ja-JP": {
    sectionTitle: "実績",
    progress: "{earned}/{total} 獲得",
    empty: "まだ獲得したバッジがありません。学習を始めて最初のバッジを獲得しましょう。",
    categories: { study: "学習", problem: "問題", review: "復習", weakness: "弱点克服" },
    items: {
      FIRST_STUDY: { title: "はじめての学習", description: "はじめての学習を完了しました。" },
      STUDY_STREAK_3: { title: "3日連続", description: "3日連続で学習しました。" },
      STUDY_STREAK_7: { title: "7日連続", description: "7日連続で学習しました。" },
      STUDY_STREAK_30: { title: "30日連続", description: "30日連続で学習しました。" },
      FIRST_PROBLEM: { title: "はじめての問題", description: "はじめての問題を解きました。" },
      PROBLEM_10: { title: "10問", description: "問題を10問解きました。" },
      PROBLEM_100: { title: "100問", description: "問題を100問解きました。" },
      PERFECT_10: { title: "連続正解", description: "10問連続で正解しました。" },
      FIRST_REVIEW: { title: "はじめての復習", description: "はじめての復習を完了しました。" },
      REVIEW_30: { title: "復習30", description: "復習を30個完了しました。" },
      REVIEW_MASTER: { title: "復習マスター", description: "復習予定の項目をすべて終えました。" },
      WEAKNESS_OVERCOME: { title: "弱点克服", description: "苦手な問題を復習で克服しました。" },
      WRONG_ANSWER_RECOVERY: { title: "ミス克服", description: "繰り返すミスを着実に克服しました。" },
    },
  },
  "zh-CN": {
    sectionTitle: "成就",
    progress: "已获得 {earned}/{total}",
    empty: "还没有获得徽章。开始学习，获得第一个徽章吧。",
    categories: { study: "学习", problem: "题目", review: "复习", weakness: "克服弱点" },
    items: {
      FIRST_STUDY: { title: "首次学习", description: "完成了第一次学习。" },
      STUDY_STREAK_3: { title: "连续 3 天", description: "连续 3 天学习。" },
      STUDY_STREAK_7: { title: "连续 7 天", description: "连续 7 天学习。" },
      STUDY_STREAK_30: { title: "连续 30 天", description: "连续 30 天学习。" },
      FIRST_PROBLEM: { title: "首道题", description: "完成了第一道题。" },
      PROBLEM_10: { title: "10 道题", description: "完成了 10 道题。" },
      PROBLEM_100: { title: "100 道题", description: "完成了 100 道题。" },
      PERFECT_10: { title: "连续答对", description: "连续答对 10 道题。" },
      FIRST_REVIEW: { title: "首次复习", description: "完成了第一次复习。" },
      REVIEW_30: { title: "复习 30", description: "完成了 30 次复习。" },
      REVIEW_MASTER: { title: "复习大师", description: "清空了所有待复习项目。" },
      WEAKNESS_OVERCOME: { title: "克服弱点", description: "通过复习克服了薄弱题目。" },
      WRONG_ANSWER_RECOVERY: { title: "错题逆袭", description: "持续克服反复出现的错误。" },
    },
  },
};

export function getAchievementCopy(locale: Locale): AchievementSectionCopy {
  return ACHIEVEMENT_COPY[locale];
}
