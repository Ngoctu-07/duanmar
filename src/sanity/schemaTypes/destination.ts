import { defineType, defineField } from "sanity";

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
      title: "Description",
      type: "text",
      rows: 3,
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
      name: "lat",
      title: "Latitude",
      type: "number",
      description: "Latitude for the interactive map (-90 to 90). Leave empty if unknown.",
      validation: (rule) => rule.min(-90).max(90),
    }),
    defineField({
      name: "lng",
      title: "Longitude",
      type: "number",
      description: "Longitude for the interactive map (-180 to 180). Leave empty if unknown.",
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
    select: { title: "name", subtitle: "region", media: "galleryImages" },
  },
});
