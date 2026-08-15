"use client";

import "@xterm/xterm/css/xterm.css";
import { Terminal as TerminalIcon, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getTerminalConnection } from "@/features/dev/runtime-actions";
import { useI18n } from "@/features/i18n/provider";

type ConnState = "connecting" | "connected" | "disconnected" | "error";

/**
 * The real terminal (§13/§14) — xterm.js (a well-established, existing
 * terminal emulator library; §14 explicitly asks NOT to hand-roll one) piped
 * over a WebSocket straight to the Dev Runtime Backend's PTY session. No
 * command parsing happens here or on StudyOS Web — every keystroke goes to
 * real bash inside the user's container.
 */
export function TerminalView({ title }: { title: string }) {
  const { messages } = useI18n();
  const t = messages.dev;
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const disposeRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<ConnState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState("connecting");
    setError(null);

    async function connect() {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (cancelled || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: 13,
        theme: { background: "#0b0b0f" },
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      const conn = await getTerminalConnection();
      if (cancelled) return;
      if (conn.error || !conn.wsUrl) {
        setError(conn.error ?? t.backendUnavailableDesc);
        setState("error");
        term.dispose();
        return;
      }

      const ws = new WebSocket(`${conn.wsUrl}?token=${encodeURIComponent(conn.token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        setState("connected");
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "data") term.write(msg.data);
        else if (msg.type === "error") {
          setError(msg.message);
          setState("error");
        } else if (msg.type === "exit") {
          setState("disconnected");
        }
      };
      ws.onclose = () => {
        if (!cancelled) setState((prev) => (prev === "error" ? prev : "disconnected"));
      };
      ws.onerror = () => {
        if (!cancelled) setState("error");
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input", data }));
      });

      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        }
      });
      resizeObserver.observe(containerRef.current);

      disposeRef.current = () => {
        resizeObserver.disconnect();
        term.dispose();
        ws.close();
      };
    }

    void connect();
    return () => {
      cancelled = true;
      disposeRef.current?.();
      disposeRef.current = null;
      wsRef.current = null;
    };
  }, [reconnectKey, t.backendUnavailableDesc]);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-mono text-xl font-semibold tracking-tight">
          <TerminalIcon className="size-5" /> {title}
        </h1>
        <div className="flex items-center gap-2">
          <StatusDot state={state} label={statusLabel(state, t)} />
          {(state === "disconnected" || state === "error") && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setReconnectKey((k) => k + 1)}
            >
              <RotateCw className="size-3.5" /> {t.reconnect}
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-[#0b0b0f] p-2">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}

function statusLabel(state: ConnState, t: { statusOnline: string; statusOffline: string }): string {
  if (state === "connected") return t.statusOnline;
  return t.statusOffline;
}

function StatusDot({ state, label }: { state: ConnState; label: string }) {
  const color =
    state === "connected" ? "bg-success" : state === "connecting" ? "bg-warning" : "bg-destructive";
  return (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <span className={`size-2 rounded-full ${color}`} aria-hidden />
      {label}
    </span>
  );
}
