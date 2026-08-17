import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER-ONLY. Bypasses Row Level Security
 * entirely, same trust level as Prisma's DATABASE_URL connection. NEVER
 * import this from a Client Component and never expose
 * SUPABASE_SERVICE_ROLE_KEY via a NEXT_PUBLIC_ variable.
 *
 * Used only for Supabase Storage (features/study-materials/storage.ts) — all
 * other privileged reads/writes in this app go through Prisma, this app's
 * normal privileged-DB path. requireCurrentUser() + ownerId checks in the
 * calling Server Action are the real authorization gate; this client itself
 * enforces nothing.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
