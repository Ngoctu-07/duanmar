import { defineQuery } from "next-sanity";

/** Homepage "Stories & Inspiration" band copy (singleton document). */
export const STORIES_SECTION_QUERY = defineQuery(`
  *[_type == "storiesSection"][0]{
    subtitle
  }
`);
