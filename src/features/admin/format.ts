const KST = "Asia/Seoul";

/** "YYYY-MM-DD HH:mm" in KST — the standard timestamp shown across admin tables. */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\. /g, "-")
    .replace(/\.$/, "");
}

/** Compact "방금 전 / N분 전 / N시간 전 / N일 전", falling back to a date. */
export function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatDateTime(date);
}
