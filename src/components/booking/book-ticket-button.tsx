"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Primary booking CTA for the sticky tour sidebar. Rendered full-width inside
 * the pricing card so the highest-intent action owns the most visual weight on
 * the page (solid brand red, uppercase, generous hit area).
 *
 * Open to guests: booking does not require an account (only applying a voucher
 * does — that gate lives in the checkout voucher section).
 */
export function BookTicketButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const t = useTranslations("booking");
  const href = `/booking/checkout?tour=${encodeURIComponent(slug)}`;

  return (
    <Link
      href={href}
      data-testid="book-ticket-cta"
      className={cn(
        "flex w-full cursor-pointer items-center justify-center rounded-sm bg-[#b3151b] px-6 py-4 text-base font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#cc3d3d] print:hidden",
        className
      )}
    >
      {t("bookNow")}
    </Link>
  );
}
