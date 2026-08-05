import type { Difficulty, QuestionType } from "@/generated/prisma/client";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "쉬움",
  MEDIUM: "보통",
  HARD: "어려움",
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "객관식",
  SHORT_ANSWER: "주관식",
};
