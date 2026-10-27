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
    promoCode,
    maxSlots,
    usedCount,
    minGuests,
    startDate,
    endDate,
    validUntil,
    isActive,
    bannerImage { ${imageFragment} },
    coverImage { ${imageFragment} },
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

/**
 * Wallet lookup: fetch every referenced promotion regardless of `isActive` or
 * expiry. The wallet layer needs to tell two states apart:
 * - `isActive == false` → hide the voucher but keep the row (reactivation
 *   restores it);
 * - document absent from the published perspective → deleted/unpublished, so
 *   the row is orphaned and can be purged.
 * Localized copy and capacity still come from the live document.
 */
export const PROMOTIONS_BY_IDS_QUERY = defineQuery(`
  *[_type == "promotion" && _id in $ids]{${PROMOTION_FIELDS}}
`);
