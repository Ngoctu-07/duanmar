import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TourCategorySection } from "@/components/tours/tour-category-section";

export const metadata: Metadata = {
  title: "Domestic Tours | DuanMar",
  description: "Tour Vietnam from north to south",
};

export default async function DomesticToursPage() {
  const t = await getTranslations("tours");

  return (
    <>
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold">{t("domestic.title")}</h1>
        <p className="text-lg text-muted-foreground">{t("domestic.subtitle")}</p>
      </div>
      <TourCategorySection category="domestic" />
    </>
  );
}
