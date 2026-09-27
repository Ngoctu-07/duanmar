import { defineQuery } from "next-sanity";
import { imageFragment } from "../fragments/image";

export const HOMEPAGE_QUERY = defineQuery(`
  *[_type == "homepage"][0]{
    title,
    heroTitle,
    heroSubtitle,
    heroImage { ${imageFragment} }
  }
`);

export const FEATURED_DESTINATIONS_QUERY = defineQuery(`
  *[_type == "destination" && featured == true][0...6]{
    _id,
    name,
    slug,
    region,
    description,
    image { ${imageFragment} }
  }
`);
