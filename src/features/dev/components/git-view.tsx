"use client";

import { GitBranch, GitCommitHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  commitWorkspaceChanges,
  getWorkspaceGitDiff,
  getWorkspaceGitLog,
  getWorkspaceGitStatus,
  gitAddWorkspaceFiles,
  type GitCommit,
  type GitStatus,
} from "@/features/dev/runtime-actions";
import { useI18n } from "@/features/i18n/provider";

/** `/dev/git` — real `git status`/`diff`/`log`/`add`/`commit` inside the
 * container's `/workspace` (§26). */
export function GitView() {
  const { messages } = useI18n();
  const t = messages.dev;
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [diffPath, setDiffPath] = useState<string | null>(null);
  const [diff, setDiff] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    const [s, l] = await Promise.all([getWorkspaceGitStatus(), getWorkspaceGitLog()]);
    if (s.error) setError(s.error);
    if (s.status) setStatus(s.status);
    if (l.commits) setCommits(l.commits);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function viewDiff(path: string) {
    setDiffPath(path);
    const res = await getWorkspaceGitDiff(path);
    setDiff(res.diff ?? "");
  }

  async function commitAll() {
    if (!status?.files?.length || !message.trim()) return;
    setPending(true);
    setError(null);
    const addRes = await gitAddWorkspaceFiles(status.files.map((f) => f.path));
    if (addRes.error) {
      setError(addRes.error);
      setPending(false);
      return;
    }
    const commitRes = await commitWorkspaceChanges(message);
    setPending(false);
    if (commitRes.error) {
      setError(commitRes.error);
      return;
    }
    setMessage("");
    void refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 font-mono text-xl font-semibold tracking-tight">
        <GitBranch className="size-5" /> {t.gitTitle}
      </h1>
      {error && <p className="text-destructive text-xs">{error}</p>}

      {status && !status.isRepo ? (
        <p className="text-muted-foreground text-sm">{t.gitNoRepo}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-3 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t.gitChanges}</p>
                {status?.branch && <Badge variant="outline">{status.branch}</Badge>}
              </div>
              {!status?.files?.length ? (
                <p className="text-muted-foreground text-sm">{t.gitNoChanges}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {status.files.map((f) => (
                    <li key={f.path}>
                      <button
                        type="button"
                        onClick={() => viewDiff(f.path)}
                        className="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1 text-left font-mono text-xs"
                      >
                        <span className="text-muted-foreground w-6 shrink-0">{f.status}</span>
                        <span className="truncate">{f.path}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.gitCommitPlaceholder}
                rows={2}
              />
              <Button
                type="button"
                size="sm"
                className="gap-1.5 self-end"
                disabled={pending || !status?.files?.length || !message.trim()}
                onClick={commitAll}
              >
                <GitCommitHorizontal className="size-4" /> {t.gitAddAndCommit}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 py-4">
              <p className="text-sm font-medium">{diffPath ? diffPath : t.gitLog}</p>
              {diffPath ? (
                <pre className="bg-muted max-h-72 overflow-auto rounded p-2 font-mono text-xs whitespace-pre-wrap">
                  {diff || "…"}
                </pre>
              ) : (
                <ul className="flex flex-col gap-2">
                  {commits.map((c) => (
                    <li key={c.hash} className="text-xs">
                      <span className="text-muted-foreground font-mono">{c.hash}</span>{" "}
                      <span>{c.message}</span>
                      <span className="text-muted-foreground"> — {c.author}, {c.date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
