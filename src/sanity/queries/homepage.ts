import { defineQuery } from "next-sanity";
import { imageFragment } from "../fragments/image";

export const HOMEPAGE_QUERY = defineQuery(`
  *[_type == "homepage"][0]{
    title,
    heroTitle,
    heroSubtitle,
    heroImage { ${imageFragment} },
    aboutUsVideo { asset->{url} },
    aboutUsVideoStreamUrl,
    aboutUsVideoPoster { asset->{url, metadata{dimensions{width, height}}} },
    narrativeStory_en,
    narrativeStory_vi
  }
`);

export const FEATURED_DESTINATIONS_QUERY = defineQuery(`
  *[_type == "destination" && isFeatured == true][0...6]{
    _id,
    name,
    slug,
    region,
    category,
    country->{ "code": code, "vi": name.vi, "en": name.en },
    isSpecialTour,
    description,
    image { ${imageFragment} },
    galleryImages[] { ${imageFragment} }
  }
`);
