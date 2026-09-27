import { defineQuery } from "next-sanity";

export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    _id,
    title_en,
    title_vi,
    excerpt_en,
    excerpt_vi,
    content_en,
    content_vi,
    slug,
    category,
    publishedAt
  }
`);

export const POST_BY_SLUG_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title_en,
    title_vi,
    excerpt_en,
    excerpt_vi,
    content_en,
    content_vi,
    slug,
    category,
    publishedAt
  }
`);
