import { defineQuery } from "next-sanity";
import { imageFragment } from "../fragments/image";

export const HOMEPAGE_QUERY = defineQuery(`
  *[_type == "homepage"][0]{
    title,
    heroTitle,
    heroSubtitle,
    heroSlogan{ vi, en },
    heroImage { ${imageFragment} },
    heroBackgroundMedia { asset->{url, mimeType} },
    heroPromoVideo { asset->{url, mimeType} },
    promoVideo { asset->{url} },
    promoVideoUrl,
    promoVideoPoster { asset->{url, metadata{dimensions{width, height}}} },
    aboutUsVideo { asset->{url} },
    aboutUsVideoStreamUrl,
    aboutUsVideoPoster { asset->{url, metadata{dimensions{width, height}}} },
    narrativeStory_en,
    narrativeStory_vi,
    editorialAnnouncement {
      announcement,
      heading,
      body,
      ctaText,
      ctaLink,
      bgImage { ${imageFragment} },
      foregroundImage { ${imageFragment} }
    }
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
    description,
    descriptionEn,
    // Single poster: the Studio field wins; legacy gallery[0] is only the
    // pre-backfill bridge (remove after the destination-poster backfill).
    "posterImage": coalesce(posterImage, galleryImages[0]) { ${imageFragment} }
  }
`);
