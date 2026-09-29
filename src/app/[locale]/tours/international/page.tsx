import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TourCategorySection } from "@/components/tours/tour-category-section";

export const metadata: Metadata = {
  title: "International Tours | DuanMar",
  description: "Curated journeys beyond Vietnam — coming soon",
};

export default async function InternationalToursPage() {
  const t = await getTranslations("tours");

  return (
    <>
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold">{t("international.title")}</h1>
        <p className="text-lg text-muted-foreground">{t("international.subtitle")}</p>
      </div>
      <TourCategorySection category="international" />
    </>
  );
}
