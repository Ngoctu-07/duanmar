import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PromotionCard } from "@/components/deals/promotion-card";
import { filterLivePromotions, toPromotionCard, type PromotionRecord } from "@/lib/promotions";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { PROMOTIONS_QUERY } from "@/sanity/queries/promotions";

export const metadata: Metadata = {
  title: "Deals & Packages | DuanMar",
  description: "Curated offers for your Vietnam journey",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function DealsPage({ params }: PageProps) {
  const { locale } = await params;
  const [promotions, t] = await Promise.all([
    fetchPublished(PROMOTIONS_QUERY, {}, { tags: ["sanity:promotion:list"] }),
    getTranslations("deals"),
  ]);

  const cards = filterLivePromotions((promotions ?? []) as PromotionRecord[]).map((promo) =>
    toPromotionCard(promo, locale)
  );

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      {cards.length === 0 ? (
        <p className="mx-auto max-w-4xl rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {cards.map((card) => (
            <PromotionCard
              key={card.id}
              card={card}
              countdownLabel={
                card.daysLeft === 0 ? t("lastDay") : t("endsInDays", { count: card.daysLeft })
              }
              viewTourLabel={t("viewTour")}
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
