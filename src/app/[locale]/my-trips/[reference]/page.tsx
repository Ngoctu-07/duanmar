import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MyTripsDetail } from "@/components/my-trips/my-trips-detail";

interface PageProps {
  params: Promise<{ locale: string; reference: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myTrips");
  return { title: t("detailTitle") };
}

export default async function TripDetailPage({ params }: PageProps) {
  const { locale, reference } = await params;
  const t = await getTranslations("myTrips");

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <MyTripsDetail reference={reference} locale={locale} />
    </div>
  );
}
