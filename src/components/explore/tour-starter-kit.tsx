import { getTranslations } from "next-intl/server";

interface TourStarterKitProps {
  items: string[];
}

/**
 * "Starter kit" — the tour's authored highlights rendered at the top of the
 * main reading column (between the opening storyline and the itinerary).
 * Plain typography: red uppercase heading + a ticked list, no card chrome.
 */
export async function TourStarterKit({ items }: TourStarterKitProps) {
  if (items.length === 0) return null;

  const t = await getTranslations("destinations");

  return (
    <section aria-label={t("highlights")} className="self-start">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-link">
        {t("highlights")}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span aria-hidden className="mt-0.5 text-link">
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
