import type { Metadata } from "next";
import { Calendar, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Events & Festivals Calendar | DuanMar",
  description: "Filter festivals and events across Vietnam by month",
};

interface FestivalItem {
  name: string;
  when: string;
  location: string;
  description: string;
  months: number[];
}

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function parseMonth(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 12) return parsed;
  return new Date().getMonth() + 1;
}

export default async function EventsPage({ searchParams }: PageProps) {
  const { month: rawMonth } = await searchParams;
  const month = parseMonth(rawMonth);
  const [t, tf] = await Promise.all([
    getTranslations("events"),
    getTranslations("festivals"),
  ]);
  const items = tf.raw("items") as FestivalItem[];
  const filtered = items.filter(
    (festival) => Array.isArray(festival.months) && festival.months.includes(month)
  );
  const monthNames = t.raw("monthNames") as string[];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="mb-3 text-4xl font-bold">{t("title")}</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <nav
        aria-label="Filter by month"
        className="mx-auto mb-8 flex max-w-4xl flex-wrap justify-center gap-2"
      >
        {monthNames.map((name, index) => {
          const value = index + 1;
          const active = value === month;
          return (
            <Link
              key={name}
              href={`/explore/events?month=${value}`}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  : "rounded-full border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              }
            >
              {name}
            </Link>
          );
        })}
      </nav>

      <p className="mb-6 text-center text-xs text-muted-foreground">
        {t("lunarNote")}
      </p>

      {filtered.length === 0 ? (
        <p className="mx-auto max-w-3xl text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {filtered.map((festival) => (
            <article key={festival.name} className="rounded-xl border p-6">
              <h2 className="mb-3 text-xl font-semibold">{festival.name}</h2>
              <div className="mb-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {festival.when}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {festival.location}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {festival.description}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          href="/explore/festivals"
          className="text-sm font-medium text-primary hover:underline"
        >
          {tf("title")} →
        </Link>
      </div>
    </div>
  );
}
