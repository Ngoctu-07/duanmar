import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BackToBookingLink } from "@/components/booking/back-to-booking-link";
import { PromotionCard } from "@/components/deals/promotion-card";
import { safeBookingReturn } from "@/lib/booking-return";
import { currentUser } from "@/lib/auth/session";
import { countVouchersByPromotion, listVouchers } from "@/lib/vouchers/voucher-store";
import { toPromotionCard, type PromotionRecord } from "@/lib/promotions";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { PROMOTIONS_QUERY } from "@/sanity/queries/promotions";

export const metadata: Metadata = {
  title: "Deals & Packages | DuanMar",
  description: "Curated offers for your Vietnam journey",
};

/**
 * The deals grid always reflects the current Sanity publish state: the route is
 * user-specific (voucher wallet cookies) and skips the shared data cache, so a
 * publish is visible on the next request without waiting for ISR/webhook.
 */
export const revalidate = 0;

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function DealsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const returnTo = safeBookingReturn((await searchParams).returnTo);
  const [promotions, t, user] = await Promise.all([
    fetchPublished(PROMOTIONS_QUERY, {}, { tags: ["sanity:promotion:list", "promotions"], fresh: true }),
    getTranslations("deals"),
    currentUser(),
  ]);

  // Signed-in visitors see "ĐÃ NHẬN" on deals already saved to their wallet.
  // Reading the session makes this page dynamic, which is what keeps the state
  // fresh after a claim (the button also calls `router.refresh()`).
  const claimedIds = new Set(
    user ? (await listVouchers(user.id)).map((voucher) => voucher.promotionId) : []
  );

  // Visibility is editorial (`isActive != false` in the GROQ). Expired offers
  // stay listed and are labelled "ended" — a date compare must never produce a
  // false empty grid (the original bug: Oct offers hidden on 11 Nov).
  const activePromotions = (promotions ?? []) as PromotionRecord[];
  // Live claim counts feed `isExhausted` on every card (CMS baseline + online).
  const claimCounts = await countVouchersByPromotion(
    activePromotions.map((promo) => promo._id)
  );
  const cards = activePromotions.map((promo) =>
    toPromotionCard(promo, locale, claimCounts.get(promo._id) ?? 0)
  );

  return (
    <div className="container mx-auto px-4 py-16">
      {returnTo && (
        <div className="mx-auto mb-6 max-w-6xl">
          <BackToBookingLink href={returnTo} />
        </div>
      )}
      <div className="mb-10 text-center">
        <h1 className="display-title mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      {cards.length === 0 ? (
        <p className="mx-auto max-w-4xl rounded-none border border-dashed p-10 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <PromotionCard
              key={card.id}
              card={card}
              countdownLabel={
                card.isExpired
                  ? t("expired")
                  : card.daysLeft === 0
                    ? t("lastDay")
                    : t("endsInDays", { count: card.daysLeft })
              }
              claimNowLabel={t("claimNow")}
              claimedLabel={t("claimed")}
              outOfSlotsLabel={t("outOfSlots")}
              readMoreLabel={t("readMore")}
              showLessLabel={t("showLess")}
              claimed={claimedIds.has(card.id)}
            />
          ))}
        </div>
      )}

      <p className="mt-8 max-w-4xl mx-auto text-center text-xs text-muted-foreground">
        {t("disclaimer")}
      </p>
    </div>
  );
}
