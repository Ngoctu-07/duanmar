import { defineField } from "sanity";

/**
 * Single inverted editorial announcement band (homepage singleton).
 *
 * Kept in its own module so the main `homepage` document schema stays small.
 * String/text fields start as empty strings so the client can author content
 * without inheriting placeholder copy. Empty fields hide the section.
 */
export const editorialAnnouncementField = defineField({
  name: "editorialAnnouncement",
  title: "Editorial Announcement",
  type: "object",
  description:
    "Inverted editorial band: overlapping portrait collage on the left, announcement copy and optional CTA on the right. Empty fields hide the section.",
  options: { collapsible: true, collapsed: false },
  fields: [
    defineField({
      name: "announcement",
      title: "Announcement Tag",
      type: "string",
      description: "Small upper-case tag above the headline.",
      initialValue: "",
    }),
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      initialValue: "",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "text",
      rows: 4,
      description: "Long description. Line breaks are preserved on the frontend.",
      initialValue: "",
    }),
    defineField({
      name: "ctaText",
      title: "CTA Text",
      type: "string",
      description: "Optional button label. Leave empty to hide the CTA.",
      initialValue: "",
    }),
    defineField({
      name: "ctaLink",
      title: "CTA Link",
      type: "string",
      description:
        "Site-relative path (/tours) or absolute https:// URL. Invalid values hide the CTA.",
      initialValue: "",
    }),
    defineField({
      name: "bgImage",
      title: "Background Image",
      type: "image",
      description: "Tall portrait image behind the foreground image.",
      options: { hotspot: true },
    }),
    defineField({
      name: "foregroundImage",
      title: "Foreground Image",
      type: "image",
      description: "Smaller portrait image overlapping the bottom-right corner.",
      options: { hotspot: true },
    }),
  ],
});
