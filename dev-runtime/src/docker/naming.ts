/**
 * Safe Docker resource names derived ONLY from the workspaceId (a cuid — no
 * user email/name/PII ever reaches Docker, §7). `workspaceId` is trusted
 * because every route that reaches these helpers already went through
 * service-token or capability-token auth tied to that id.
 */
export function containerNameFor(workspaceId: string): string {
  return `studyos-dev-${workspaceId}`;
}

export function volumeNameFor(workspaceId: string): string {
  return `studyos-dev-vol-${workspaceId}`;
}
