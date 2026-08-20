export type StreamErrorEvent = {
  error: string;
  code?: string;
  upgradePlan?: string | null;
};

export type StreamErrorOutcome = {
  error: string;
  /** The student's message text to offer a "resend" action for, or null when
   * nothing needs resending. */
  retryableContent: string | null;
};

/**
 * Decides the error/resend state for a streamed tutor turn that ended in a
 * `type:"error"` NDJSON event (see /api/tutor/[conversationId]/messages).
 * Pure and DOM-free so it's unit-testable — this project's vitest setup runs
 * `.test.ts` modules only (no jsdom/RTL), so TutorChat's actual rendering is
 * verified manually instead (see AGENTS.md §17).
 *
 * The rule: if the student already saw some reply text before the error
 * arrived (a mid-stream drop, or a "persist_failed" after a fully generated
 * reply), keep that text on screen and show a soft warning with no resend —
 * resending would just duplicate what's already there. Only offer a resend
 * when nothing reached the screen at all (e.g. a quota/limit rejection before
 * generation started).
 */
export function resolveStreamErrorOutcome(
  event: StreamErrorEvent,
  hadVisibleText: boolean,
  attemptedContent: string,
): StreamErrorOutcome {
  return {
    error: event.error,
    retryableContent: hadVisibleText ? null : attemptedContent,
  };
}
