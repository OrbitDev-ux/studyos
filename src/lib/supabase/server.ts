import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase client for Server Components and Server Actions. Cookie-aware
 * per Supabase's documented pattern, but this app authenticates through
 * Auth.js (not Supabase Auth) — no Supabase auth cookie is ever set, so
 * `setAll` here never actually has anything to write yet. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component that can't set cookies —
            // safe to ignore since Auth.js's middleware handles the
            // session this app actually relies on.
          }
        },
      },
    },
  );
}
