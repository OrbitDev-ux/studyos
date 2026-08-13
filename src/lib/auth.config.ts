import type { NextAuthConfig } from "next-auth";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin/session";
import { getMaintenanceEdge } from "@/lib/maintenance-edge";

const PROTECTED_PATHS = [
  "/dashboard",
  "/todos",
  "/subjects",
  "/stats",
  "/problems",
  "/study-books",
  "/review",
  "/mock-exam",
  "/social",
  "/ranking",
  "/battle",
  "/support",
  "/tutor",
  "/settings",
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

      // Maintenance gate — runs before all other routing. The admin area, the
      // admin login, and the maintenance page itself are always reachable so a
      // super admin can toggle it back off. A valid admin session bypasses it;
      // everyone else is sent to /maintenance while it's on.
      const isAdminArea =
        pathname === "/admin" ||
        pathname.startsWith("/admin/") ||
        pathname === "/admin-auth";
      if (!isAdminArea && pathname !== "/maintenance") {
        const maintenance = await getMaintenanceEdge();
        if (maintenance.enabled) {
          const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
          const adminValid = await verifyAdminSessionToken(adminToken);
          if (!adminValid) {
            return Response.redirect(new URL("/maintenance", request.nextUrl));
          }
        }
      }

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
