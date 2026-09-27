import type { Metadata } from "next";
import { Handshake, Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Travel Trade Partners | Vietnam Tourism",
  description:
    "Programs, reports and brand assets for tour operators, travel agents and DMCs",
};

interface Offer {
  heading: string;
  text: string;
}

export default async function TradePage() {
  const t = await getTranslations("trade");
  const offers = t.raw("offers") as Offer[];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mx-auto max-w-3xl">
        <p className="mb-10 leading-relaxed text-muted-foreground">{t("intro")}</p>

        <h2 className="mb-4 text-xl font-semibold">{t("offersTitle")}</h2>
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {offers.map((offer) => (
            <div key={offer.heading} className="rounded-xl border p-5">
              <h3 className="mb-2 font-medium">{offer.heading}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {offer.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/about/press"
            className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Newspaper className="h-4 w-4" />
            {t("pressCta")}
          </Link>
        </div>

        <div className="rounded-xl border bg-muted/50 p-8 text-center">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-xl font-semibold">
            <Handshake className="h-5 w-5" />
            {t("contactTitle")}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("contactText")}</p>
          <Link
            href="/about/contact"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("contactCta")}
          </Link>
        </div>
      </div>
    </div>
  );
}
