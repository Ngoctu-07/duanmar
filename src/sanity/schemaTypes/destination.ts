import { defineArrayMember, defineField, defineType } from "sanity";

// Shared monolingual day shape reused by the base `itinerary` field (primary
// Vietnamese source) and the explicit `itineraryEn` expansion field below
// (safe, non-breaking: base field definitions are untouched).
const itineraryDayMember = defineArrayMember({
  name: "day",
  title: "Day",
  type: "object",
  fields: [
    defineField({
      name: "dayTitle",
      title: "Day title",
      type: "string",
      description: 'Full row heading, e.g. "Ngày 1: Tp. Hồ Chí Minh → Sài Gòn..."',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "meals",
      title: "Meals",
      type: "string",
      description: 'Shown under the title, e.g. "Ăn sáng, trưa, tối". Leave empty when none.',
    }),
    defineField({
      name: "details",
      title: "Details",
      type: "array",
      description:
        "Main activities for the day — revealed when the row is expanded. Paragraphs and lists only: headings are disabled so a day can never inject a stray H1 into the page outline.",
      of: [
        {
          type: "block",
          styles: [{ title: "Normal", value: "normal" }],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Numbered", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
            ],
          },
        },
      ],
    }),
  ],
  preview: {
    select: { title: "dayTitle", subtitle: "meals" },
  },
});

export default defineType({
  name: "destination",
  title: "Destination",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "region",
      title: "Region (legacy)",
      type: "string",
      description:
        "Deprecated. Kept only for existing documents — the destinations page no longer filters by region. Use Country for display instead.",
      options: {
        list: [
          { title: "North", value: "north" },
          { title: "Central", value: "central" },
          { title: "South", value: "south" },
        ],
      },
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description: "Where the tour runs. Trong nước = domestic, Nước ngoài = international.",
      options: {
        list: [
          { title: "Trong nước (Domestic)", value: "domestic" },
          { title: "Nước ngoài (International)", value: "international" },
        ],
      },
      initialValue: "domestic",
      validation: (rule) =>
        rule
          .required()
          .custom(
            (value) =>
              value === "domestic" ||
              value === "international" ||
              'Must be "domestic" or "international"'
          ),
    }),
    defineField({
      name: "country",
      title: "Country",
      type: "reference",
      to: [{ type: "country" }],
      description:
        "Quốc gia / Country. International tour → pick the country (e.g. Hàn Quốc / Korea). Domestic tour → Việt Nam (Vietnam).",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
      description:
        "Primary Vietnamese overview (VI locale renders this directly).",
    }),
    defineField({
      name: "highlights",
      title: "Highlights",
      type: "array",
      description: "Bullet highlights shown on the detail page. Leave empty to hide.",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "inclusions",
      title: "Inclusions",
      type: "array",
      description: "What's included in the tour price. Leave empty to hide.",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "exclusions",
      title: "Exclusions",
      type: "array",
      description: "What's NOT included in the tour price. Leave empty to hide.",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "itinerary",
      title: "Itinerary",
      type: "array",
      description:
        "Day-by-day program shown in the right column of the tour detail page. Primary Vietnamese source (VI locale renders this directly). Listed in order; leave empty to hide the block (page falls back to a single column).",
      of: [itineraryDayMember],
    }),
    defineField({
      name: "descriptionEn",
      title: "Description (English)",
      type: "text",
      rows: 3,
      description:
        "English tour overview. Leave empty to fall back to Description (Vietnamese) — never leaves a blank box.",
    }),
    defineField({
      name: "itineraryEn",
      title: "Itinerary (English)",
      type: "array",
      description:
        "English day-by-day program. Falls back to the base Itinerary (Vietnamese) when empty.",
      of: [itineraryDayMember],
    }),
    defineField({
      name: "cardThumbnail",
      title: "Homepage Card Image (Landscape)",
      type: "image",
      description:
        "Horizontal crop optimized for homepage featured tour cards.",
      options: { hotspot: true },
    }),
    defineField({
      name: "mainPoster",
      title: "Main Poster Image (Portrait / Standard)",
      type: "image",
      description: "Standard full-size poster for detail pages and modals.",
      options: { hotspot: true },
    }),
    defineField({
      name: "posterImage",
      title: "Legacy Poster Image (deprecated)",
      type: "image",
      description:
        "Deprecated single-image field. Use Homepage Card Image + Main Poster instead; existing artwork is copied by `npm run migrate:tour-images` and still renders as a fallback until then.",
      options: { hotspot: true },
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "geopoint",
      description:
        "Exact tour coordinates for the Google Maps routing. Preferred over Latitude/Longitude below.",
    }),
    defineField({
      name: "lat",
      title: "Latitude",
      type: "number",
      description:
        "Deprecated — use Location above. Kept as fallback for existing documents (-90 to 90).",
      validation: (rule) => rule.min(-90).max(90),
    }),
    defineField({
      name: "lng",
      title: "Longitude",
      type: "number",
      description:
        "Deprecated — use Location above. Kept as fallback for existing documents (-180 to 180).",
      validation: (rule) => rule.min(-180).max(180),
    }),
    defineField({
      name: "isFeatured",
      title: "Featured",
      type: "boolean",
      description:
        "Show this tour in the Homepage Featured Destinations section.",
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "category",
      cardThumbnail: "cardThumbnail",
      mainPoster: "mainPoster",
      legacyPoster: "posterImage",
    },
    prepare: ({ title, subtitle, cardThumbnail, mainPoster, legacyPoster }) => ({
      title,
      subtitle,
      media: cardThumbnail ?? mainPoster ?? legacyPoster,
    }),
  },
});
