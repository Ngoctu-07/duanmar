import { PortableText, type PortableTextBlock } from "next-sanity";
import { PT_COMPONENTS } from "@/components/sanity/portable-text";
import { ItineraryDayRow } from "@/components/explore/itinerary-day-row";

export interface ItineraryDay {
  dayTitle: string;
  meals?: string | null;
  details?: PortableTextBlock[] | null;
}

interface ItineraryAccordionProps {
  title: string;
  days: ItineraryDay[];
}

/**
 * Itinerary module for the right column of the tour detail page. Renders the
 * CMS `destination.itinerary[]` days as disclosure rows (see ItineraryDayRow
 * for the interaction); stays a server component so Portable Text — and the
 * `next-sanity` graph behind it — never reaches the client bundle.
 *
 * The page only mounts this when the tour has at least one day, so an empty
 * tour keeps the old single-column layout. `self-start` keeps the card hugging
 * its rows instead of stretching down the taller overview column.
 */
export function ItineraryAccordion({ title, days }: ItineraryAccordionProps) {
  if (days.length === 0) return null;

  return (
    <section
      aria-labelledby="tour-itinerary-heading"
      className="self-start rounded-xl border bg-card p-5"
    >
      <h2
        id="tour-itinerary-heading"
        className="text-xs font-semibold uppercase tracking-widest text-primary"
      >
        {title}
      </h2>

      <ul className="mt-3 divide-y divide-border/60">
        {days.map((day, index) => {
          const details = day.details ?? [];
          const hasDetails = details.length > 0;
          return (
            <ItineraryDayRow
              key={`${index}-${day.dayTitle}`}
              title={day.dayTitle}
              meals={day.meals}
              expandable={hasDetails}
            >
              {hasDetails ? (
                <PortableText value={details} components={PT_COMPONENTS} />
              ) : null}
            </ItineraryDayRow>
          );
        })}
      </ul>
    </section>
  );
}
