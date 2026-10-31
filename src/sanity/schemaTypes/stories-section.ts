import { defineType, defineField } from "sanity";
import { STORIES_SECTION_SUBTITLE_DEFAULT } from "../../lib/stories-section-copy";

/**
 * Singleton-ish document backing the homepage "Câu chuyện & cảm hứng" band
 * (see `structure.ts` — fixed document id `storiesSection`).
 */
export default defineType({
  name: "storiesSection",
  title: "Stories & Inspiration Section",
  type: "document",
  fields: [
    defineField({
      name: "subtitle",
      title: "Subtitle (VI)",
      type: "string",
      description:
        "Line under the section title. Vietnamese copy — the English locale keeps its i18n subtitle.",
      initialValue: STORIES_SECTION_SUBTITLE_DEFAULT,
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    select: { title: "subtitle" },
    prepare: ({ title }) => ({
      title: title || "Stories & Inspiration Section",
    }),
  },
});
