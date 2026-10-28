import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticate, findUserById, normalizeEmail } from "@/lib/auth/user-store";

/**
 * Auth.js (NextAuth v5) configuration — email/password only.
 *
 * Sessions are stateless JWTs; the user record itself lives in the SQLite
 * `users` table (see `sqlite-store.ts`). 90-day sliding session so a returning
 * visitor is not logged out after a two-month absence; the profile (name,
 * avatar, bookings, vouchers) is re-read from SQLite on every request rather
 * than trusted from the JWT.
 *
 * `AUTH_SECRET` should be set in production; the fallback keeps `npm run dev`
 * and CI builds working out of the box. Set the env var to rotate/tighten the
 * signing key — sessions issued with a different secret simply fail closed.
 */
const DEV_SECRET = "duanmar-dev-only-secret-change-me";

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.warn("[auth] AUTH_SECRET is not set — using the development signing key.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? DEV_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: "/account" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? normalizeEmail(credentials.email)
            : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const user = await authenticate(email, password);
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const id = token.sub ?? "";
        session.user.id = id;
        if (token.name) session.user.name = token.name;
        if (token.email) session.user.email = token.email;
        // Re-read the profile so avatar/name edits propagate to every client
        // (including the review form preview) without re-login.
        const stored = id ? await findUserById(id) : null;
        session.user.avatarUrl = stored?.avatarUrl ?? null;
        if (stored) {
          session.user.name = stored.name;
          session.user.email = stored.email;
        }
      }
      return session;
    },
  },
});
