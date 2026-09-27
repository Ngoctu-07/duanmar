import { defineType, defineField } from "sanity";

export default defineType({
  name: "post",
  title: "News & Stories",
  type: "document",
  fieldsets: [
    { name: "en", title: "English" },
    { name: "vi", title: "Tiếng Việt", options: { collapsed: true } },
  ],
  fields: [
    defineField({
      name: "title_en",
      title: "Title (EN)",
      type: "string",
      fieldset: "en",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt_en",
      title: "Excerpt (EN)",
      type: "text",
      rows: 3,
      fieldset: "en",
    }),
    defineField({
      name: "content_en",
      title: "Content (EN) — one paragraph per block",
      type: "array",
      of: [{ type: "text", rows: 6 }],
      fieldset: "en",
    }),
    defineField({
      name: "title_vi",
      title: "Title (VI)",
      type: "string",
      fieldset: "vi",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt_vi",
      title: "Excerpt (VI)",
      type: "text",
      rows: 3,
      fieldset: "vi",
    }),
    defineField({
      name: "content_vi",
      title: "Content (VI) — mỗi đoạn 1 block",
      type: "array",
      of: [{ type: "text", rows: 6 }],
      fieldset: "vi",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title_en", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Press Release", value: "pressRelease" },
          { title: "Story", value: "story" },
        ],
      },
      initialValue: "pressRelease",
    }),
    defineField({
      name: "publishedAt",
      title: "Published date",
      type: "date",
      validation: (rule) => rule.required(),
      initialValue: () => new Date().toISOString().slice(0, 10),
    }),
  ],
  orderings: [
    {
      title: "Published date, new first",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
});
