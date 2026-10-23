import { defineQuery } from "next-sanity";
import { imageFragment } from "../fragments/image";

export const DESTINATIONS_QUERY = defineQuery(`
  *[_type == "destination"] | order(name asc) {
    _id,
    name,
    slug,
    region,
    category,
    country->{ "code": code, "vi": name.vi, "en": name.en },
    isSpecialTour,
    description,
    descriptionEn,
    lat,
    lng,
    location,
    // Single poster: the Studio field wins; legacy gallery[0] is only the
    // pre-backfill bridge (remove after the destination-poster backfill).
    "posterImage": coalesce(posterImage, galleryImages[0]) { ${imageFragment} }
  }
`);

export const DESTINATION_BY_SLUG_QUERY = defineQuery(`
  *[_type == "destination" && slug.current == $slug][0] {
    _id,
    name,
    slug,
    region,
    category,
    country->{ "code": code, "vi": name.vi, "en": name.en },
    isSpecialTour,
    description,
    descriptionEn,
    itinerary[] {
      dayTitle,
      meals,
      details
    },
    itineraryEn[] {
      dayTitle,
      meals,
      details
    },
    lat,
    lng,
    location,
    // Single poster: the Studio field wins; legacy gallery[0] is only the
    // pre-backfill bridge (remove after the destination-poster backfill).
    "posterImage": coalesce(posterImage, galleryImages[0]) { ${imageFragment} }
  }
`);

export const DESTINATIONS_BY_CATEGORY_QUERY = defineQuery(`
  *[_type == "destination" && category == $category] | order(name asc) {
    _id,
    name,
    slug,
    region,
    category,
    country->{ "code": code, "vi": name.vi, "en": name.en },
    isSpecialTour,
    description,
    descriptionEn,
    lat,
    lng,
    location,
    // Single poster: the Studio field wins; legacy gallery[0] is only the
    // pre-backfill bridge (remove after the destination-poster backfill).
    "posterImage": coalesce(posterImage, galleryImages[0]) { ${imageFragment} }
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
