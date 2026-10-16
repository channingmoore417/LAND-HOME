// ============================================================
// Shared search-param → filters → criteria parsing, used by both the IDX
// search page (/listings) and the live map-search API (/api/listings/search)
// so the two can never drift.
// ============================================================

import { PRICE_MAX, SQFT_MAX, type ListingCriteria } from "@/lib/listings";
import { findNeighborhood } from "@/lib/neighborhoods";
import type { ListingFilters } from "@/components/ListingsControls";

export type SP = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
export const arr = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export function parseFilters(sp: SP): ListingFilters {
  const cities = [...new Set(arr(sp.city).map((c) => c.trim()).filter(Boolean))];
  return {
    q: one(sp.q),
    cities,
    city: cities.length === 1 ? cities[0] : "",
    beds: Number(one(sp.beds)) || 0,
    baths: Number(one(sp.baths)) || 0,
    type: one(sp.type),
    builder: one(sp.builder),
    status: one(sp.status),
    minPrice: Number(one(sp.minPrice)) || 0,
    maxPrice: Number(one(sp.maxPrice)) || PRICE_MAX,
    minSqft: Number(one(sp.minSqft)) || 0,
    maxSqft: Number(one(sp.maxSqft)) || SQFT_MAX,
    year: Number(one(sp.year)) || 0,
    features: arr(sp.feature),
    zip: one(sp.zip),
    neighborhood: one(sp.neighborhood),
    sort: one(sp.sort) || "new",
  };
}

export function toCriteria(f: ListingFilters): ListingCriteria {
  const crit: ListingCriteria = {
    status: f.status || undefined,
    city: f.cities.length === 1 ? f.cities[0] : undefined,
    cities: f.cities.length > 1 ? f.cities : undefined,
    bedsMin: f.beds || undefined,
    bathsMin: f.baths || undefined,
    priceMin: f.minPrice || undefined,
    priceMax: f.maxPrice,
    sqftMin: f.minSqft || undefined,
    sqftMax: f.maxSqft,
    yearMin: f.year || undefined,
    type: f.type || undefined,
    builder: f.builder || undefined,
    features: f.features,
    q: f.q || undefined,
  };
  if (f.zip) crit.postalCode = f.zip;
  if (f.neighborhood && f.city) {
    const n = findNeighborhood(f.city, f.neighborhood);
    if (n?.keywords?.length) crit.subdivisionAny = n.keywords;
    if (n?.zip) crit.postalCode = n.zip;
  }
  return crit;
}
