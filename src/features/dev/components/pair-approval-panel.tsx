"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Laptop, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { approvePairing, denyPairing, getPendingPairing } from "@/features/dev/agent-actions";

/**
 * §5 — "Connect this computer? Device: MacBook [Allow] [Cancel]". The user
 * types (or arrives via a link with) the short code their Local Agent's CLI
 * printed; this looks it up, shows what device is asking, and only creates
 * the DevAgentDevice row on an explicit Allow click.
 */
export function PairApprovalPanel({ initialCode }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");
  const [pending, setPending] = useState<{ deviceName: string; platform: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"allowed" | "denied" | null>(null);

  async function lookup() {
    setError(null);
    setDone(null);
    setBusy(true);
    const res = await getPendingPairing(code);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      setPending(null);
      return;
    }
    setPending({ deviceName: res.deviceName, platform: res.platform });
  }

  async function allow() {
    setBusy(true);
    const res = await approvePairing(code);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone("allowed");
    router.refresh();
  }

  async function deny() {
    setBusy(true);
    await denyPairing(code);
    setBusy(false);
    setDone("denied");
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="flex items-center gap-2 font-mono text-xl font-semibold tracking-tight">
        <Laptop className="size-5" /> Pair a computer
      </h1>
      <Card>
        <CardContent className="flex flex-col gap-4 py-6">
          <p className="text-muted-foreground text-sm">
            On the computer you want to connect, run <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">studyos-dev login</code> and
            enter the code it prints here.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && code.trim().length >= 6 && lookup()}
              placeholder="WXPK-7RTN"
              disabled={busy}
              autoFocus
              className="w-40 font-mono uppercase"
            />
            <Button type="button" size="sm" disabled={busy || code.trim().length < 6} onClick={lookup}>
              Look up
            </Button>
          </div>

          {error && <p className="text-destructive text-xs">{error}</p>}

          {done === "allowed" && (
            <p className="text-success flex items-center gap-1.5 text-sm">
              <ShieldCheck className="size-4" /> Paired. Return to /dev to select a workspace.
            </p>
          )}
          {done === "denied" && <p className="text-muted-foreground text-sm">Request denied.</p>}

          {pending && !done && (
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Connect this computer?</p>
                <p className="text-muted-foreground text-sm">
                  Device: {pending.deviceName}
                  {pending.platform ? ` (${pending.platform})` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={allow}>
                  Allow
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={deny}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
