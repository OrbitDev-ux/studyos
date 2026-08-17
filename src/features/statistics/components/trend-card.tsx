"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TrendBarChart } from "@/features/statistics/components/trend-bar-chart";
import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";

export function TrendCard({
  trend7,
  trend30,
  t,
  locale,
}: {
  trend7: { date: string; seconds: number }[];
  trend30: { date: string; seconds: number }[];
  t: Messages["stats"];
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.trendTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Tabs defaultValue="7">
            <TabsList>
              <TabsTrigger value="7">{t.trend7d}</TabsTrigger>
              <TabsTrigger value="30">{t.trend30d}</TabsTrigger>
            </TabsList>
            <TabsContent value="7" className="pt-4">
              <TrendBarChart data={trend7} locale={locale} />
            </TabsContent>
            <TabsContent value="30" className="pt-4">
              <TrendBarChart data={trend30} locale={locale} />
            </TabsContent>
          </Tabs>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
