import { defineType, defineField } from "sanity";

/**
 * Selectable account avatars, managed entirely in the Studio.
 *
 * Visitors can only pick one of these active presets — the profile UI never
 * exposes a file upload. The document id is stored on the user record together
 * with the resolved asset URL (see `/api/account/avatar`).
 */
export default defineType({
  name: "avatarPreset",
  title: "Avatar presets",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: 'Internal label, e.g. "Haunted lantern" or "Red skull".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "image",
      title: "Avatar image",
      type: "image",
      description:
        "Square artwork works best. Shown as-is in the account avatar picker (96×96 on the profile, 64×64 in the grid).",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      description: "Turn off to hide this preset from the picker without deleting it.",
      initialValue: true,
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "Lower numbers appear first in the picker.",
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: "Picker order",
      name: "pickerOrder",
      by: [
        { field: "order", direction: "asc" },
        { field: "name", direction: "asc" },
      ],
    },
  ],
  preview: {
    select: { title: "name", subtitle: "isActive", media: "image" },
    prepare({ title, subtitle, media }) {
      return {
        title: title ?? "Avatar preset",
        subtitle: subtitle === false ? "Inactive" : "Active",
        media,
      };
    },
  },
});
