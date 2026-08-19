export const ACCOUNT_DELETION_CONFIRMATION = "DELETE";

export function isAccountDeletionConfirmation(value: string): boolean {
  return value.trim() === ACCOUNT_DELETION_CONFIRMATION;
}
