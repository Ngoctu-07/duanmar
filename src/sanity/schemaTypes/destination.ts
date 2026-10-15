import { defineArrayMember, defineField, defineType } from "sanity";

// Bilingual editorial shape: `{ vi, en }`. Vietnamese is the authoring
// language (required where the legacy single-language field was required);
// English is optional — the frontend falls back to `vi` when `en` is empty.
// Legacy plain-string docs are migrated by
// `scripts/backfill-destination-localization.mjs` (string → `{ vi }`).
export default defineType({
  name: "destination",
  title: "Destination",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name (tour title, bilingual)",
      type: "object",
      validation: (rule) => rule.required(),
      description:
        "Tour title in both languages. Existing single-language titles migrate to Tiếng Việt.",
      fields: [
        defineField({ name: "vi", title: "Tiếng Việt", type: "string", validation: (rule) => rule.required() }),
        defineField({ name: "en", title: "English", type: "string" }),
      ],
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name.vi", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "region",
      title: "Region",
      type: "string",
      description:
        "Deprecated — legacy North/Central/South filter (listing/map/search). Frontend card/detail display uses Country.",
      options: {
        list: [
          { title: "North", value: "north" },
          { title: "Central", value: "central" },
          { title: "South", value: "south" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "isSpecialTour",
      title: "Special Tour",
      type: "boolean",
      description:
        "Turn on to flag this tour as a special tour. Also shows the Challenge Level (Cấp độ thử thách) step in the booking form.",
      initialValue: false,
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
      title: "Description (overview, bilingual)",
      type: "object",
      description: "Tour overview shown under the title on the detail page.",
      fields: [
        defineField({ name: "vi", title: "Tiếng Việt", type: "text", rows: 3 }),
        defineField({ name: "en", title: "English", type: "text", rows: 3 }),
      ],
    }),
    defineField({
      name: "highlights",
      title: "Highlights (bilingual)",
      type: "object",
      description: "Bullet highlights shown on the detail page. Leave empty to hide.",
      fields: [
        defineField({ name: "vi", title: "Tiếng Việt", type: "array", of: [{ type: "string" }] }),
        defineField({ name: "en", title: "English", type: "array", of: [{ type: "string" }] }),
      ],
    }),
    defineField({
      name: "inclusions",
      title: "Inclusions (bilingual)",
      type: "object",
      description: "What's included in the tour price. Leave empty to hide.",
      fields: [
        defineField({ name: "vi", title: "Tiếng Việt", type: "array", of: [{ type: "string" }] }),
        defineField({ name: "en", title: "English", type: "array", of: [{ type: "string" }] }),
      ],
    }),
    defineField({
      name: "exclusions",
      title: "Exclusions (bilingual)",
      type: "object",
      description: "What's NOT included in the tour price. Leave empty to hide.",
      fields: [
        defineField({ name: "vi", title: "Tiếng Việt", type: "array", of: [{ type: "string" }] }),
        defineField({ name: "en", title: "English", type: "array", of: [{ type: "string" }] }),
      ],
    }),
    defineField({
      name: "itinerary",
      title: "Itinerary",
      type: "array",
      description:
        "Day-by-day program shown in the right column of the tour detail page. Listed in order; leave empty to hide the block (page falls back to a single column).",
      of: [
        defineArrayMember({
          name: "day",
          title: "Day",
          type: "object",
          fields: [
            defineField({
              name: "dayTitle",
              title: "Day title (bilingual)",
              type: "object",
              validation: (rule) => rule.required(),
              description: 'Full row heading, e.g. "Ngày 1: Tp. Hồ Chí Minh → Sài Gòn..."',
              fields: [
                defineField({ name: "vi", title: "Tiếng Việt", type: "string", validation: (rule) => rule.required() }),
                defineField({ name: "en", title: "English", type: "string" }),
              ],
            }),
            defineField({
              name: "meals",
              title: "Meals (bilingual)",
              type: "object",
              description: 'Shown under the title, e.g. "Ăn sáng, trưa, tối". Leave empty when none.',
              fields: [
                defineField({ name: "vi", title: "Tiếng Việt", type: "string" }),
                defineField({ name: "en", title: "English", type: "string" }),
              ],
            }),
            defineField({
              name: "details",
              title: "Details (bilingual)",
              type: "object",
              description:
                "Main activities for the day — revealed when the row is expanded. Paragraphs and lists only: headings are disabled so a day can never inject a stray H1 into the page outline.",
              fields: [
                defineField({
                  name: "vi",
                  title: "Tiếng Việt",
                  type: "array",
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
                defineField({
                  name: "en",
                  title: "English",
                  type: "array",
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
            }),
          ],
          preview: {
            select: { title: "dayTitle.vi", subtitle: "meals.vi" },
          },
        }),
      ],
    }),
    defineField({
      name: "galleryImages",
      title: "Gallery Images",
      type: "array",
      description:
        "At least 3 images. The first one (galleryImages[0]) is the cover thumbnail on every listing card; all of them feed the tour detail hero carousel.",
      of: [{ type: "image", options: { hotspot: true } }],
      validation: (rule) => rule.min(3).required(),
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
    select: { title: "name.vi", subtitle: "region", media: "galleryImages" },
  },
});
