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
    title,
    badgeTag,
    description,
    discountedPrice,
    originalPrice,
    currency,
    promoCode,
    maxSlots,
    usedCount,
    minGuests,
    startDate,
    endDate,
    expiryDate,
    validUntil,
    isActive,
    bannerImage { ${imageFragment} },
    coverImage { ${imageFragment} },
    thumbnail { ${imageFragment} },
    ctaLink,
    targetTour->{ _id, "slug": slug.current }
`;

/**
 * Every published, active promotion — including offers whose `validUntil` has
 * already passed. Expiry is presentation metadata (the card marks the offer as
 * ended); it must not hide an editor-published deal from the /deals grid. The
 * search page still filters to live offers via `filterLivePromotions`.
 *
 * `isActive != false` treats a missing boolean as active (imported/legacy docs),
 * and the draft guard keeps the query safe outside the published perspective.
 * Legacy schema names are accepted so imported documents still surface.
 */
export const PROMOTIONS_QUERY = defineQuery(`
  *[
    _type in ["promotion", "promotions", "promotionAndPackage", "deals"] &&
    isActive != false &&
    !(_id in path("drafts.**"))
  ] | order(_createdAt desc){${PROMOTION_FIELDS}}
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
  *[
    _type in ["promotion", "promotions", "promotionAndPackage", "deals"] &&
    _id in $ids
  ]{${PROMOTION_FIELDS}}
`);
