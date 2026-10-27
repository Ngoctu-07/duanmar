"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuthGate } from "@/components/auth/auth-provider";
import type { PromotionCard } from "@/lib/promotions";
import { cn } from "cn";

interface ClaimDealButtonProps {
  card: PromotionCard;
  /** Where the deal points for crawlers and middle-click (never claimed state). */
  href: string;
  label: string;
  /** Label rendered once the promotion is in the visitor's wallet. */
  claimedLabel: string;
  /** Status label for a deal whose slot limit is reached. */
  outOfSlotsLabel: string;
  /** Server truth: this visitor already claimed the promotion. */
  claimed: boolean;
  /** No slots left — the claim action is replaced by a dead status chip. */
  exhausted: boolean;
}

/**
 * "Claim now" CTA. Signed-out visitors get the auth modal first; the claim is
 * replayed automatically after login. Once the voucher is stored the button
 * flips to "Đã nhận" and refuses further clicks — the wallet itself is read
 * from SQLite on the account page, so it appears there immediately.
 *
 * Exhausted deals never render a clickable CTA, and a 409 from the server
 * (last slot taken between render and click) swaps in the "out of slots" copy.
 */
export function ClaimDealButton({
  card,
  href,
  label,
  claimedLabel,
  outOfSlotsLabel,
  claimed,
  exhausted,
}: ClaimDealButtonProps) {
  const t = useTranslations("deals");
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<"error" | "exhausted" | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);
  const isClaimed = claimed || justClaimed;
  const ctaClass =
    "flex w-full items-center justify-center rounded-none px-6 py-3 font-condensed text-sm font-medium uppercase tracking-[0.22em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const claim = async () => {
    if (isClaimed || busy || exhausted) return;
    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promotionId: card.id,
          title: card.title,
          description: card.description ?? "",
          promoCode: card.promoCode,
          price: card.price,
          originalPrice: card.originalPrice,
          badge: card.badgeTag,
          validUntil: card.validUntil,
          tourSlug: card.tourSlug,
        }),
      });
      if (!response.ok) {
        setFailure(response.status === 409 ? "exhausted" : "error");
        setBusy(false);
        return;
      }
      setJustClaimed(true);
      setBusy(false);
      // Re-render the server page so the claimed set (and any other card)
      // matches the wallet on the next visit, without leaving this page.
      router.refresh();
    } catch {
      setFailure("error");
      setBusy(false);
    }
  };

  if (exhausted) {
    return (
      <span
        data-testid="claim-deal-exhausted"
        aria-disabled="true"
        className={cn(ctaClass, "cursor-not-allowed border border-white/20 bg-transparent text-white/50")}
      >
        {outOfSlotsLabel}
      </span>
    );
  }

  return (
    <>
      <Link
        href={href}
        aria-disabled={isClaimed || undefined}
        aria-busy={busy || undefined}
        data-claimed={isClaimed ? "true" : undefined}
        onClick={(event) => {
          event.preventDefault();
          if (isClaimed || busy) return;
          requireAuth(() => {
            void claim();
          });
        }}
        className={cn(
          ctaClass,
          isClaimed
            ? "cursor-not-allowed border border-white/20 bg-transparent text-white/50"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isClaimed ? claimedLabel : label}
      </Link>
      {failure && (
        <p role="alert" className="mt-2 text-center text-xs text-primary">
          {failure === "exhausted" ? t("claimExhausted") : t("claimError")}
        </p>
      )}
    </>
  );
}
