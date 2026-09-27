import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getNewsArticle, type NewsItem } from "@/lib/news-content-provider";

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>;
}

async function getArticle(slug: string, locale: string) {
  const data = await getNewsArticle(slug, locale);
  if (!data) return null;
  const t = await getTranslations("news");
  return { t, data: data as NewsItem };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: slugParts, locale } = await params;
  const slug = slugParts.join("/");
  const result = await getArticle(slug, locale);
  if (!result) return {};
  return {
    title: `${result.data.title} | Vietnam Tourism`,
    description: result.data.excerpt,
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug: slugParts, locale } = await params;
  const slug = slugParts.join("/");
  const result = await getArticle(slug, locale);

  if (!result) notFound();

  const { t, data } = result;

  return (
    <div className="container mx-auto px-4 py-16">
      <Link
        href="/news"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← {t("backToList")}
      </Link>

      <article className="mt-6 max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
            {data.category}
          </span>
          <span>{data.date}</span>
        </div>
        <h1 className="text-4xl font-bold mb-4">{data.title}</h1>
        <p className="text-lg text-muted-foreground mb-8">{data.excerpt}</p>

        <div className="space-y-5">
          {data.content.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-muted-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
