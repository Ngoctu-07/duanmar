"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Ticket } from "lucide-react";
import type { VoucherView } from "@/lib/vouchers/localize";

interface VoucherWalletProps {
  vouchers: VoucherView[];
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDay(value: string | null, locale: string): string | null {
  if (!value || !DAY.test(value)) return null;
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

/**
 * Defensive client-side guard: the server already drops orphaned/inactive
 * masters, but a malformed or partially hydrated row must never crash the
 * wallet render (e.g. missing `claimedAt` used by `.slice()`). Invalid entries
 * are silently stripped, which also collapses to the empty state when nothing
 * renderable remains.
 */
function isRenderableVoucher(
  voucher: VoucherView | null | undefined
): voucher is VoucherView {
  return Boolean(
    voucher &&
      typeof voucher.id === "string" &&
      voucher.id.length > 0 &&
      typeof voucher.code === "string" &&
      voucher.code.trim().length > 0 &&
      typeof voucher.title === "string" &&
      typeof voucher.claimedAt === "string" &&
      voucher.claimedAt.length >= 10
  );
}

/**
 * "Ví voucher" list. Each claimed promotion shows its snapshot, promo code and
 * a "Dùng ngay" action that sends the user to the tours listing so they can
 * pick the trip they want to spend the voucher on.
 */
export function VoucherWallet({ vouchers }: VoucherWalletProps) {
  const t = useTranslations("account");
  const locale = useLocale();
  // Strip orphaned/invalid entries before any render logic touches them.
  const renderable = vouchers.filter(isRenderableVoucher);

  if (renderable.length === 0) {
    return (
      <section
        aria-label={t("walletTitle")}
        className="rounded-none border border-dashed border-white/15 p-10 text-center"
      >
        <Ticket className="mx-auto h-8 w-8 text-primary/70" aria-hidden />
        <p className="mt-4 font-sans text-lg font-semibold text-white">{t("walletTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("walletEmpty")}</p>
        <Link
          href="/deals"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-none bg-primary px-6 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("walletCta")}
        </Link>
      </section>
    );
  }

  return (
    <section aria-label={t("walletTitle")} className="space-y-4">
      <ul className="space-y-4">
        {renderable.map((voucher) => {
          const claimed = formatDay(voucher.claimedAt.slice(0, 10), locale);
          const valid = formatDay(voucher.validUntil, locale);
          const expired =
            Boolean(voucher.validUntil && DAY.test(voucher.validUntil)) &&
            (voucher.validUntil as string) < todayIso();
          const exhausted = voucher.isExhausted;
          // Voucher value is redeemed on any tour — never drop the user on the
          // contact page, which was the old fallback for untargeted promos.
          const href = "/tours";

          return (
            <li
              key={voucher.id}
              data-testid="wallet-voucher"
              data-exhausted={exhausted ? "true" : undefined}
              className={
                exhausted
                  ? "rounded-none border border-white/10 bg-card p-6 opacity-60 grayscale"
                  : "rounded-none border border-white/10 bg-card p-6"
              }
            >
              <div className="min-w-0">
                {voucher.badge && (
                  <span className="mb-2 inline-block bg-primary px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
                    {voucher.badge}
                  </span>
                )}
                {exhausted && (
                  <span
                    data-testid="wallet-exhausted-badge"
                    className="mb-2 ml-2 inline-block bg-muted px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground"
                  >
                    {t("outOfSlots")}
                  </span>
                )}
                <h2 className="font-sans text-lg font-semibold leading-snug tracking-tight text-white">
                  {voucher.title || voucher.code}
                </h2>
                {voucher.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {voucher.description}
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {t("codeLabel")}
                  </p>
                  <p className="mt-1 font-sans text-base font-bold tracking-[0.16em] text-primary">
                    {voucher.code}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {(claimed || valid) && (
                    <div className="text-right text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {claimed && <p>{t("claimedOn", { date: claimed })}</p>}
                      {valid && (
                        <p className={expired ? "text-primary" : undefined}>
                          {expired ? t("expired") : t("validUntil", { date: valid })}
                        </p>
                      )}
                    </div>
                  )}
                  {exhausted ? (
                    <span
                      data-testid="wallet-exhausted-cta"
                      aria-disabled="true"
                      className="inline-flex h-10 shrink-0 cursor-not-allowed items-center justify-center rounded-none border border-white/20 px-5 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50"
                    >
                      {t("outOfSlots")}
                    </span>
                  ) : (
                    <Link
                      href={href}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-none bg-primary px-5 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      {t("useNow")}
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
