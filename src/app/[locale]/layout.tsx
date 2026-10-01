import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PromoModal } from "@/components/layout/promo-modal";
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { SITE_CONFIGURATION_QUERY } from "@/sanity/queries/site-configuration";
import { fetchPublished } from "@/sanity/lib/fetch-published";
import { pickBilingual } from "@/lib/bilingual-string";

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  const siteConfig = await fetchPublished(SITE_CONFIGURATION_QUERY, {}, {
    tags: ["sanity:siteconfig"],
  });
  const locale = await getLocale();
  // Per-locale promo asset with D2 fallback chain (plan 260929-1617):
  // active locale → legacy shared asset → other locale → hidden.
  const popupImage =
    siteConfig?.[`popupImage_${locale}`] ??
    siteConfig?.entryPopupImage ??
    siteConfig?.[locale === "vi" ? "popupImage_en" : "popupImage_vi"] ??
    null;
  const popupSrc = popupImage?.asset?.url ?? null;
  const popupWidth = popupImage?.asset?.metadata?.dimensions?.width ?? 1200;
  const popupHeight = popupImage?.asset?.metadata?.dimensions?.height ?? 800;
  // Resolved per request on the server → re-runs when the [locale] segment changes,
  // so the footer slogan swaps language on a soft locale toggle (no hard refresh).
  const footerSlogan = pickBilingual(siteConfig?.footerSlogan, locale);

  return (
    <NextIntlClientProvider messages={messages}>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer socialLinks={siteConfig?.socialLinks ?? null} slogan={footerSlogan} />
      <PromoModal
        imageSrc={popupSrc}
        width={popupWidth}
        height={popupHeight}
        enableEntryPopup={siteConfig?.enableEntryPopup}
      />
      <AssistantWidget />
    </NextIntlClientProvider>
  );
}
