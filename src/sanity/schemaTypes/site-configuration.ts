import { defineType, defineField, defineArrayMember } from "sanity";

/**
 * Platform-wide site settings (global singleton, see `structure.ts`).
 * `socialLinks` drives the Contact Section cards and the Footer contact column —
 * each entry shows `displayText` and links out to `targetUrl` when set.
 */
export default defineType({
  name: "siteConfiguration",
  title: "Site Configuration",
  type: "document",
  fieldsets: [
    { name: "popup", title: "Promo Popup (per-locale)" },
    { name: "contact", title: "Social & Contact Links" },
  ],
  fields: [
    defineField({
      name: "socialLinks",
      title: "Social & contact links",
      type: "array",
      description:
        "Platform handles shown in the Contact Section and Footer. Leave targetUrl empty to show the handle as plain text (no dead link).",
      fieldset: "contact",
      of: [
        defineArrayMember({
          name: "socialLink",
          title: "Social link",
          type: "object",
          fields: [
            defineField({
              name: "platform",
              title: "Platform",
              type: "string",
              description: "Where this handle points — used as the row label.",
              options: {
                layout: "dropdown",
                list: [
                  { title: "Facebook", value: "facebook" },
                  { title: "Instagram", value: "instagram" },
                  { title: "TikTok", value: "tiktok" },
                  { title: "YouTube", value: "youtube" },
                  { title: "LinkedIn", value: "linkedin" },
                  { title: "X (Twitter)", value: "x" },
                  { title: "Other", value: "other" },
                ],
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "displayText",
              title: "Display text / handle",
              type: "string",
              description: 'Visible label on the site, e.g. "DuanMar" or "@duanmar.official".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "targetUrl",
              title: "Target URL",
              type: "url",
              description:
                "Destination opened in a new tab. Optional — when empty the display text renders as plain text.",
              validation: (rule) => rule.uri({ allowRelative: false, scheme: ["https", "http"] }),
            }),
          ],
          preview: {
            select: { title: "displayText", subtitle: "platform" },
          },
        }),
      ],
    }),
    defineField({
      name: "footerSlogan",
      title: "Footer Slogan (bilingual)",
      type: "object",
      description:
        "Text shown under the DuanMar logo in the global footer. Store BOTH languages — {vi, en}. Empty → i18n footer.tagline.",
      fields: [
        defineField({ name: "vi", title: "Tiếng Việt", type: "string" }),
        defineField({ name: "en", title: "English", type: "string" }),
      ],
    }),
    defineField({
      name: "enableEntryPopup",
      title: "Enable Entry Popup",
      type: "boolean",
      description:
        "Turn off to hide the entry promo modal between campaigns. The modal also stays hidden until Promo Modal Asset is uploaded.",
      initialValue: true,
    }),
    defineField({
      name: "entryPopupImage",
      title: "Promo Modal Asset (fallback)",
      type: "image",
      description:
        "Legacy shared asset. Used when the active locale has no popupImage_vi/popupImage_en.",
      options: { hotspot: true },
    }),
    defineField({
      name: "popupImage_vi",
      title: "Promo Modal Image (VI)",
      type: "image",
      description: "Vietnamese popup asset. Fallback: Promo Modal Asset → EN asset.",
      options: { hotspot: true },
      fieldset: "popup",
    }),
    defineField({
      name: "popupImage_en",
      title: "Promo Modal Image (EN)",
      type: "image",
      description: "English popup asset. Fallback: Promo Modal Asset → VI asset.",
      options: { hotspot: true },
      fieldset: "popup",
    }),
  ],
});
