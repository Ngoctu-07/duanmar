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
        <h1 className="display-title">{t("international.title")}</h1>
      </div>
      <TourCategorySection category="international" />
    </>
  );
}
