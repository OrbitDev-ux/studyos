/**
 * Adds one calendar month to `date`, clamping to the target month's last day
 * when the source day doesn't exist there (e.g. Jan 31 → Feb 28/29, never
 * rolling over to Mar 3 the way naive `setMonth` arithmetic would). Used to
 * compute a subscription's next renewal date from its last paid date.
 */
export function addOneMonthClamped(date: Date): Date {
  const day = date.getUTCDate();
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + 1);
  if (result.getUTCDate() !== day) {
    // Rolled into the month after the target (e.g. Jan 31 -> Mar 3) because
    // the target month is shorter — clamp back to its last day.
    result.setUTCDate(0);
  }
  return result;
}
