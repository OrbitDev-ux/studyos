"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingList } from "@/features/ranking/components/ranking-list";
import { SchoolSettingsForm } from "@/features/ranking/components/school-settings-form";
import type { RankingEntry } from "@/features/ranking/queries";
import { useI18n } from "@/features/i18n/provider";

type Scope = "global" | "friends" | "school" | "season";
type FriendPeriod = "all" | "today" | "week";

export function RankingTabs({
  currentUserId,
  global,
  friends,
  friendsToday,
  friendsWeek,
  school,
  season,
}: {
  currentUserId: string;
  global: RankingEntry[];
  friends: RankingEntry[];
  friendsToday: RankingEntry[];
  friendsWeek: RankingEntry[];
  school: RankingEntry[] | null;
  season: RankingEntry[];
}) {
  const [scope, setScope] = useState<Scope>("global");
  const [friendPeriod, setFriendPeriod] = useState<FriendPeriod>("all");
  const { messages, locale } = useI18n();
  const t = messages.ranking;

  const friendEntries =
    friendPeriod === "today"
      ? friendsToday
      : friendPeriod === "week"
        ? friendsWeek
        : friends;

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={scope} onValueChange={(value) => setScope(value as Scope)}>
        <TabsList>
          <TabsTrigger value="global">{t.tabGlobal}</TabsTrigger>
          <TabsTrigger value="friends">{t.tabFriends}</TabsTrigger>
          <TabsTrigger value="school">{t.tabSchool}</TabsTrigger>
          <TabsTrigger value="season">{t.tabSeason}</TabsTrigger>
        </TabsList>
      </Tabs>

      {scope === "global" && (
        <RankingList
          entries={global}
          currentUserId={currentUserId}
          emptyMessage={t.emptyDefault}
          noNameLabel={t.noName}
          locale={locale}
        />
      )}
      {scope === "friends" && (
        <div className="flex flex-col gap-3">
          <Tabs
            value={friendPeriod}
            onValueChange={(value) => setFriendPeriod(value as FriendPeriod)}
          >
            <TabsList>
              <TabsTrigger value="all">{t.periodAll}</TabsTrigger>
              <TabsTrigger value="today">{t.periodToday}</TabsTrigger>
              <TabsTrigger value="week">{t.periodWeek}</TabsTrigger>
            </TabsList>
          </Tabs>
          <RankingList
            entries={friendEntries}
            currentUserId={currentUserId}
            emptyMessage={t.emptyFriends}
            noNameLabel={t.noName}
            locale={locale}
          />
        </div>
      )}
      {scope === "school" &&
        (school === null ? (
          <SchoolSettingsForm />
        ) : (
          <RankingList
            entries={school}
            currentUserId={currentUserId}
            emptyMessage={t.emptySchool}
            noNameLabel={t.noName}
            locale={locale}
          />
        ))}
      {scope === "season" && (
        <RankingList
          entries={season}
          currentUserId={currentUserId}
          emptyMessage={t.emptySeason}
          noNameLabel={t.noName}
          locale={locale}
        />
      )}
    </div>
  );
}
