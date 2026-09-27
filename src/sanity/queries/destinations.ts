import { defineQuery } from "next-sanity";
import { imageFragment } from "../fragments/image";

export const DESTINATIONS_QUERY = defineQuery(`
  *[_type == "destination" && ($region == "" || region == $region)] | order(name asc) {
    _id,
    name,
    slug,
    region,
    description,
    lat,
    lng,
    image { ${imageFragment} }
  }
`);

export const DESTINATION_BY_SLUG_QUERY = defineQuery(`
  *[_type == "destination" && slug.current == $slug][0] {
    _id,
    name,
    slug,
    region,
    description,
    lat,
    lng,
    image { ${imageFragment} }
  }
`);

export const DESTINATION_SLUGS_QUERY = defineQuery(`
  *[_type == "destination" && defined(slug.current)]{ "slug": slug.current }
`);

export const DESTINATIONS_BY_SLUGS_QUERY = defineQuery(`
  *[_type == "destination" && slug.current in $slugs] {
    _id,
    name,
    slug,
    region,
    description
  }
`);
