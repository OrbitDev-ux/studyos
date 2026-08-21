/**
 * StudyMission field types — plain string unions (not Postgres enums),
 * matching this schema's convention for fields expected to grow (see
 * StudySession.type, Friendship.status): a new mission type/status is a TS
 * change, never a migration. Validated at the application boundary
 * (mission-schema.ts), not the DB.
 */

export const MISSION_TYPES = [
  "STUDY_TIME",
  "PROBLEM_COUNT",
  "REVIEW_COUNT",
  "GOAL",
  "CUSTOM",
] as const;
export type MissionType = (typeof MISSION_TYPES)[number];

export const MISSION_SOURCES = ["MANUAL", "GOAL", "SYSTEM"] as const;
export type MissionSource = (typeof MISSION_SOURCES)[number];

export const MISSION_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

/** Statuses a mission can still make progress toward completion from. */
export const ACTIVE_MISSION_STATUSES: MissionStatus[] = ["PENDING", "IN_PROGRESS"];

export const DEFAULT_MISSION_XP_REWARD = 50;

/** STUDY_TIME/PROBLEM_COUNT/REVIEW_COUNT progress automatically from existing
 * app activity (see mission-progress.ts's hooks); CUSTOM/GOAL missions have
 * no automatic source and are completed via the explicit completeMission
 * action instead. */
export function hasAutomaticProgress(type: MissionType): boolean {
  return type === "STUDY_TIME" || type === "PROBLEM_COUNT" || type === "REVIEW_COUNT";
}
