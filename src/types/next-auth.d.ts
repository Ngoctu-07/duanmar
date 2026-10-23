import type { DefaultSession } from "next-auth";

/**
 * Auth.js session shape: the credentials provider puts the SQLite user id on
 * `token.sub`, and the `session` callback copies it onto `session.user.id`.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
