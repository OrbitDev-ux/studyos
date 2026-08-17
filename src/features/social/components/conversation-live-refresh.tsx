"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 4000;

/**
 * Keeps an open DM thread reasonably live without adding a new realtime
 * transport. Two jobs:
 *
 * 1. One-time refresh on mount — opening a conversation marks it read on the
 *    server, but the sidebar unread badge lives in the (app) layout, which
 *    client-side navigation between sibling pages doesn't re-run.
 * 2. Polling — DM threads had no way to see a message that arrived while the
 *    other participant already had the thread open (Product Audit: "채팅인데
 *    새로고침해야 메시지가 나타나는 상태"). Rather than stand up websockets/
 *    Supabase Realtime for this, `router.refresh()` (re-runs the page's
 *    Server Component, re-fetching getConversation()) every 4s while the tab
 *    is visible is the smallest fix that actually closes the gap. Paused
 *    while the tab is hidden so a backgrounded chat doesn't poll forever.
 */
export function ConversationLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
