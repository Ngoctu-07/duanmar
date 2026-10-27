"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuthGate } from "@/components/auth/auth-provider";
import type { PriceCurrency } from "@/lib/pricing";
import type { VoucherView } from "@/lib/vouchers/localize";
import { withBookingReturn } from "@/lib/booking-return";
import { BookingVoucherCard } from "./booking-voucher-card";

interface BookingVoucherSectionProps {
  vouchers: VoucherView[];
  slug: string;
  signedIn: boolean;
  selected: VoucherView | null;
  /** Single-voucher radio model: selecting replaces the previous choice. */
  onSelect: (voucher: VoucherView | null) => void;
  /** Live guest count + travel date drive instant eligibility feedback. */
  guestCount: number;
  bookingDate: string | null;
  subtotal: number | null;
  locale: string;
  currency: PriceCurrency;
}

/**
 * "Apply offer / Choose voucher" block at the bottom of checkout.
 *
 * Guests can book without an account; applying a voucher needs one. The
 * sign-in CTA opens the auth modal in place and refreshes the server props
 * afterwards, so the wallet appears without losing what was typed in the form.
 *
 * One collapsible card per wallet voucher, one panel open at a time so a long
 * wallet stays scannable. Eligibility is evaluated against the live guest
 * count and travel date on every render; ineligible cards are disabled with a
 * reason. Selection is a radio group, so at most one voucher can be applied —
 * choosing another replaces the previous one automatically.
 */
export function BookingVoucherSection({
  vouchers,
  slug,
  signedIn,
  selected,
  onSelect,
  guestCount,
  bookingDate,
  subtotal,
  locale,
  currency,
}: BookingVoucherSectionProps) {
  const t = useTranslations("booking");
  const [openId, setOpenId] = useState<string | null>(null);
  const router = useRouter();
  const { requireAuth } = useAuthGate();

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
          <button
            type="button"
            data-testid="voucher-sign-in"
            onClick={() => requireAuth(() => router.refresh())}
            className="inline-flex h-9 items-center justify-center bg-primary px-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground"
          >
            {t("voucherSignInCta")}
          </button>
        </div>
      )}

      {signedIn && vouchers.length === 0 && (
        <div
          data-testid="voucher-empty"
          className="mt-3 flex flex-col gap-2 border border-dashed p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{t("voucherEmpty")}</p>
          <Link
            href={withBookingReturn("/deals", slug)}
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
              guestCount={guestCount}
              bookingDate={bookingDate}
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
