"use client";

import { useEffect } from "react";
import { markTicketRead } from "@/features/support/actions";

/** Marks the ticket as read once when the detail view mounts, clearing the
 * "새 답변" notification. Owner-scoped server-side. Renders nothing. */
export function TicketReadMarker({ ticketId }: { ticketId: string }) {
  useEffect(() => {
    void markTicketRead(ticketId);
  }, [ticketId]);
  return null;
}
