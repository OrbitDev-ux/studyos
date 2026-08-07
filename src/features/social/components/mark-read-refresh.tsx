"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Opening a conversation marks it read on the server, but the sidebar badge is
 * computed in the (app) layout, which client-side navigation between sibling
 * pages does not re-run. A single refresh on mount re-fetches the layout so the
 * unread badge reflects the just-read thread.
 */
export function MarkReadRefresh() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}
