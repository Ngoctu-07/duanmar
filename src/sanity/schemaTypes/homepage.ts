import { defineType, defineField } from "sanity";

export default defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "heroTitle",
      title: "Hero Title",
      type: "string",
    }),
    defineField({
      name: "heroSubtitle",
      title: "Hero Subtitle",
      type: "string",
      description: "Legacy single-language subtitle. Prefer Hero Slogan below.",
    }),
    defineField({
      name: "heroSlogan",
      title: "Hero Slogan (bilingual)",
      type: "object",
      description:
        "Descriptive line under the H1. Store BOTH languages — {vi, en}. Empty → Hero Subtitle → i18n home.heroSubtitle.",
      fields: [
        defineField({ name: "vi", title: "Tiếng Việt", type: "string" }),
        defineField({ name: "en", title: "English", type: "string" }),
      ],
    }),
    defineField({
      name: "heroImage",
      title: "Hero Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "aboutUsVideo",
      title: "About Us Video",
      type: "file",
      description:
        "Homepage About Us background video (autoplay, muted, looping). Upload MP4/WebM — wins over the URL field.",
      options: { accept: "video/mp4,video/webm" },
    }),
    defineField({
      name: "aboutUsVideoStreamUrl",
      title: "About Us Video URL",
      type: "url",
      description:
        "Direct link to an externally hosted video (mp4/webm). Used only when no file is uploaded.",
    }),
    defineField({
      name: "aboutUsVideoPoster",
      title: "About Us Video Poster",
      type: "image",
      description:
        "Poster shown before playback and as fallback when no video is set.",
      options: { hotspot: true },
    }),
    defineField({
      name: "narrativeStory_en",
      title: "About Us Narrative (EN)",
      type: "array",
      description:
        "Portable Text — multi-paragraph company story / mission / brand history (EN). Empty → falls back to the VI block; both empty → the section renders no paragraph.",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "narrativeStory_vi",
      title: "About Us Narrative (VI)",
      type: "array",
      description:
        "Portable Text — multi-paragraph câu chuyện / sứ mệnh / lịch sử thương hiệu (VI). Empty → falls back to the EN block; both empty → the section renders no paragraph.",
      of: [{ type: "block" }],
    }),
  ],
  preview: {
    select: { title: "title" },
  },
});
