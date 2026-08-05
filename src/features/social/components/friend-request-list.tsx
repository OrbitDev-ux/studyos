"use client";

import { useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarImage
                    src={request.requester.image ?? undefined}
                    alt={request.requester.name ?? ""}
                  />
                  <AvatarFallback>
                    {(request.requester.name ?? request.requester.email).at(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {request.requester.name ?? request.requester.email}
                </span>
              </div>
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
