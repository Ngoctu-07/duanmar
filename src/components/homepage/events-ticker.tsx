import { Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

interface FestivalItem {
  name: string;
  when: string;
}

export async function EventsTicker() {
  const [t, tf] = await Promise.all([
    getTranslations("events"),
    getTranslations("festivals"),
  ]);
  const items = tf.raw("items") as FestivalItem[];

  return (
    <section className="border-y bg-muted/40 py-10">
      <div className="container mx-auto px-4">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-bold">{t("tickerTitle")}</h2>
          <Link
            href="/explore/events"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("viewCalendar")}
          </Link>
        </div>
        <div className="flex snap-x gap-4 overflow-x-auto pb-2">
          {items.map((festival) => (
            <Link
              key={festival.name}
              href="/explore/events"
              className="flex w-56 shrink-0 snap-start flex-col gap-1 rounded-xl border bg-background p-4 transition-colors hover:bg-muted"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {festival.when}
              </span>
              <span className="text-sm font-medium leading-snug">
                {festival.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
