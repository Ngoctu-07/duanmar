import { getTranslations } from "next-intl/server";

interface TourDetailExtrasProps {
  included: string[];
  excluded: string[];
}

/**
 * Secondary tour facts below the two-column body: the inclusion/exclusion
 * cards. Highlights moved up into the main column as the starter-kit list, so
 * this module only carries the practical fine print.
 */
export async function TourDetailExtras({
  included,
  excluded,
}: TourDetailExtrasProps) {
  if (included.length === 0 && excluded.length === 0) {
    return null;
  }

  const t = await getTranslations("destinations");

  return (
    <div className="mt-14 border-t border-border/60 pt-8">
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
    </div>
  );
}
