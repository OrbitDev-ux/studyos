import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase's standard session-refresh helper, kept for structural parity
 * with their documented client/server/middleware layout — NOT wired into
 * src/middleware.ts. This app's actual auth guard is Auth.js
 * (lib/auth.config.ts), which owns the session cookie; there is no
 * Supabase Auth session for this to refresh. Only relevant if a later
 * step introduces Postgres RLS policies keyed on Supabase auth.uid().
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}
