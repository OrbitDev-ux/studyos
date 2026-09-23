import { headers } from "next/headers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { emailSignInSchema } from "@/features/auth/schema";
import { verifyPassword } from "@/features/auth/password";
import { seedDefaultSubjects } from "@/features/subjects/seed";
import { capture } from "@/features/analytics/capture";
import { authConfig } from "@/lib/auth.config";
import { getClientIp } from "@/lib/ip";
import { prisma } from "@/lib/prisma";
import { isGoogleOAuthConfigured } from "@/features/auth/provider-config";

// Brute-force guard on password sign-in (Security audit: unlike admin login,
// this had no rate limit at all — only bcrypt's inherent compare delay).
// IP-scoped (not email-scoped): rate-limiting by attempted email would let an
// attacker fingerprint which emails exist by how quickly they get throttled,
// re-opening the user-enumeration hole authorize() otherwise closes. Reuses
// AuditLog, same pattern as reset-actions.ts's PasswordResetToken counting.
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS_PER_IP = 10;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(isGoogleOAuthConfigured() ? [Google] : []),
    Credentials({
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      // Returning null (rather than throwing) for every failure keeps the
      // response uniform between "no such user" and "wrong password" —
      // verifyPassword() always runs bcrypt.compare so the two cases also
      // take the same amount of time.
      async authorize(credentials) {
        const parsed = emailSignInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const ip = getClientIp(await headers());
        const since = new Date(Date.now() - LOGIN_RATE_WINDOW_MS);
        const recentFailures = await prisma.auditLog.count({
          where: { event: "LOGIN_FAILED", ip, createdAt: { gte: since } },
        });
        if (recentFailures >= MAX_FAILED_LOGINS_PER_IP) return null;

        // Anon-REST trust boundary closed: the credential check reads the
        // User row via Prisma (owner role) instead of the public Supabase
        // endpoint the anon key could be used against. Email is @unique.
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, name: true, email: true, image: true, password: true },
        });

        const valid = await verifyPassword(parsed.data.password, user?.password ?? null);
        if (!user || !valid) {
          await prisma.auditLog.create({ data: { event: "LOGIN_FAILED", ip } }).catch(() => {});
          return null;
        }

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  // JWT sessions keep the session cookie self-contained and verifiable on
  // the Edge runtime, where middleware runs and cannot reach Prisma/pg.
  // The adapter still persists User/Account rows for Google sign-in; the
  // Credentials provider bypasses the adapter entirely (Auth.js never
  // persists credentials users itself), so email/password sign-up creates
  // the User row directly — see features/auth/actions.ts#signUpWithEmail.
  session: {
    strategy: "jwt",
  },
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Stamp sign-in time ONCE (only when `user` is present). Never updated
        // on later rotations, so it reliably marks when this session began —
        // used to invalidate sessions issued before a password reset.
        token.loginAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      if (typeof token.loginAt === "number") {
        session.user.loginAt = token.loginAt;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await seedDefaultSubjects(user.id);
    },
    // Fires for every successful sign-in regardless of provider (credentials,
    // google, guest) — the one reliable place for login funnel metrics since
    // every client action that calls signIn() ends here.
    async signIn({ account }) {
      // NextAuth types the account loosely; read just the provider string and
      // map it onto the event's method union. Credentials covers both email
      // password sign-ins and guest accounts.
      const provider = (account as { provider: string } | null)?.provider;
      capture({
        name: "login_completed",
        props: { method: provider === "google" ? "google" : provider ? "credentials" : "unknown" },
      });
    },
  },
});
