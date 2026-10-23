"use client";

import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice, type PriceCurrency } from "@/lib/pricing";
import type { Voucher } from "@/lib/vouchers/voucher-store";
import {
  isVoucherApplicable,
  isVoucherExpired,
  resolveVoucherDiscount,
  voucherPercent,
} from "@/lib/vouchers/voucher-discount";
import { cn } from "@/lib/utils";

interface BookingVoucherCardProps {
  voucher: Voucher;
  slug: string;
  applied: boolean;
  open: boolean;
  onToggle: () => void;
  /** Single-voucher rule: applying replaces the choice, re-applying clears it. */
  onSelect: (voucher: Voucher | null) => void;
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
 * One collapsible voucher card.
 *
 * Collapsed header: promo code + discount value + title only. The panel (full
 * description/terms, expiry, eligibility, apply/remove action) stays mounted
 * but `hidden`, so `aria-controls` always resolves and the closed card adds no
 * visual clutter.
 */
export function BookingVoucherCard({
  voucher,
  slug,
  applied,
  open,
  onToggle,
  onSelect,
  subtotal,
  locale,
  currency,
}: BookingVoucherCardProps) {
  const t = useTranslations("booking");
  const applicable = isVoucherApplicable(voucher, slug);
  const expired = isVoucherExpired(voucher);
  const percent = voucherPercent(voucher);
  const preview =
    applicable && subtotal !== null ? resolveVoucherDiscount(voucher, subtotal) : null;
  const validLabel = formatDay(voucher.validUntil, locale);
  const panelId = `voucher-panel-${voucher.id}`;
  const discountLabel =
    percent !== null
      ? t("voucherPercent", { percent })
      : preview && preview.amount > 0
        ? `−${formatPrice(preview.amount, locale, currency)}`
        : null;

  return (
    <li
      data-testid="voucher-card"
      data-voucher-code={voucher.code}
      className={cn(
        "border transition-colors",
        applied && "border-primary bg-primary/10",
        !applied && open && "border-white/30",
        !applied && !open && "border-border"
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t("voucherCollapse") : t("voucherExpand")}
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-sm font-bold tracking-[0.16em] text-primary">
              {voucher.code}
            </span>
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
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

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
          {!applicable && !expired && <span>{t("voucherOtherTour")}</span>}
          {preview && preview.amount > 0 && (
            <span className="text-link">−{formatPrice(preview.amount, locale, currency)}</span>
          )}
        </div>

        <button
          type="button"
          aria-pressed={applied}
          disabled={!applicable}
          onClick={() => onSelect(applied ? null : voucher)}
          className={cn(
            "mt-3 inline-flex h-9 w-full items-center justify-center px-4 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors sm:w-auto",
            applied
              ? "border border-white/25 text-white hover:border-white/50"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
            !applicable && "cursor-not-allowed opacity-50"
          )}
        >
          {applied ? t("voucherRemove") : t("voucherApply")}
        </button>
      </div>
    </li>
  );
}
