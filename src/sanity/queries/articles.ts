import { defineQuery } from "next-sanity";
import { imageFragment } from "../fragments/image";

const ARTICLE_FIELDS = `
    _id,
    title_en,
    title_vi,
    excerpt_en,
    excerpt_vi,
    content_en,
    content_vi,
    slug,
    publishedAt,
    featuredImage { ${imageFragment} }
`;

export const ARTICLES_QUERY = defineQuery(`
  *[_type == "article" && defined(slug.current) && publishedAt <= now()] | order(publishedAt desc)[0...12]{${ARTICLE_FIELDS}}
`);

export const ARTICLE_BY_SLUG_QUERY = defineQuery(`
  *[_type == "article" && slug.current == $slug][0]{${ARTICLE_FIELDS}}
`);
