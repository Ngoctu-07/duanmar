import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BookingForm } from "@/components/booking/booking-form";
import { mapPricingTiers } from "@/lib/pricing";
import { mapTourCapacity } from "@/lib/tour-capacity";
import { resolveCryptoConfig } from "@/lib/crypto-payment";
import { resolveLocaleString } from "@/lib/bilingual-string";
import { currentUser } from "@/lib/auth/session";
import { listVouchers } from "@/lib/vouchers/voucher-store";
import { localizeVouchers } from "@/lib/vouchers/localize";
import type { PromotionRecord } from "@/lib/promotions";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { SITE_CONFIGURATION_QUERY } from "@/sanity/queries/site-configuration";
import { PROMOTIONS_BY_IDS_QUERY } from "@/sanity/queries/promotions";
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

  const [destination, pricingDoc, siteConfig, t] = await Promise.all([
    fetchPublished(DESTINATION_BY_SLUG_QUERY, { slug: tour }, {
      tags: [`sanity:destination:${tour}`],
    }),
    fetchPublished(TOUR_PRICING_BY_SLUG_QUERY, { slug: tour }, {
      tags: [`sanity:pricing:${tour}`],
    }),
    fetchPublished(SITE_CONFIGURATION_QUERY, {}, {
      tags: ["sanity:siteconfig"],
    }),
    getTranslations("booking"),
  ]);
  if (!destination) notFound();

  const tiers = mapPricingTiers(pricingDoc, locale);
  const capacity = mapTourCapacity(pricingDoc);
  const tourName = resolveLocaleString(destination.name, locale) ?? tour;

  // Voucher wallet is server truth: signed-out visitors see the sign-in hint,
  // signed-in visitors get their claimed vouchers (expired/other-tour entries
  // are filtered/disabled inside the selector).
  //
  // Copy is re-localized from the CMS on every render: the wallet rows are
  // claim-time snapshots, so without this step a voucher claimed in Vietnamese
  // kept Vietnamese text on the English checkout (the mixed-language list).
  const user = await currentUser();
  const wallet = user ? await listVouchers(user.id) : [];
  const promotionIds = [...new Set(wallet.map((voucher) => voucher.promotionId))];
  const promotions =
    promotionIds.length > 0
      ? await fetchPublished(
          PROMOTIONS_BY_IDS_QUERY,
          { ids: promotionIds },
          { tags: ["sanity:promotion:list"] }
        )
      : [];
  const vouchers = localizeVouchers(
    wallet,
    (promotions ?? []) as PromotionRecord[],
    locale
  );

  // CMS wallet address takes priority over env vars; falls back to env when
  // the Studio field is missing or empty. This keeps the checkout page
  // renderable even when Sanity is unreachable (fail-open via fetchPublished).
  const cmsWalletAddress =
    siteConfig?.paymentSettings?.cryptoWalletAddress ??
    siteConfig?.paymentSettings?.metamaskWalletAddress ??
    null;

  const cryptoConfig = resolveCryptoConfig({
    walletAddress: cmsWalletAddress ?? process.env.NEXT_PUBLIC_CRYPTO_WALLET_ADDRESS,
    chainId: process.env.NEXT_PUBLIC_CRYPTO_CHAIN_ID,
    tokenAddress: process.env.NEXT_PUBLIC_CRYPTO_TOKEN_ADDRESS,
    tokenSymbol: process.env.NEXT_PUBLIC_CRYPTO_TOKEN_SYMBOL,
    tokenDecimals: process.env.NEXT_PUBLIC_CRYPTO_TOKEN_DECIMALS,
    vndPerUsd: process.env.NEXT_PUBLIC_CRYPTO_VND_PER_USD,
  });

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
          isSpecialTour={destination.isSpecialTour === true}
          cryptoConfig={cryptoConfig}
          vouchers={vouchers}
          signedIn={user !== null}
        />
      </div>
    </div>
  );
}
