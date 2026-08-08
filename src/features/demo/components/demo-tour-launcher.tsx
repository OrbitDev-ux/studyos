"use client";

import { useEffect, useState } from "react";
import { OnboardingTour } from "@/features/onboarding/components/onboarding-tour";
import { DEMO_STEPS } from "@/features/demo/steps";

const SEEN_KEY = "studyos-demo-tour-seen-v1";
/** Custom event any demo page can dispatch to replay the tour. */
export const DEMO_TOUR_EVENT = "studyos-demo:replay-tour";

/**
 * Auto-starts the demo tour once per tab (sessionStorage flag) and listens for a
 * replay event ("둘러보기 다시 보기"). Completion is client-only — no server call.
 */
export function DemoTourLauncher() {
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // ignore
    }
    if (!seen) setRunId(1);

    const replay = () => setRunId((n) => n + 1);
    window.addEventListener(DEMO_TOUR_EVENT, replay);
    return () => window.removeEventListener(DEMO_TOUR_EVENT, replay);
  }, []);

  function markSeen() {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (runId === 0) return null;
  return (
    <OnboardingTour
      key={runId}
      initialOpen
      steps={DEMO_STEPS}
      onComplete={markSeen}
    />
  );
}
