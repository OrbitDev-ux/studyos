"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import { BlockUserButton } from "@/features/social/components/block-user-button";
import { respondToFriendRequest } from "@/features/social/actions";
import type { getReceivedFriendRequests } from "@/features/social/queries";
import { useI18n } from "@/features/i18n/provider";

export function FriendRequestList({
  requests,
}: {
  requests: Awaited<ReturnType<typeof getReceivedFriendRequests>>;
}) {
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();
  const t = messages.social;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.requestsTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <li key={request.id} className="flex items-center justify-between gap-2">
              <ProfileNameplate
                userId={request.requester.id}
                name={request.requester.name}
                image={request.requester.image}
                fallbackLabel={request.requester.email}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => respondToFriendRequest(request.id, true))
                  }
                >
                  {t.accept}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => respondToFriendRequest(request.id, false))
                  }
                >
                  {t.decline}
                </Button>
                <BlockUserButton targetUserId={request.requester.id} />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
