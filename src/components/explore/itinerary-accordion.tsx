import { PortableText, type PortableTextBlock } from "next-sanity";
import { PT_COMPONENTS } from "@/components/sanity/portable-text";
import { ItineraryDayRow } from "@/components/explore/itinerary-day-row";
import { filterPortableTextContent } from "@/lib/portable-text-content";

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
 * Itinerary module for the tour detail page: renders the CMS
 * `destination.itinerary[]` days as disclosure rows (see ItineraryDayRow for the
 * interaction); stays a server component so Portable Text — and the
 * `next-sanity` graph behind it — never reaches the client bundle.
 *
 * Mounted in the text column directly below the tour description (before the
 * price block). The page only mounts this when the tour has at least one day.
 * `self-start` keeps the block hugging its rows inside the flex column. Plain
 * typography only: no card, border or fill — days separate by spacing.
 *
 * Expandability is decided by real content, not array length: an editor who
 * opened a day's `details` field but left it blank still has one empty block in
 * the array, which used to render a chevron that opened blank space. Blank
 * blocks are filtered out and the row becomes a static title when nothing is
 * left (see `hasPortableTextContent`).
 */
export function ItineraryAccordion({ title, days }: ItineraryAccordionProps) {
  if (days.length === 0) return null;

  return (
    <section aria-labelledby="tour-itinerary-heading" className="self-start">
      <h2
        id="tour-itinerary-heading"
        className="text-xs font-semibold uppercase tracking-widest text-link"
      >
        {title}
      </h2>

      <ul className="mt-4 space-y-1">
        {days.map((day, index) => {
          // Drop blank Portable Text blocks before deciding expandability, so
          // an empty editor field never renders a dead chevron or an empty
          // paragraph inside the panel.
          const details = filterPortableTextContent(day.details);
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
