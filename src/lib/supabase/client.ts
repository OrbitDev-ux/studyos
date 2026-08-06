import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for Client Components. Not used by any DB CRUD yet —
 * every read/write in this app currently runs through Server Actions. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
