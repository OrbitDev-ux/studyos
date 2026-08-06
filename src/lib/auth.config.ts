import type { NextAuthConfig } from "next-auth";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin/session";

const PROTECTED_PATHS = [
  "/dashboard",
  "/todos",
  "/subjects",
  "/stats",
  "/problems",
  "/review",
  "/mock-exam",
  "/social",
  "/ranking",
  "/battle",
];

// Edge-safe subset of the Auth.js config: no adapter, no providers that
// touch Node.js-only APIs. This is what middleware runs on the Edge runtime.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    // Separate from the Auth.js user-session gate below: /admin/* uses its
    // own passphrase-based session (ADMIN_SESSION_COOKIE), checked first so
    // it never falls through to the user-session redirect logic.
    async authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
        const valid = await verifyAdminSessionToken(token);
        return valid ? true : Response.redirect(new URL("/", request.nextUrl));
      }

      const isLoggedIn = !!auth?.user;
      const isProtectedPath = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

      if (isProtectedPath && !isLoggedIn) {
        return Response.redirect(new URL("/login", request.nextUrl));
      }

      if ((pathname === "/login" || pathname === "/signup") && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
