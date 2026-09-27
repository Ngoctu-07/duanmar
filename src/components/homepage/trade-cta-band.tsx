import { Briefcase, Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function TradeCtaBand() {
  const t = await getTranslations("home");
  const trade = t.raw("trade") as {
    title: string;
    tradeCta: string;
    mediaCta: string;
  };

  return (
    <section className="border-y bg-muted/40 py-12">
      <div className="container mx-auto px-4 text-center">
        <h2 className="mb-6 text-2xl font-bold">{trade.title}</h2>
        <div className="mx-auto flex max-w-2xl flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/trade"
            className="flex items-center justify-center gap-2 rounded-lg border bg-background px-6 py-3 font-medium transition-colors hover:bg-muted"
          >
            <Briefcase className="h-4 w-4" />
            {trade.tradeCta}
          </Link>
          <Link
            href="/about/press"
            className="flex items-center justify-center gap-2 rounded-lg border bg-background px-6 py-3 font-medium transition-colors hover:bg-muted"
          >
            <Newspaper className="h-4 w-4" />
            {trade.mediaCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
