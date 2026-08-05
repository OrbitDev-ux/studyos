import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SUBJECTS } from "@/features/subjects/constants";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  // JWT sessions keep the session cookie self-contained and verifiable on
  // the Edge runtime, where middleware runs and cannot reach Prisma/pg.
  // The adapter still persists User/Account rows on sign-in.
  session: {
    strategy: "jwt",
  },
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.subject.createMany({
        data: DEFAULT_SUBJECTS.map((subject, index) => ({
          userId: user.id as string,
          name: subject.name,
          color: subject.color,
          order: index,
        })),
      });
    },
  },
});
