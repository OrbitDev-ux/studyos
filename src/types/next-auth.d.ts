import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** Epoch ms when this session was issued (sign-in). Used to invalidate
       * sessions issued before a password change. */
      loginAt?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    loginAt?: number;
  }
}
