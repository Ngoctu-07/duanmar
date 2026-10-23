"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuthGate } from "@/components/auth/auth-provider";

/**
 * Signed-out `/account` state. The button opens the shared auth modal; after a
 * successful login `router.refresh()` re-runs the server page so the wallet is
 * rendered with the new session cookie.
 */
export function AccountSignIn() {
  const t = useTranslations("account");
  const router = useRouter();
  const { requireAuth } = useAuthGate();

  return (
    <div className="container mx-auto max-w-xl px-4 py-24">
      <div className="rounded-none border border-white/10 bg-card p-8 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">DuanMar</p>
        <h1 className="mt-3 font-sans text-3xl font-bold uppercase leading-tight tracking-tight text-white">
          {t("signedOutTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("signedOutBody")}
        </p>
        <button
          type="button"
          onClick={() => requireAuth(() => router.refresh())}
          className="mt-8 h-11 w-full rounded-none bg-primary font-sans text-xs font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("signedOutCta")}
        </button>
      </div>
    </div>
  );
}
