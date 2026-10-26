"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Primary CTA in the tour meta tag row. Deliberately the same type size and
 * padding as the outlined chips beside it (`text-sm`, `px-3 py-1`) so the row
 * reads as one tag set — only the solid brand-red fill marks it as the action.
 *
 * Open to guests: booking does not require an account (only applying a
 * voucher does — that gate lives in the checkout voucher section).
 */
export function BookTicketButton({ slug }: { slug: string }) {
  const t = useTranslations("booking");
  const href = `/booking/checkout?tour=${encodeURIComponent(slug)}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-none bg-primary px-3 py-1 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 print:hidden"
    >
      {t("bookNow")}
    </Link>
  );
}
