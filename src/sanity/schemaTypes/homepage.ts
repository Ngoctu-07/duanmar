import { defineType, defineField } from "sanity";
import { editorialAnnouncementField } from "./homepage-editorial-announcement";

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
      description:
        "Poster / fallback frame for the full-viewport homepage hero (shown before the promo video plays or when no video is set).",
      options: { hotspot: true },
    }),
    defineField({
      name: "heroBackgroundMedia",
      title: "Hero Background Media (video / GIF)",
      type: "file",
      description:
        "Full-viewport (100vh) homepage hero background. Upload an MP4/WebM loop or an animated GIF — rendered autoplay, muted, looping. Empty → Hero Image / promo poster.",
      options: { accept: "video/mp4,video/webm,image/gif" },
    }),
    defineField({
      name: "heroPromoVideo",
      title: "Hero Promo Video (centered)",
      type: "file",
      description:
        "Smaller promo clip centered over the hero background (never full-bleed). Upload MP4/WebM — rendered autoplay, muted, looping. Falls back to the legacy Hero Promo Video fields below.",
      options: { accept: "video/mp4,video/webm" },
    }),
    defineField({
      name: "promoVideo",
      title: "Hero Promo Video (legacy fallback)",
      type: "file",
      description:
        "Legacy hero video. Used only when Hero Promo Video (centered) is empty. Upload MP4/WebM — wins over the URL field.",
      options: { accept: "video/mp4,video/webm" },
    }),
    defineField({
      name: "promoVideoUrl",
      title: "Hero Promo Video URL",
      type: "url",
      description:
        "Direct link to an externally hosted hero video (mp4/webm). Used only when no file is uploaded.",
    }),
    defineField({
      name: "promoVideoPoster",
      title: "Hero Promo Video Poster",
      type: "image",
      description:
        "Frame shown before the hero video starts (and as fallback if it fails to load). Falls back to the Hero Image.",
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
    editorialAnnouncementField,
  ],
  preview: {
    select: { title: "title" },
  },
});
