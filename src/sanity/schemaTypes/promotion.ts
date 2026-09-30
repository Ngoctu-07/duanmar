import { defineType, defineField } from "sanity";

/**
 * `promotion` drives the /deals ("Promotions & Travel Packages") page.
 * Bilingual strings follow the house pattern (flat `_en`/`_vi` + fieldsets,
 * same as `article`). `bannerImage.alt` is the first editable image alt text
 * in this repo — every query already projects `alt` via `imageFragment`.
 */
export default defineType({
  name: "promotion",
  title: "Promotions & Packages",
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
      name: "badgeTag_en",
      title: "Badge tag (EN)",
      type: "string",
      description: 'Offer highlight shown as the chip, e.g. "20% OFF", "Hot Deal".',
      fieldset: "en",
    }),
    defineField({
      name: "description_en",
      title: "Description (EN)",
      type: "text",
      rows: 3,
      description: "Package terms and inclusions.",
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
      name: "badgeTag_vi",
      title: "Badge tag (VI)",
      type: "string",
      description: 'Nhãn ưu đãi hiển thị trên chip, ví dụ "Giảm 20%", "Hot Deal".',
      fieldset: "vi",
    }),
    defineField({
      name: "description_vi",
      title: "Description (VI)",
      type: "text",
      rows: 3,
      description: "Điều khoản và nội dung bao gồm của gói.",
      fieldset: "vi",
    }),
    defineField({
      name: "discountedPrice",
      title: "Discounted price",
      type: "number",
      description: "Price after discount, in the currency below. Leave empty to show no price.",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "originalPrice",
      title: "Original price",
      type: "number",
      description: "Price before discount — rendered struck-through when present.",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "currency",
      title: "Currency",
      type: "string",
      options: {
        layout: "radio",
        list: [
          { title: "VND (₫)", value: "VND" },
          { title: "USD ($)", value: "USD" },
        ],
      },
      description:
        "Currency of both price fields. Stored per promotion (not switched by page locale) so the amount is never mislabelled.",
      initialValue: "VND",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "bannerImage",
      title: "Banner image",
      type: "image",
      options: { hotspot: true },
      description: "Card banner. Alt text is required for accessibility.",
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          description: "Describe the image for screen readers.",
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "validUntil",
      title: "Valid until",
      type: "date",
      description:
        "Last day the offer is shown (inclusive). The site hides the promotion after this date automatically.",
      validation: (rule) => rule.required(),
      initialValue: () => new Date().toISOString().slice(0, 10),
    }),
    defineField({
      name: "targetTour",
      title: "Target tour",
      type: "reference",
      to: [{ type: "destination" }],
      description:
        "Tour this promotion links to. The card shows a “View tour” button when set (and the tour has a slug).",
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      description: "Turn off to hide the promotion without deleting it.",
      initialValue: true,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "title_en", subtitle: "validUntil", media: "bannerImage" },
  },
});
