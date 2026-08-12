import "server-only";

export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain-text body. May contain a one-time link — never logged in production. */
  text: string;
};

/**
 * Single email dispatch chokepoint for the whole app.
 *
 * No email provider is configured in this project yet. Rather than fabricate
 * delivery, this default adapter is a no-op that returns cleanly, so the calling
 * flows (password reset, …) stay real and secure end-to-end and a provider can
 * be dropped in here later without touching any caller.
 *
 * Integration point: read a provider env (e.g. RESEND_API_KEY) and send here.
 *
 * SECURITY: never logs the body in production (it can contain a one-time reset
 * token/link). In development only, it prints the body so the flow is testable
 * locally without a provider. Callers must still show the user only the generic,
 * enumeration-safe copy — never a delivery guarantee.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    // Dev-only convenience so a developer can follow the reset link locally.
    console.info(
      `\n[email:dev] to=${message.to}\nsubject=${message.subject}\n${message.text}\n`,
    );
    return;
  }
  // Production without a provider: record only non-sensitive metadata, then
  // return. (Wire a real provider above to actually deliver.)
  console.info(`[email] queued to=${message.to} subject=${JSON.stringify(message.subject)}`);
}
