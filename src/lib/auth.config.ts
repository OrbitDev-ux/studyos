import type { NextAuthConfig } from "next-auth";

const PROTECTED_PATHS = ["/dashboard", "/todos", "/subjects", "/stats"];

// Edge-safe subset of the Auth.js config: no adapter, no providers that
// touch Node.js-only APIs. This is what middleware runs on the Edge runtime.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isProtectedPath = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

      if (isProtectedPath && !isLoggedIn) {
        return Response.redirect(new URL("/login", request.nextUrl));
      }

      if (pathname === "/login" && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
