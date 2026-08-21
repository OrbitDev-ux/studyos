import "server-only";
import { getZonedDateString } from "@/lib/date";
import { awardXp, studyTimeXp, XP_AMOUNTS } from "@/features/growth/xp";
import { progressMissionsByType } from "@/features/growth/mission-progress";

/**
 * Growth's integration surface — the ONLY functions the rest of the app calls
 * into Growth from. Each one is invoked from an EXISTING server-side write
 * path (never from client input) right after that path has already
 * authoritatively recorded the real activity, so there's nothing here for a
 * client to spoof: the amount/sourceId are always derived from server-owned
 * data (a session's measured duration, a problem/wrongAnswer/goal id, a
 * server-computed date string).
 */

/**
 * A StudySession just closed (features/study-sessions/actions.ts's
 * stopStudySession) — the only entry point for STUDY_TIME XP/mission
 * progress. `durationSec` is the server-measured duration of that specific
 * session; `studySessionId` makes the XP grant idempotent per session (a
 * session can only ever award this once, however stopStudySession is called).
 * A no-op below 30 real minutes (both XP and mission progress floor to whole
 * units) — this is expected, not a bug.
 */
export async function onStudySessionCompleted(
  userId: string,
  studySessionId: string,
  durationSec: number,
  timezone: string,
): Promise<void> {
  const xp = studyTimeXp(durationSec);
  if (xp > 0) {
    await awardXp({ userId, type: "STUDY_TIME", amount: xp, sourceId: studySessionId });
  }

  const minutes = Math.floor(Math.max(0, durationSec) / 60);
  if (minutes > 0) {
    await progressMissionsByType(userId, "STUDY_TIME", minutes, timezone);
  }
}

/**
 * A graded problem attempt was just logged (features/learning/record-attempt.ts,
 * the shared choke point for practice/mock-exam/review submissions) — +2 XP
 * once per (user, problem, calendar day) regardless of how many times the
 * SAME problem is resubmitted that day, so repeatedly re-submitting one easy
 * problem can't farm unlimited XP. PROBLEM_COUNT mission progress only
 * advances when the XP was actually newly granted, reusing that exact
 * dedup check instead of a second one.
 */
export async function onProblemAttemptRecorded(
  userId: string,
  problemId: string,
  timezone: string,
): Promise<void> {
  const dateKey = getZonedDateString(new Date(), timezone);
  const { awarded } = await awardXp({
    userId,
    type: "PROBLEM_SOLVED",
    amount: XP_AMOUNTS.PROBLEM_SOLVED,
    sourceId: `${problemId}:${dateKey}`,
  });
  if (awarded) {
    await progressMissionsByType(userId, "PROBLEM_COUNT", 1, timezone);
  }
}

/**
 * A wrong answer's spaced-repetition schedule just advanced (features/review/
 * schedule-service.ts's recordReviewSuccess/gradeReviewById) — +10 XP once
 * per (reviewItemKey, the review stage it just advanced to). A stage only
 * ever advances forward (or resets on a lapse), so this key can't be replayed
 * by re-reviewing the same item at the same stage.
 *
 * `reviewItemKey` identifies the reviewed item WITHIN this user's own scope
 * (sourceId is only unique per-userId) — either the WrongAnswer row's id, or
 * (equally valid, since WrongAnswer is unique per [userId, problemId]) the
 * problemId, whichever the caller already has on hand.
 */
export async function onReviewCompleted(
  userId: string,
  reviewItemKey: string,
  newReviewStage: number,
  timezone: string,
): Promise<void> {
  const { awarded } = await awardXp({
    userId,
    type: "REVIEW_COMPLETED",
    amount: XP_AMOUNTS.REVIEW_COMPLETED,
    sourceId: `${reviewItemKey}:${newReviewStage}`,
  });
  if (awarded) {
    await progressMissionsByType(userId, "REVIEW_COUNT", 1, timezone);
  }
}

/**
 * A Goal's progress update just reached/exceeded its target (features/goals/
 * actions.ts's incrementGoalProgress) — +30 XP once per goal, ever. Safe to
 * call every time the goal is AT OR ABOVE target (not just "the first time"):
 * the sourceId=goalId uniqueness is what actually prevents re-awarding, so
 * the caller doesn't need to track completion transitions itself.
 */
export async function onGoalCompleted(userId: string, goalId: string): Promise<void> {
  await awardXp({
    userId,
    type: "GOAL_COMPLETED",
    amount: XP_AMOUNTS.GOAL_COMPLETED,
    sourceId: goalId,
  });
}
