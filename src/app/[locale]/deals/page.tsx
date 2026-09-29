import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Deals & Packages | DuanMar",
  description: "Curated offers for your Vietnam journey",
};

interface DealItem {
  tag: string;
  title: string;
  description: string;
  terms: string;
}

export default async function DealsPage() {
  const t = await getTranslations("deals");
  const items = t.raw("items") as DealItem[];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {items.map((deal) => (
          <article key={deal.title} className="flex flex-col rounded-xl border p-6">
            <span className="mb-3 w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {deal.tag}
            </span>
            <h2 className="text-xl font-semibold mb-2">{deal.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{deal.description}</p>
            <p className="mt-auto text-xs text-muted-foreground">{deal.terms}</p>
          </article>
        ))}
      </div>

      <p className="mt-8 max-w-4xl mx-auto text-center text-xs text-muted-foreground">
        {t("disclaimer")}
      </p>
    </div>
  );
}
