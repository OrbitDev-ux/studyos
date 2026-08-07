"use client";

// Self-contained toast system (no external toast library). A context holds the
// active toasts; useToast().toast(...) pushes one; the Toaster renders the
// stack fixed to the bottom-right and auto-dismisses each after a timeout.
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [
        ...prev,
        {
          id,
          title: input.title,
          description: input.description,
          variant: input.variant ?? "default",
        },
      ]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

const VARIANT_ICON = {
  default: Info,
  success: CheckCircle2,
  error: TriangleAlert,
} as const;

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "text-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-destructive",
};

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed right-4 bottom-4 z-100 flex w-full max-w-sm flex-col gap-2"
      role="region"
      aria-label="알림"
    >
      {toasts.map((t) => {
        const Icon = VARIANT_ICON[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className="bg-card ring-foreground/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 pointer-events-auto flex items-start gap-3 rounded-lg p-3 shadow-lg ring-1 duration-300"
            data-state="open"
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", VARIANT_STYLES[t.variant])} />
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && (
                <p className="text-muted-foreground text-xs">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
              aria-label="닫기"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
