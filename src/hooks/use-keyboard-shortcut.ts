import { useEffect, useRef } from "react";

export type KeyCombo = {
  /** Match KeyboardEvent.key, case-insensitive (e.g. "a"). Ignored when `code` is set. */
  key?: string;
  /** Match the physical key via KeyboardEvent.code (e.g. "Digit1"). Prefer this
   * for combos involving Alt/Option on macOS, where Option rewrites event.key
   * (Option+1 → "¡") but event.code stays "Digit1". */
  code?: string;
  /** Command (⌘) on macOS / Windows key elsewhere — KeyboardEvent.metaKey. */
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type KeyboardShortcutOptions = {
  /** Turn the listener on/off without unmounting. Defaults to true. */
  enabled?: boolean;
  /** Ignore the shortcut while the user is typing in a field. Defaults to true. */
  ignoreWhenTyping?: boolean;
};

/** True when focus is in a text-entry context we shouldn't hijack. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
  );
}

/**
 * Fire `handler` when a specific key combination is pressed anywhere in the
 * window. Reusable and modifier-exact — it only triggers when the pressed
 * modifiers match the combo exactly, so it won't collide with richer chords.
 *
 * The handler is kept in a ref so the window listener is attached once per
 * combo/option change (never re-bound on every render) and never goes stale,
 * and it's always removed on unmount — no leaked listeners.
 */
export function useKeyboardShortcut(
  combo: KeyCombo,
  handler: (event: KeyboardEvent) => void,
  options: KeyboardShortcutOptions = {},
): void {
  const { enabled = true, ignoreWhenTyping = true } = options;
  // Destructure to primitives so the effect re-binds on real value changes,
  // not on a new combo/options object identity each render.
  const { key, code, meta = false, ctrl = false, shift = false, alt = false } = combo;
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    function onKeyDown(event: KeyboardEvent) {
      if (ignoreWhenTyping && isTypingTarget(event.target)) return;
      const keyMatch = code
        ? event.code === code
        : key
          ? event.key.toLowerCase() === key.toLowerCase()
          : false;
      const hit =
        keyMatch &&
        event.metaKey === meta &&
        event.ctrlKey === ctrl &&
        event.shiftKey === shift &&
        event.altKey === alt;
      if (!hit) return;
      event.preventDefault();
      handlerRef.current(event);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, code, meta, ctrl, shift, alt, enabled, ignoreWhenTyping]);
}
