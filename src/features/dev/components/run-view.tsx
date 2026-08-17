"use client";

import { Play, RotateCw, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getWorkspaceProcessLogs,
  listWorkspaceProcesses,
  restartWorkspaceProcess,
  startWorkspaceProcess,
  stopWorkspaceProcess,
  type ProcessRecord,
} from "@/features/dev/runtime-actions";
import { useI18n } from "@/features/i18n/provider";

const QUICK_COMMANDS = [
  "npm run dev",
  "npm run build",
  "python3 main.py",
  "node index.js",
];
const POLL_MS = 4000; // §30 — refresh, but not aggressively

/** `/dev/run` — Process Manager (§20/§21): starts real commands inside the
 * container and tracks PID/status/logs, all via the Dev Runtime Backend. */
export function RunView() {
  const { messages } = useI18n();
  const t = messages.dev;
  const [command, setCommand] = useState("");
  const [processes, setProcesses] = useState<ProcessRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    const res = await listWorkspaceProcesses();
    if (res.processes) setProcesses(res.processes);
  }

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!expandedId) return;
    let cancelled = false;
    async function loadLogs() {
      const res = await getWorkspaceProcessLogs(expandedId!);
      if (!cancelled && res.logs !== undefined) setLogs(res.logs);
    }
    void loadLogs();
    const id = setInterval(loadLogs, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [expandedId]);

  async function run(cmd: string) {
    setError(null);
    setPending(true);
    const res = await startWorkspaceProcess(cmd);
    setPending(false);
    if (res.error) setError(res.error);
    else void refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-mono text-xl font-semibold tracking-tight">{t.runTitle}</h1>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_COMMANDS.map((cmd) => (
          <Button
            key={cmd}
            type="button"
            size="sm"
            variant="outline"
            className="font-mono"
            onClick={() => run(cmd)}
            disabled={pending}
          >
            {cmd}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && command.trim() && run(command)}
          placeholder={t.runCommandPlaceholder}
          className="font-mono"
        />
        <Button
          type="button"
          onClick={() => command.trim() && run(command)}
          disabled={pending}
          className="gap-1.5"
        >
          <Play className="size-4" /> {t.runStart}
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}

      {processes.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.runEmpty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {processes.map((proc) => (
            <Card key={proc.id}>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-medium">
                      {proc.command}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {proc.id.split(":")[1]}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusBadge status={proc.status} t={t} />
                    {proc.status === "RUNNING" ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.runStop}
                        onClick={() => stopWorkspaceProcess(proc.id).then(refresh)}
                      >
                        <Square className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.runRestart}
                        onClick={() => restartWorkspaceProcess(proc.id).then(refresh)}
                      >
                        <RotateCw className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setExpandedId((id) => (id === proc.id ? null : proc.id))
                      }
                    >
                      {t.runLogs}
                    </Button>
                  </div>
                </div>
                {expandedId === proc.id && (
                  <pre className="bg-muted max-h-48 overflow-auto rounded p-2 font-mono text-xs whitespace-pre-wrap">
                    {logs || "…"}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: ProcessRecord["status"];
  t: { statusRunning: string; statusStopped: string; runStatusFailed: string };
}) {
  const label =
    status === "RUNNING"
      ? t.statusRunning
      : status === "FAILED"
        ? t.runStatusFailed
        : t.statusStopped;
  const variant =
    status === "RUNNING" ? "default" : status === "FAILED" ? "destructive" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}
