import { defineQuery } from "next-sanity";

export const TOUR_PRICING_BY_SLUG_QUERY = defineQuery(`
  *[_type == "tourPricing" && tourSlug == $slug] | order(_updatedAt desc, _id asc)[0] {
    "tiers": tiers[] {
      minGuests,
      maxGuests,
      pricePerGuestVnd,
      pricePerGuestUsd,
      groupTotalVnd,
      groupTotalUsd
    },
    maxCapacity
  }
`);

/** All pricing docs, newest first — listings build a slug → price-range map. */
export const ALL_TOUR_PRICING_QUERY = defineQuery(`
  *[_type == "tourPricing" && defined(tourSlug)] | order(_updatedAt desc, _id asc) {
    tourSlug,
    "tiers": tiers[] {
      pricePerGuestVnd,
      pricePerGuestUsd
    }
  }
`);
