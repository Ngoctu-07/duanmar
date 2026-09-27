import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getNewsList } from "@/lib/news-content-provider";
import { NewsItemCard } from "@/components/news/news-item-card";

export const metadata: Metadata = {
  title: "News & Stories | Vietnam Tourism",
  description: "Press releases and travel stories from across Vietnam",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewsPage({ params }: PageProps) {
  const { locale } = await params;
  const [t, items] = await Promise.all([getTranslations("news"), getNewsList(locale)]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {items.map((item) => (
          <NewsItemCard
            key={item.slug}
            item={item}
            href={`/news/${item.slug}`}
            ctaLabel={t("viewArticle")}
          />
        ))}
      </div>
    </div>
  );
}
