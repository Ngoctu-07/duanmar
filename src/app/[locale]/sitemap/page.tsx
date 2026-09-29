import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getNewsList } from "@/lib/news-content-provider";

export const metadata: Metadata = {
  title: "HTML Sitemap | DuanMar",
  description: "Every section of DuanMar in one place",
};

interface SiteLink {
  href: string;
  label: string;
}

interface TitledItem {
  title: string;
}

export default async function HtmlSitemapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tc, tf, tm, tp, ttd, tit] = await Promise.all([
    getTranslations("sitemapPage"),
    getTranslations("common"),
    getTranslations("footer"),
    getTranslations("mice"),
    getTranslations("planTrip"),
    getTranslations("thingsToDo"),
    getTranslations("itineraries"),
  ]);
  const categories = tRaw<TitledItem>(ttd, "categories");
  const itineraries = tRaw<TitledItem>(tit, "items");
  const newsList = await getNewsList(locale);
  const allGuides = tRaw<TitledItem>(tp, "guides");

  const groups: { heading: string; links: SiteLink[] }[] = [
    {
      heading: tc("explore"),
      links: [
        { href: "/explore", label: t("overview") },
        { href: "/explore/destinations", label: tf("destinations") },
        { href: "/explore/things-to-do", label: tf("thingsToDo") },
        ...Object.entries(categories).map(([slug, item]) => ({
          href: `/explore/things-to-do/${slug}`,
          label: item.title,
        })),
        { href: "/explore/itineraries", label: tf("itineraries") },
        ...Object.entries(itineraries).map(([slug, item]) => ({
          href: `/explore/itineraries/${slug}`,
          label: item.title,
        })),
        { href: "/explore/festivals", label: tf("festivals") },
        { href: "/explore/events", label: tf("events") },
        { href: "/explore/map", label: t("map") },
      ],
    },
    {
      heading: tc("planTrip"),
      links: [
        { href: "/plan-your-trip", label: t("overview") },
        ...Object.entries(allGuides).map(([slug, guide]) => ({
          href: `/plan-your-trip/${slug}`,
          label: guide.title,
        })),
      ],
    },
    {
      heading: t("discover"),
      links: [
        { href: "/tours/domestic", label: tc("domesticTours") },
        { href: "/tours/international", label: tc("internationalTours") },
        { href: "/culture", label: tc("culture") },
        { href: "/deals", label: tc("deals") },
        ...newsList.map((item) => ({
          href: `/blog/${item.slug}`,
          label: item.title,
        })),
        { href: "/blog", label: tf("blog") },
      ],
    },
    {
      heading: t("partners"),
      links: [
        { href: "/trade", label: tf("trade") },
        { href: "/business-mice", label: tm("title") },
      ],
    },
    {
      heading: tc("about"),
      links: [
        { href: "/about", label: tf("aboutUs") },
        { href: "/contact", label: tf("contact") },
        { href: "/about/careers", label: tf("careers") },
        { href: "/about/press", label: tf("pressKit") },
        { href: "/support", label: tf("support") },
        { href: "/privacy", label: tf("privacy") },
        { href: "/accessibility", label: tf("accessibility") },
      ],
    },
    {
      heading: t("tools"),
      links: [
        { href: "/search", label: tc("search") },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-4xl font-bold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mb-8 text-center">
        <Link
          href="/"
          className="text-sm font-medium transition-colors hover:text-foreground"
        >
          {t("home")}
        </Link>
      </div>

      <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <section key={group.heading}>
            <h2 className="mb-3 text-lg font-semibold">{group.heading}</h2>
            <ul className="space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

interface RawCapable {
  (key: string): string;
  raw: (key: string, values?: Record<string, unknown>) => unknown;
}

function tRaw<T>(t: RawCapable, key: string): Record<string, T> {
  return t.raw(key) as Record<string, T>;
}
