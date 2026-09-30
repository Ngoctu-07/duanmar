import { defineQuery } from "next-sanity";
import { imageFragment } from "../fragments/image";

const PROMOTION_FIELDS = `
    _id,
    title_en,
    title_vi,
    badgeTag_en,
    badgeTag_vi,
    description_en,
    description_vi,
    discountedPrice,
    originalPrice,
    currency,
    validUntil,
    bannerImage { ${imageFragment} },
    targetTour->{ _id, "slug": slug.current }
`;

/**
 * Active promotions only. Expiry (`validUntil`) is filtered in JS by
 * `filterLivePromotions` — a GROQ `now()` compare would drop a promo at
 * 00:00 UTC on its own last day and break the "last day" countdown label.
 */
export const PROMOTIONS_QUERY = defineQuery(`
  *[_type == "promotion" && isActive == true] | order(validUntil asc){${PROMOTION_FIELDS}}
`);
