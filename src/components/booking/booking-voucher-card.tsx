"use client";

import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice, type PriceCurrency } from "@/lib/pricing";
import type { VoucherView } from "@/lib/vouchers/localize";
import { evaluateVoucherEligibility } from "@/lib/vouchers/voucher-eligibility";
import {
  isVoucherExpired,
  resolveVoucherDiscount,
  voucherPercent,
} from "@/lib/vouchers/voucher-discount";
import { cn } from "@/lib/utils";

interface BookingVoucherCardProps {
  voucher: VoucherView;
  slug: string;
  applied: boolean;
  open: boolean;
  onToggle: () => void;
  /** Single-voucher radio model: selecting replaces the previous choice. */
  onSelect: (voucher: VoucherView | null) => void;
  /** Live checkout guest count — drives instant eligibility re-evaluation. */
  guestCount: number;
  /** Live travel date (`YYYY-MM-DD`) or `null` before selection. */
  bookingDate: string | null;
  subtotal: number | null;
  locale: string;
  currency: PriceCurrency;
}

function formatDay(value: string | null, locale: string): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

/**
 * One collapsible voucher card with a single-selection radio.
 *
 * Eligibility is evaluated on every render from the live checkout state
 * (`guestCount`, `bookingDate`) plus the live CMS rules attached to the wallet
 * row. Ineligible cards stay readable (expandable) but are greyed out, their
 * radio/apply controls are disabled, and a status line explains the blocker
 * ("Requires min. 5 guests" / "Voucher invalid for selected date").
 *
 * Collapsed header: radio + promo code + discount value + title. The panel
 * (full description/terms, expiry, apply/remove action) stays mounted but
 * `hidden`, so `aria-controls` always resolves.
 */
export function BookingVoucherCard({
  voucher,
  slug,
  applied,
  open,
  onToggle,
  onSelect,
  guestCount,
  bookingDate,
  subtotal,
  locale,
  currency,
}: BookingVoucherCardProps) {
  const t = useTranslations("booking");
  const eligibility = evaluateVoucherEligibility(voucher, {
    guests: guestCount,
    bookingDate,
    tourSlug: slug,
  });
  const eligible = eligibility.isEligible;
  const expired = isVoucherExpired(voucher);
  const exhausted = voucher.isExhausted;
  const tourMismatch = Boolean(voucher.tourSlug && voucher.tourSlug !== slug);
  const percent = voucherPercent(voucher);
  const preview =
    eligible && subtotal !== null ? resolveVoucherDiscount(voucher, subtotal) : null;
  const validLabel = formatDay(voucher.validUntil, locale);
  const panelId = `voucher-panel-${voucher.id}`;
  const discountLabel =
    percent !== null
      ? t("voucherPercent", { percent })
      : preview && preview.amount > 0
        ? `−${formatPrice(preview.amount, locale, currency)}`
        : null;
  const guestReason =
    !eligibility.isGuestEligible && voucher.minGuests !== null
      ? t("voucherMinGuests", { count: voucher.minGuests })
      : null;
  const dateReason = !eligibility.isDateEligible
    ? bookingDate
      ? t("voucherDateInvalid")
      : t("voucherDateRequired")
    : null;
  const actionLabel = exhausted
    ? t("voucherOutOfSlots")
    : !eligible
      ? t("voucherNotEligible")
      : applied
        ? t("voucherRemove")
        : t("voucherApply");

  return (
    <li
      data-testid="voucher-card"
      data-voucher-code={voucher.code}
      data-eligible={eligible ? "true" : "false"}
      data-guest-eligible={eligibility.isGuestEligible ? "true" : "false"}
      data-date-eligible={eligibility.isDateEligible ? "true" : "false"}
      data-exhausted={exhausted ? "true" : undefined}
      className={cn(
        "border transition-colors",
        !eligible && "opacity-60 grayscale",
        applied && "border-primary bg-primary/10",
        !applied && open && "border-white/30",
        !applied && !open && "border-border"
      )}
    >
      <div className="flex items-start gap-2 p-3">
        <input
          type="radio"
          name="booking-voucher"
          value={voucher.id}
          checked={applied}
          disabled={!eligible}
          onChange={() => onSelect(voucher)}
          aria-label={t("voucherSelectLabel", { code: voucher.code })}
          data-testid="voucher-radio"
          className="mt-1 h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed"
        />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? t("voucherCollapse") : t("voucherExpand")}
          onClick={onToggle}
          className="flex flex-1 items-start gap-3 text-left transition-colors hover:bg-muted/40"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "font-sans text-sm font-bold tracking-[0.16em] text-primary",
                  // Codes on blocked cards are display-only: copy is blocked.
                  !eligible && "select-none text-muted-foreground"
                )}
              >
                {voucher.code}
              </span>
              {exhausted && (
                <span
                  data-testid="voucher-exhausted-badge"
                  className="bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground"
                >
                  {t("voucherOutOfSlots")}
                </span>
              )}
              {discountLabel && (
                <span className="bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground">
                  {discountLabel}
                </span>
              )}
              {applied && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-link">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {t("voucherAppliedBadge")}
                </span>
              )}
            </span>
            <span className="mt-1 block font-medium text-white">
              {voucher.title || voucher.code}
            </span>
            {guestReason && (
              <span
                data-testid="voucher-guest-requirement"
                className="mt-1 block text-[11px] font-medium text-primary"
              >
                {guestReason}
              </span>
            )}
            {dateReason && (
              <span
                data-testid="voucher-date-requirement"
                className="mt-1 block text-[11px] font-medium text-primary"
              >
                {dateReason}
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </div>

      <div id={panelId} hidden={!open} className="border-t border-border/60 px-3 pb-3 pt-3">
        {voucher.description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {voucher.description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {validLabel && (
            <span className={expired ? "text-primary" : undefined}>
              {expired ? t("voucherExpired") : t("voucherValidUntil", { date: validLabel })}
            </span>
          )}
          {tourMismatch && <span>{t("voucherOtherTour")}</span>}
          {preview && preview.amount > 0 && (
            <span className="text-link">−{formatPrice(preview.amount, locale, currency)}</span>
          )}
        </div>

        <button
          type="button"
          aria-pressed={eligible ? applied : undefined}
          disabled={!eligible}
          onClick={() => {
            if (!eligible) return;
            onSelect(applied ? null : voucher);
          }}
          className={cn(
            "mt-3 inline-flex h-9 w-full items-center justify-center px-4 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors sm:w-auto",
            applied
              ? "border border-white/25 text-white hover:border-white/50"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
            !eligible && "cursor-not-allowed opacity-50"
          )}
        >
          {actionLabel}
        </button>
      </div>
    </li>
  );
}
