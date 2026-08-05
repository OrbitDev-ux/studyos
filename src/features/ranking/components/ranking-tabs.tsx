"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingList } from "@/features/ranking/components/ranking-list";
import { SchoolSettingsForm } from "@/features/ranking/components/school-settings-form";
import type { RankingEntry } from "@/features/ranking/queries";

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

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={scope} onValueChange={(value) => setScope(value as Scope)}>
        <TabsList>
          <TabsTrigger value="global">전체</TabsTrigger>
          <TabsTrigger value="friends">친구</TabsTrigger>
          <TabsTrigger value="school">학교</TabsTrigger>
          <TabsTrigger value="season">시즌</TabsTrigger>
        </TabsList>
      </Tabs>

      {scope === "global" && (
        <RankingList entries={global} currentUserId={currentUserId} />
      )}
      {scope === "friends" && (
        <RankingList
          entries={friends}
          currentUserId={currentUserId}
          emptyMessage="친구를 추가하고 함께 공부시간을 비교해보세요."
        />
      )}
      {scope === "school" &&
        (school === null ? (
          <SchoolSettingsForm />
        ) : (
          <RankingList
            entries={school}
            currentUserId={currentUserId}
            emptyMessage="같은 학교 친구가 아직 없어요."
          />
        ))}
      {scope === "season" && (
        <RankingList
          entries={season}
          currentUserId={currentUserId}
          emptyMessage="이번 달 공부 기록이 아직 없어요."
        />
      )}
    </div>
  );
}
