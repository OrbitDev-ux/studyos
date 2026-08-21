"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileNameplate } from "@/features/profile/components/profile-nameplate";
import { unblockUser } from "@/features/social/actions";
import type { getBlockedUsers } from "@/features/social/queries";
import { useI18n } from "@/features/i18n/provider";

export function BlockedUsersCard({
  blockedUsers,
}: {
  blockedUsers: Awaited<ReturnType<typeof getBlockedUsers>>;
}) {
  const [isPending, startTransition] = useTransition();
  const { messages } = useI18n();
  const t = messages.social;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.blockedUsersTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {blockedUsers.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t.blockedUsersEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {blockedUsers.map(({ id, blocked }) => (
              <li key={id} className="flex items-center justify-between gap-2">
                <ProfileNameplate
                  userId={blocked.id}
                  name={blocked.name}
                  image={blocked.image}
                  fallbackLabel={blocked.email}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => startTransition(() => unblockUser(blocked.id))}
                >
                  {t.unblock}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
