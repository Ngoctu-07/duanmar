import { defineType, defineField } from "sanity";

export default defineType({
  name: "siteConfiguration",
  title: "Site Configuration",
  type: "document",
  fieldsets: [{ name: "popup", title: "Promo Popup (per-locale)" }],
  fields: [
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
