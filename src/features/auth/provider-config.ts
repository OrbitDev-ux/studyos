export function isGoogleOAuthConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.AUTH_GOOGLE_ID?.trim() && env.AUTH_GOOGLE_SECRET?.trim());
}
