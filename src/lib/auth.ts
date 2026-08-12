import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { emailSignInSchema } from "@/features/auth/schema";
import { verifyPassword } from "@/features/auth/password";
import { seedDefaultSubjects } from "@/features/subjects/seed";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google,
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

        const supabase = await createClient();
        const { data: user } = await supabase
          .from("User")
          .select("id, name, email, image, password")
          .eq("email", parsed.data.email)
          .maybeSingle();

        const valid = await verifyPassword(parsed.data.password, user?.password ?? null);
        if (!user || !valid) return null;

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
  },
});
