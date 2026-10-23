import { getTranslations } from "next-intl/server";

interface TourDetailExtrasProps {
  highlights: string[];
  included: string[];
  excluded: string[];
}

/**
 * Secondary tour facts that sit below the poster layout: highlights plus the
 * inclusion/exclusion cards. Kept out of the text column so the required order
 * (title → description → itinerary → price) stays intact, while the content
 * itself is still reachable on every tour that defines it.
 */
export async function TourDetailExtras({
  highlights,
  included,
  excluded,
}: TourDetailExtrasProps) {
  if (highlights.length === 0 && included.length === 0 && excluded.length === 0) {
    return null;
  }

  const t = await getTranslations("destinations");

  return (
    <div className="mt-14 space-y-8 border-t border-border/60 pt-8">
      {highlights.length > 0 && (
        <section aria-label={t("highlights")} className="max-w-3xl">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-link">
            {t("highlights")}
          </h2>
          <ul className="mt-3 space-y-2">
            {highlights.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span aria-hidden className="mt-0.5 text-link">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(included.length > 0 || excluded.length > 0) && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {included.length > 0 && (
            <div className="rounded-none border bg-card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-link">
                {t("included")}
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
                {included.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {excluded.length > 0 && (
            <div className="rounded-none border bg-card p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-link">
                {t("excluded")}
              </h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
                {excluded.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
