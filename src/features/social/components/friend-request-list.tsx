"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import { respondToFriendRequest } from "@/features/social/actions";
import type { getReceivedFriendRequests } from "@/features/social/queries";

export function FriendRequestList({
  requests,
}: {
  requests: Awaited<ReturnType<typeof getReceivedFriendRequests>>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>받은 친구 요청</CardTitle>
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
                  수락
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
                  거절
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
