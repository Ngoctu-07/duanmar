import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/auth/session";
import { listBookingsForUser } from "@/lib/bookings/booking-store";
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
  const [t, user] = await Promise.all([getTranslations("myTrips"), currentUser()]);
  const serverBookings = user ? listBookingsForUser(user.id) : [];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="display-title">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <MyTripsClient locale={locale} serverBookings={serverBookings} />
    </div>
  );
}
