import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MyTripsClient } from "@/components/my-trips/my-trips-client";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myTrips");
  return { title: t("title") };
}

export default async function MyTripsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("myTrips");

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <MyTripsClient locale={locale} />
    </div>
  );
}
