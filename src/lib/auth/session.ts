import { auth } from "@/auth";
import { findUserById } from "@/lib/auth/user-store";

/**
 * Server-side session helper for RSC and route handlers.
 * Returns `null` when the visitor has no valid Auth.js session cookie.
 *
 * The JWT only carries the user id; the public profile is re-read from SQLite
 * on every call so a name/avatar change (or a months-old session) always
 * renders the current persisted state.
 */
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatarPresetId: string | null;
  avatarUrl: string | null;
}

export async function currentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const stored = findUserById(id);
  if (stored) return stored;

  // Storage degraded: fall back to the JWT claims so the app stays usable.
  return {
    id,
    email: session.user.email ?? "",
    name: session.user.name ?? session.user.email ?? "",
    avatarPresetId: null,
    avatarUrl: null,
  };
}
