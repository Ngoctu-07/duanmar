"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuthGate } from "@/components/auth/auth-provider";

/**
 * Primary CTA in the tour meta tag row. Deliberately the same type size and
 * padding as the outlined chips beside it (`text-sm`, `px-3 py-1`) so the row
 * reads as one tag set — only the solid brand-red fill marks it as the action.
 *
 * Guarded: signed-out visitors get the auth modal, then the checkout
 * navigation is replayed automatically after login.
 */
export function BookTicketButton({ slug }: { slug: string }) {
  const t = useTranslations("booking");
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const href = `/booking/checkout?tour=${encodeURIComponent(slug)}`;

  return (
    <Link
      href={href}
      data-crt-static="300"
      onClick={(event) => {
        event.preventDefault();
        requireAuth(() => router.push(href));
      }}
      className="inline-flex items-center rounded-none bg-primary px-3 py-1 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 print:hidden"
    >
      {t("bookNow")}
    </Link>
  );
}
