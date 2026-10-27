import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BookingForm } from "@/components/booking/booking-form";
import { mapPricingTiers } from "@/lib/pricing";
import { mapTourCapacity } from "@/lib/tour-capacity";
import { resolveLocaleString } from "@/lib/bilingual-string";
import { currentUser } from "@/lib/auth/session";
import { loadVoucherWallet } from "@/lib/vouchers/load-voucher-wallet";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { DESTINATION_BY_SLUG_QUERY } from "@/sanity/queries/destinations";
import { TOUR_PRICING_BY_SLUG_QUERY } from "@/sanity/queries/tour-pricing";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tour?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("booking");
  return { title: t("title") };
}

export default async function CheckoutPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { tour } = await searchParams;
  if (!tour) notFound();

  const [destination, pricingDoc, t] = await Promise.all([
    fetchPublished(DESTINATION_BY_SLUG_QUERY, { slug: tour }, {
      tags: [`sanity:destination:${tour}`],
    }),
    fetchPublished(TOUR_PRICING_BY_SLUG_QUERY, { slug: tour }, {
      tags: [`sanity:pricing:${tour}`],
    }),
    getTranslations("booking"),
  ]);
  if (!destination) notFound();

  const tiers = mapPricingTiers(pricingDoc, locale);
  const capacity = mapTourCapacity(pricingDoc);
  const tourName = resolveLocaleString(destination.name, locale) ?? tour;

  // Voucher wallet is server truth: signed-out visitors see the sign-in hint,
  // signed-in visitors get their claimed vouchers. The loader hides claims whose
  // master promotion is deleted/unpublished/inactive (expired/other-tour entries
  // stay visible but disabled inside the selector). Copy is re-localized from
  // the live CMS on every render; no DB cleanup on a checkout GET.
  const user = await currentUser();
  const vouchers = user ? await loadVoucherWallet(user.id, locale) : [];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <Link
        href={`/explore/destinations/${tour}`}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← {t("backToTour")}
      </Link>

      <h1 className="display-title mt-6">{t("title")}</h1>
      <p className="mt-1 text-lg text-muted-foreground">{tourName}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-6">
        <BookingForm
          slug={tour}
          tourName={tourName}
          tiers={tiers}
          locale={locale}
          capacity={capacity}
          vouchers={vouchers}
          signedIn={user !== null}
        />
      </div>
    </div>
  );
}
