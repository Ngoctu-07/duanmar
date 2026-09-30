import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TourSearchResults } from "@/components/tours/tour-search-results";

export const metadata: Metadata = {
  title: "Tours | DuanMar",
  description: "Browse and search every Vietnam tour",
};

/** `/tours` (all tours) and `/tours?search=…` (hero search submit target). */
export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string | string[] }>;
}) {
  const { search } = await searchParams;
  // Repeated params (`?search=a&search=b`) arrive as an array — take the first.
  const raw = Array.isArray(search) ? search[0] : search;
  const query = (raw ?? "").trim();
  const t = await getTranslations("tours");

  return (
    <>
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold">
          {query ? t("search.title") : t("all.title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {query ? t("search.summary", { query }) : t("all.subtitle")}
        </p>
      </div>
      <TourSearchResults query={query} />
    </>
  );
}
