"use client";

import { HelpCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resetTutorial } from "@/features/onboarding/actions";
import { OnboardingTour } from "@/features/onboarding/components/onboarding-tour";

/**
 * Owns the onboarding tour lifecycle on the dashboard: auto-starts it once for
 * new users (needsTutorial) and exposes a "튜토리얼 다시 보기" control to replay
 * it any time. Replaying re-arms server state (resetTutorial) so an interrupted
 * replay still shows next session, then remounts the tour fresh via `key`.
 */
export function OnboardingLauncher({
  needsTutorial,
  isGuest,
}: {
  needsTutorial: boolean;
  isGuest: boolean;
}) {
  const [runId, setRunId] = useState(needsTutorial ? 1 : 0);
  const [, startReset] = useTransition();

  function replay() {
    startReset(() => {
      void resetTutorial();
    });
    setRunId((n) => n + 1);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground gap-1.5"
        onClick={replay}
      >
        <HelpCircle className="size-4" />
        튜토리얼 다시 보기
      </Button>
      {runId > 0 && <OnboardingTour key={runId} initialOpen isGuest={isGuest} />}
    </>
  );
}
