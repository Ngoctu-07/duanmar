"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PriceCurrency } from "@/lib/pricing";
import type { Voucher } from "@/lib/vouchers/voucher-store";
import { BookingVoucherCard } from "./booking-voucher-card";

interface BookingVoucherSectionProps {
  vouchers: Voucher[];
  slug: string;
  signedIn: boolean;
  selected: Voucher | null;
  /** Single-voucher rule: applying replaces the previous choice; re-applying clears it. */
  onSelect: (voucher: Voucher | null) => void;
  subtotal: number | null;
  locale: string;
  currency: PriceCurrency;
}

/**
 * "Apply offer / Choose voucher" block at the bottom of checkout.
 *
 * One collapsible card per wallet voucher, one panel open at a time so a long
 * wallet stays scannable. There is no "No voucher" row: not choosing anything
 * is the default, and the applied card's own "Remove voucher" action clears the
 * selection.
 */
export function BookingVoucherSection({
  vouchers,
  slug,
  signedIn,
  selected,
  onSelect,
  subtotal,
  locale,
  currency,
}: BookingVoucherSectionProps) {
  const t = useTranslations("booking");
  const [openId, setOpenId] = useState<string | null>(null);

  const togglePanel = (id: string) => {
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    // Full-width checkout step card: aligns edge-to-edge with the price
    // breakdown and every other step. Only the voucher cards inside stay
    // compact; the outer section itself must never shrink.
    <section
      aria-labelledby="booking-voucher-heading"
      data-testid="voucher-section"
      className="w-full rounded-none border bg-card p-4"
    >
      <h2
        id="booking-voucher-heading"
        className="text-sm font-semibold uppercase tracking-widest text-link"
      >
        {t("voucherTitle")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("voucherSubtitle")}</p>

      {!signedIn && (
        <div className="mt-3 flex flex-col gap-2 border border-dashed p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("voucherSignIn")}</p>
          <Link
            href="/account"
            className="inline-flex h-9 items-center justify-center bg-primary px-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground"
          >
            {t("voucherSignInCta")}
          </Link>
        </div>
      )}

      {signedIn && vouchers.length === 0 && (
        <div
          data-testid="voucher-empty"
          className="mt-3 flex flex-col gap-2 border border-dashed p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{t("voucherEmpty")}</p>
          <Link
            href="/deals"
            className="inline-flex h-9 items-center justify-center border border-white/20 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white"
          >
            {t("voucherEmptyCta")}
          </Link>
        </div>
      )}

      {signedIn && vouchers.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {vouchers.map((voucher) => (
            <BookingVoucherCard
              key={voucher.id}
              voucher={voucher}
              slug={slug}
              applied={selected?.id === voucher.id}
              open={openId === voucher.id}
              onToggle={() => togglePanel(voucher.id)}
              onSelect={onSelect}
              subtotal={subtotal}
              locale={locale}
              currency={currency}
            />
          ))}
        </ul>
      )}

      {selected && (
        <p
          data-testid="voucher-applied"
          className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-sm text-link"
        >
          <Ticket className="h-4 w-4" aria-hidden />
          {t("voucherApplied", { code: selected.code })}
        </p>
      )}
    </section>
  );
}
