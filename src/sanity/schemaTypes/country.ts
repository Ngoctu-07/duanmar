import { defineType, defineField } from "sanity";

export default defineType({
  name: "country",
  title: "Country",
  type: "document",
  fields: [
    defineField({
      name: "code",
      title: "ISO Code",
      type: "string",
      description: "ISO 3166-1 alpha-2, uppercase (e.g. VN, KR, US).",
      validation: (rule) =>
        rule.required().regex(/^[A-Z]{2}$/, {
          name: "ISO alpha-2 code",
          invert: false,
        }),
    }),
    defineField({
      name: "name",
      title: "Name (bilingual)",
      type: "object",
      description:
        "Every country entry stores BOTH locale strings — e.g. {vi:'Hàn Quốc', en:'South Korea'}.",
      fields: [
        defineField({
          name: "vi",
          title: "Tiếng Việt",
          type: "string",
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: "en",
          title: "English",
          type: "string",
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "name.en", subtitle: "name.vi" },
  },
});
