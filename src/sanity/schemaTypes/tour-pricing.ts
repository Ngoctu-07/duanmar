import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Studio preview title MUST be a string: the document breadcrumb runs
 * `title?.toLowerCase()` and optional chaining does not guard against numbers,
 * which crashed the Studio when a tier row was opened (`minGuests` is a number).
 */
export function tierPreviewLabel(
  min: number | null | undefined,
  max: number | null | undefined
): string {
  if (min == null) return "Tier";
  if (max == null) return `${min}+ guests`;
  if (min === max) return `${min} guests`;
  return `${min}–${max} guests`;
}

/**
 * Price tiers for a tour (itinerary or destination), keyed by tour slug.
 * Prices are entered per currency so no exchange-rate math happens in the UI.
 */
export default defineType({
  name: "tourPricing",
  title: "Tour Pricing",
  type: "document",
  fields: [
    defineField({
      name: "tourSlug",
      title: "Tour slug",
      type: "string",
      description:
        "Exact slug of the tour this pricing belongs to: an itinerary slug (messages key, e.g. classic-north) or a destination slug (e.g. hcm). A typo silently hides the block on the site.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tiers",
      title: "Price tiers",
      type: "array",
      description:
        "One row per group size, listed smallest first. Leave max guests empty for an open-ended tier (e.g. 8+) and keep it as the last row.",
      validation: (rule) =>
        rule
          .min(1)
          .required()
          .custom((tiers) => {
            if (!Array.isArray(tiers)) return true;

            const seen = new Set<number>();
            let previousMax = 0;

            for (const tier of tiers as Array<{
              minGuests?: number;
              maxGuests?: number | null;
            }>) {
              const min = tier?.minGuests;
              const max = tier?.maxGuests ?? null;

              if (!Number.isInteger(min) || (min as number) < 1) {
                return "Every tier needs a whole number of min guests (1 or more).";
              }
              if (
                max !== null &&
                (!Number.isInteger(max) || (max as number) < (min as number))
              ) {
                return `Tier starting at ${min} guests must have max guests of ${min} or more.`;
              }
              if (seen.has(min as number)) {
                return `Duplicate tier starting at ${min} guests — each tier needs a unique min guests value.`;
              }
              if ((min as number) <= previousMax) {
                return `Tier starting at ${min} guests overlaps the previous tier.`;
              }

              seen.add(min as number);
              previousMax = max === null ? Number.MAX_SAFE_INTEGER : max;
            }

            return true;
          }),
      of: [
        defineArrayMember({
          name: "tier",
          title: "Tier",
          type: "object",
          fields: [
            defineField({
              name: "minGuests",
              title: "Min guests",
              type: "number",
              validation: (rule) => rule.required().min(1).integer(),
            }),
            defineField({
              name: "maxGuests",
              title: "Max guests",
              type: "number",
              description: "Leave empty for an open-ended tier (8+).",
              validation: (rule) => rule.min(1).integer(),
            }),
            defineField({
              name: "pricePerGuestVnd",
              title: "Price per guest (VND)",
              type: "number",
              validation: (rule) => rule.required().min(1),
            }),
            defineField({
              name: "pricePerGuestUsd",
              title: "Price per guest (USD)",
              type: "number",
              validation: (rule) => rule.required().min(1),
            }),
            defineField({
              name: "groupTotalVnd",
              title: "Group total (VND)",
              type: "number",
              description:
                "Total for the smallest group size in this tier (min guests × price per guest).",
              validation: (rule) => rule.required().min(1),
            }),
            defineField({
              name: "groupTotalUsd",
              title: "Group total (USD)",
              type: "number",
              description:
                "Total for the smallest group size in this tier (min guests × price per guest).",
              validation: (rule) => rule.required().min(1),
            }),
          ],
          preview: {
            select: {
              min: "minGuests",
              max: "maxGuests",
              totalVnd: "groupTotalVnd",
            },
            prepare: ({ min, max, totalVnd }) => ({
              title: tierPreviewLabel(min, max),
              subtitle: totalVnd == null ? undefined : `${totalVnd}₫`,
            }),
          },
        }),
      ],
    }),
    defineField({
      name: "maxCapacity",
      title: "Max daily capacity (pax per date)",
      type: "number",
      description:
        "Global capacity for this tour: total pax allowed per departure date (1–999). The booking calendar subtracts confirmed bookings from this number; dates reach \"sold out\" only when 0 remain. Leave empty to hide availability.",
      validation: (rule) => rule.min(1).max(999).integer(),
    }),
  ],
  preview: {
    select: { title: "tourSlug", subtitle: "tiers.0.groupTotalVnd" },
  },
});
