"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingList } from "@/features/ranking/components/ranking-list";
import { SchoolSettingsForm } from "@/features/ranking/components/school-settings-form";
import type { RankingEntry } from "@/features/ranking/queries";
import { useI18n } from "@/features/i18n/provider";

type Scope = "global" | "friends" | "school" | "season";

export function RankingTabs({
  currentUserId,
  global,
  friends,
  school,
  season,
}: {
  currentUserId: string;
  global: RankingEntry[];
  friends: RankingEntry[];
  school: RankingEntry[] | null;
  season: RankingEntry[];
}) {
  const [scope, setScope] = useState<Scope>("global");
  const { messages, locale } = useI18n();
  const t = messages.ranking;

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
        <RankingList
          entries={friends}
          currentUserId={currentUserId}
          emptyMessage={t.emptyFriends}
          noNameLabel={t.noName}
          locale={locale}
        />
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
