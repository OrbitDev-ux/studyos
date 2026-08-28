"use client";

import { AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { I18nProvider, useI18n } from "@/features/i18n/provider";
import type { Locale } from "@/features/i18n/config";
import type { Messages } from "@/features/i18n/messages";
import { formatRelativeTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type {
  CheckReason,
  HealthStatus,
  ServiceCategory,
  ServiceHealth,
  SystemHealthSnapshot,
} from "@/features/admin/status";

const AUTO_REFRESH_MS = 30_000;
const TICK_MS = 1_000;

const SERVICE_NAME_KEY: Record<string, keyof Messages["status"]> = {
  web: "serviceWeb",
  database: "serviceDatabase",
  auth: "serviceAuth",
  ai: "serviceAi",
};

const CATEGORY_KEY: Record<ServiceCategory, keyof Messages["status"]> = {
  core: "categoryCore",
  ai: "categoryAi",
  infrastructure: "categoryInfrastructure",
};

const REASON_KEY: Record<CheckReason, keyof Messages["status"]> = {
  ok: "reasonOk",
  slow: "reasonSlow",
  timeout: "reasonTimeout",
  not_configured: "reasonNotConfigured",
  disabled: "reasonDisabled",
  query_failed: "reasonQueryFailed",
  unreachable: "reasonUnreachable",
  unexpected_error: "reasonUnexpectedError",
};

const STATUS_KEY: Record<HealthStatus, keyof Messages["status"]> = {
  OPERATIONAL: "statusOperational",
  DEGRADED: "statusDegraded",
  DOWN: "statusDown",
  UNKNOWN: "statusUnknown",
};

const STATUS_BADGE_VARIANT: Record<HealthStatus, "success" | "warning" | "destructive" | "outline"> =
  {
    OPERATIONAL: "success",
    DEGRADED: "warning",
    DOWN: "destructive",
    UNKNOWN: "outline",
  };

const STATUS_ICON: Record<HealthStatus, typeof CheckCircle2> = {
  OPERATIONAL: CheckCircle2,
  DEGRADED: AlertTriangle,
  DOWN: XCircle,
  UNKNOWN: HelpCircle,
};

const OVERALL_BANNER_KEY: Record<HealthStatus, keyof Messages["status"]> = {
  OPERATIONAL: "overallOperational",
  DEGRADED: "overallDegraded",
  DOWN: "overallDown",
  UNKNOWN: "overallUnknown",
};

const OVERALL_BANNER_TONE: Record<HealthStatus, string> = {
  OPERATIONAL: "border-success/30 bg-success/10 text-success",
  DEGRADED: "border-warning/30 bg-warning/15 text-warning-foreground",
  DOWN: "border-destructive/30 bg-destructive/10 text-destructive",
  UNKNOWN: "border-border bg-muted text-muted-foreground",
};

/** Server-rendered wrapper: seeds the client dashboard with the already-
 * fetched initial snapshot (no loading flash on first paint) and provides
 * its own local I18nProvider — AdminLayout doesn't mount one app-wide (every
 * other admin page is hardcoded Korean), so this stays self-contained rather
 * than changing the shared layout for every admin page. */
export function StatusDashboard({
  initial,
  locale,
}: {
  initial: SystemHealthSnapshot;
  locale: Locale;
}) {
  return (
    <I18nProvider locale={locale}>
      <StatusDashboardInner initial={initial} />
    </I18nProvider>
  );
}

function StatusDashboardInner({ initial }: { initial: SystemHealthSnapshot }) {
  const { messages: allMessages, locale } = useI18n();
  const t = allMessages.status;
  const [snapshot, setSnapshot] = useState(initial);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [, setTick] = useState(0); // forces a re-render so relative times stay fresh
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/system/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data: SystemHealthSnapshot = await res.json();
      setSnapshot(data);
      setRefreshFailed(false);
    } catch {
      // Keep showing the last good `snapshot` (§24) — only surface a
      // non-blocking retry affordance, never blank the dashboard.
      setRefreshFailed(true);
    } finally {
      setIsRefreshing(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let autoRefresh: ReturnType<typeof setInterval> | null = null;
    let tick: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (autoRefresh) return;
      autoRefresh = setInterval(() => void refresh(), AUTO_REFRESH_MS);
      tick = setInterval(() => setTick((n) => n + 1), TICK_MS);
    }
    function stop() {
      if (autoRefresh) clearInterval(autoRefresh);
      if (tick) clearInterval(tick);
      autoRefresh = null;
      tick = null;
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refresh(); // catch up immediately on returning to the tab
        start();
      } else {
        stop(); // no point polling a backgrounded tab (§15)
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const byCategory = new Map<ServiceCategory, ServiceHealth[]>();
  for (const service of snapshot.services) {
    const list = byCategory.get(service.category) ?? [];
    list.push(service);
    byCategory.set(service.category, list);
  }
  const categoryOrder: ServiceCategory[] = ["core", "ai", "infrastructure"];

  return (
    <div className="flex flex-col gap-4">
      <Card className={cn("border", OVERALL_BANNER_TONE[snapshot.overall.status])}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold" aria-live="polite">
              {t[OVERALL_BANNER_KEY[snapshot.overall.status]]}
            </h2>
            <p className="text-sm opacity-80">
              {t.lastChecked}: {formatRelativeTime(new Date(snapshot.overall.checkedAt), locale)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? t.refreshing : t.refresh}
          </Button>
        </CardContent>
      </Card>

      {refreshFailed && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center justify-between gap-3 rounded-md border px-4 py-2 text-sm">
          <span>{t.errorTitle}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            {t.retry}
          </Button>
        </div>
      )}

      {categoryOrder.map((category) => {
        const services = byCategory.get(category);
        if (!services || services.length === 0) return null;
        return (
          <div key={category} className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              {t[CATEGORY_KEY[category]]}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard key={service.id} service={service} t={t} locale={locale} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ServiceCard({
  service,
  t,
  locale,
}: {
  service: ServiceHealth;
  t: Messages["status"];
  locale: Locale;
}) {
  const Icon = STATUS_ICON[service.status];
  const nameKey = SERVICE_NAME_KEY[service.id];
  const name = nameKey ? t[nameKey] : service.id;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
        <Badge variant={STATUS_BADGE_VARIANT[service.status]} className="gap-1">
          <Icon aria-hidden className="size-3" />
          {t[STATUS_KEY[service.status]]}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <p className="text-muted-foreground">{t[REASON_KEY[service.reason]]}</p>
        <p className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{t.latencyLabel}</span>
          <span className="tabular-nums">{`${service.latencyMs}ms`}</span>
        </p>
        <p className="text-muted-foreground flex items-center justify-between text-xs">
          <span>{t.lastChecked}</span>
          <span>{formatRelativeTime(new Date(service.checkedAt), locale)}</span>
        </p>
      </CardContent>
    </Card>
  );
}
