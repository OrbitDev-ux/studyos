"use client";

import { ArrowLeft, Command, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { allDevNavItems } from "@/features/dev/nav";
import { useI18n } from "@/features/i18n/provider";
import { cn } from "@/lib/utils";

type Row = { key: string; label: string; icon: LucideIcon; href: string };

/**
 * VS Code-style command palette for Study OS Dev (§27). Same Dialog+Input
 * pattern as the main app's SearchDialog — no cmdk dependency added. Commands
 * are navigation only (Open IDE/Terminal/Files/...); "Stop Process",
 * "Rebuild Container" etc. are intentionally NOT listed because they need the
 * (not-yet-connected) container backend — listing a command that silently
 * does nothing would be dishonest.
 */
export function DevCommandPalette() {
  const router = useRouter();
  const { messages } = useI18n();
  const t = messages.dev;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (mod && e.key === "`") {
        e.preventDefault();
        router.push("/dev/terminal");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const rows = useMemo<Row[]>(() => {
    const navRows: Row[] = allDevNavItems.map((item) => ({
      key: item.href,
      label: t[item.key],
      icon: item.icon,
      href: item.href,
    }));
    const backRow: Row = { key: "back", label: t.backToStudyOS, icon: ArrowLeft, href: "/dashboard" };
    const q = query.trim().toLowerCase();
    return [...navRows, backRow].filter((r) => !q || r.label.toLowerCase().includes(q));
  }, [query, t]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (row) go(row.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.palettePlaceholder}
        className="text-muted-foreground hover:bg-muted flex h-9 items-center gap-2 rounded-lg border px-2.5 font-mono text-sm transition-colors"
      >
        <Command className="size-4 shrink-0" />
        <kbd className="bg-muted text-muted-foreground pointer-events-none hidden rounded border px-1.5 py-0.5 text-[0.65rem] font-medium sm:inline">
          ⌘⇧P
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-24 translate-y-0 gap-0 p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">{t.palettePlaceholder}</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <Command className="text-muted-foreground size-4 shrink-0" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={t.palettePlaceholder}
              className="h-12 border-0 px-0 font-mono shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {rows.length === 0 ? (
              <p className="text-muted-foreground px-3 py-6 text-center text-sm">{t.paletteEmpty}</p>
            ) : (
              <div>
                <p className="text-muted-foreground px-3 pt-2 pb-1 text-xs font-medium">
                  {t.paletteGroupNavigate}
                </p>
                <ul>
                  {rows.map((row, i) => (
                    <li key={row.key}>
                      <button
                        type="button"
                        onClick={() => go(row.href)}
                        onMouseMove={() => setActive(i)}
                        aria-current={i === active}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left font-mono text-sm transition-colors",
                          i === active ? "bg-muted" : "hover:bg-muted/60",
                        )}
                      >
                        <row.icon className="text-muted-foreground size-4 shrink-0" />
                        <span className="flex-1 truncate">{row.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
