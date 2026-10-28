"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { AuthModal } from "@/components/auth/auth-modal";
import { fireCrtStatic } from "@/lib/crt-static";

/**
 * Client-side auth gate. Wraps the locale tree in a SessionProvider and owns
 * the single auth modal instance, so any guarded CTA can request a login and
 * have its original action resumed once the session cookie exists.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthGateValue {
  user: AuthUser | null;
  status: AuthStatus;
  /** Run `action` now when signed in, otherwise open the modal and resume it. */
  requireAuth: (action: () => void) => void;
  openAuth: () => void;
  signOutUser: () => Promise<void>;
  /** Refetch the Auth.js session after a profile/avatar change. */
  refreshUser: () => Promise<void>;
}

const AuthGateContext = createContext<AuthGateValue | null>(null);

export function useAuthGate(): AuthGateValue {
  const value = useContext(AuthGateContext);
  if (!value) throw new Error("useAuthGate must be used inside <AuthProvider>");
  return value;
}

function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (status === "authenticated") {
        action();
        return;
      }
      pending.current = action;
      setOpen(true);
    },
    [status]
  );

  const openAuth = useCallback(() => {
    pending.current = null;
    setOpen(true);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut({ redirect: false });
  }, []);

  const refreshUser = useCallback(async () => {
    await update();
  }, [update]);

  const handleAuthenticated = useCallback(() => {
    // Milestone 1: successful authentication (sign-in, sign-up or reset).
    fireCrtStatic();
    setOpen(false);
    const action = pending.current;
    pending.current = null;
    if (action) action();
  }, []);

  const handleClose = useCallback(() => {
    pending.current = null;
    setOpen(false);
  }, []);

  const user = useMemo<AuthUser | null>(() => {
    const id = session?.user?.id;
    if (!id) return null;
    return {
      id,
      name: session?.user?.name ?? "",
      email: session?.user?.email ?? "",
      avatarUrl: session?.user?.avatarUrl ?? null,
    };
  }, [session]);

  const value = useMemo<AuthGateValue>(
    () => ({
      user,
      status: status as AuthStatus,
      requireAuth,
      openAuth,
      signOutUser,
      refreshUser,
    }),
    [user, status, requireAuth, openAuth, signOutUser, refreshUser]
  );

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <AuthModal
        open={open}
        onClose={handleClose}
        onAuthenticated={handleAuthenticated}
      />
    </AuthGateContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <AuthGateProvider>{children}</AuthGateProvider>
    </SessionProvider>
  );
}
