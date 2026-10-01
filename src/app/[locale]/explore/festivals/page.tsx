import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Calendar, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Festivals & Events | DuanMar",
  description: "A year-round calendar of celebrations across Vietnam",
};

interface FestivalItem {
  name: string;
  when: string;
  location: string;
  description: string;
}

export default async function FestivalsPage() {
  const [t, tEvents] = await Promise.all([
    getTranslations("festivals"),
    getTranslations("events"),
  ]);
  const items = t.raw("items") as FestivalItem[];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
        <Link
          href="/explore/events"
          className="mt-3 inline-block text-sm font-medium text-link hover:underline"
        >
          {tEvents("viewCalendar")}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {items.map((festival) => (
          <article key={festival.name} className="rounded-xl border p-6">
            <h2 className="text-xl font-semibold mb-3">{festival.name}</h2>
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
            <p className="text-sm text-muted-foreground leading-relaxed">
              {festival.description}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
