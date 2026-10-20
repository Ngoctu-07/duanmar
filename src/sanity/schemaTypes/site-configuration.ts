import { defineType, defineField } from "sanity";

/**
 * Absolute-URL field for a single social channel inside `contactSettings`.
 * Optional + http(s)-only so an empty value hides the channel everywhere.
 */
const contactUrlField = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: "url",
    description: "Full profile URL. Leave empty to hide this channel everywhere.",
    validation: (rule) =>
      rule.uri({ allowRelative: false, scheme: ["https", "http"] }),
  });

/**
 * Optional explicit display handle paired with a social URL. Shown as the
 * visible Contact-page card text (the URL stays the link target, never the
 * label). Leave empty to fall back to the sanitized domain / platform name.
 */
const contactHandleField = (name: string, title: string, example: string) =>
  defineField({
    name,
    title,
    type: "string",
    description: `Display handle on the Contact page, e.g. "${example}". Empty → sanitized domain / platform name.`,
  });

/**
 * Platform-wide site settings (global singleton, see `structure.ts`).
 *
 * `contactSettings` is the single source of truth for both the Footer contact
 * column and the Contact page grid — 7 explicit channels (phone, email and five
 * social URLs). Any empty field is omitted from both surfaces automatically, so
 * an unfilled channel never leaves a blank slot.
 */
export default defineType({
  name: "siteConfiguration",
  title: "Site Configuration",
  type: "document",
  fieldsets: [{ name: "popup", title: "Promo Popup (per-locale)" }],
  fields: [
    defineField({
      name: "contactSettings",
      title: "Contact Settings",
      type: "object",
      description:
        "Single source of truth for the Footer contact column and the Contact page grid. Empty channels are hidden on both. Optional *Handle fields set the Contact-page label only (Footer always shows plain platform labels).",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: "phone",
          title: "Phone",
          type: "string",
          description:
            'Primary phone, e.g. "+84 28 3822 0000". Rendered as a tel: link.',
        }),
        defineField({
          name: "email",
          title: "Email",
          type: "string",
          description:
            'Primary email, e.g. "info@vietnam-tourism.com". Rendered as a mailto: link.',
        }),
        contactUrlField("facebookUrl", "Facebook URL"),
        contactHandleField("facebookHandle", "Facebook Handle", "DuanMar Official"),
        contactUrlField("tiktokUrl", "TikTok URL"),
        contactHandleField("tiktokHandle", "TikTok Handle", "@d.n.mar1"),
        contactUrlField("instagramUrl", "Instagram URL"),
        contactHandleField("instagramHandle", "Instagram Handle", "@duanmar.travel"),
        contactUrlField("threadsUrl", "Threads URL"),
        contactHandleField("threadsHandle", "Threads Handle", "@duanmar._"),
        contactUrlField("youtubeUrl", "YouTube URL"),
        contactHandleField("youtubeHandle", "YouTube Handle", "@DuanMarTravel"),
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
      name: "paymentSettings",
      title: "Payment Settings",
      type: "object",
      description:
        "Web3 / crypto payment configuration. If the wallet address is empty, the crypto payment rail is hidden and a fallback message is shown instead.",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: "cryptoWalletAddress",
          title: "Crypto Wallet Address",
          type: "string",
          description:
            'Business EVM deposit wallet address, e.g. "0x...". Used for MetaMask / Trust Wallet / Coinbase Wallet QR codes. Leave empty to disable crypto payments.',
          validation: (rule) =>
            rule.custom((value: string | undefined) => {
              if (!value) return true;
              if (!/^0x[0-9a-fA-F]{40}$/.test(value.trim())) {
                return "Must be a valid EVM address (0x + 40 hex chars)";
              }
              return true;
            }),
        }),
        defineField({
          name: "metamaskWalletAddress",
          title: "MetaMask Wallet Address",
          type: "string",
          description:
            'Alternative MetaMask-specific deposit address. Falls back to "Crypto Wallet Address" when empty.',
          validation: (rule) =>
            rule.custom((value: string | undefined) => {
              if (!value) return true;
              if (!/^0x[0-9a-fA-F]{40}$/.test(value.trim())) {
                return "Must be a valid EVM address (0x + 40 hex chars)";
              }
              return true;
            }),
        }),
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
