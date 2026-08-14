"use client";

import { GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MathText } from "@/components/ui/math-text";
import { createReviewTutorConversation } from "@/features/tutor/actions";

export type DueConcept = { wrongAnswerId: string; label: string; prompt: string };

/**
 * SRS→Tutor: today's due review concepts, each with a button that starts a
 * tutoring session for that concept (reuses createReviewTutorConversation →
 * the existing tutor conversation flow).
 */
export function ReviewWithTutorCard({
  concepts,
  sectionTitle,
  reviewWithTutorLabel,
}: {
  concepts: DueConcept[];
  sectionTitle: string;
  reviewWithTutorLabel: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function startReview(wrongAnswerId: string) {
    setPendingId(wrongAnswerId);
    startTransition(async () => {
      const res = await createReviewTutorConversation(wrongAnswerId);
      if (res.conversationId) {
        router.push(`/tutor/${res.conversationId}`);
      } else {
        setPendingId(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="size-4" /> 🔁 {sectionTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {concepts.map((c) => (
          <div
            key={c.wrongAnswerId}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{c.label}</p>
              <MathText className="text-muted-foreground block truncate text-xs">
                {c.prompt}
              </MathText>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={pendingId !== null}
              onClick={() => startReview(c.wrongAnswerId)}
            >
              {reviewWithTutorLabel}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
