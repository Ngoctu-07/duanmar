import { imageFragment } from "./image";

/**
 * Dual tour artwork projected by every destination query.
 *
 * `cardThumbnail` is the landscape homepage-card crop, `mainPoster` is the
 * portrait detail-page poster. `posterImage` + `legacyGalleryImage` are kept
 * only so pre-refactor documents still render until the dual-image backfill
 * (`npm run migrate:tour-images`) fills the two new fields.
 */
export const destinationImageProjection = `
    "cardThumbnail": cardThumbnail { ${imageFragment} },
    "mainPoster": mainPoster { ${imageFragment} },
    "posterImage": posterImage { ${imageFragment} },
    "legacyGalleryImage": galleryImages[0] { ${imageFragment} }`;
