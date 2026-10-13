// ============================================================
// Saved-search criteria → ListingCriteria.
//
// saved_searches.criteria has been written in three shapes over time:
//   1. the quiz / capture gate:  { communities[], price: "$350k–$500k", beds, baths, features[] }
//   2. the search page filters:  { city, type, minPrice, maxPrice, beds, baths, features[], ... }
//   3. the agent form (canonical): { cities[], priceMin, priceMax, bedsMin, bathsMin, sqftMin, type, features[] }
// normalizeCriteria() reads all three so alerts never care which one a search used,
// and matching goes through applyListingFilters() — the exact code the site search
// uses — so "matches your search" can never drift from what the search page shows.
// ============================================================

import { FEATURE_COLUMN, PRICE_MAX, SQFT_MAX, type ListingCriteria } from "@/lib/listings";
import { PRICE_BANDS, FEATURES } from "@/lib/buyerMatch";

/** The shape the agent form writes (and the admin preview endpoint accepts). */
export interface ClientSearchCriteria {
  cities?: string[];
  priceMin?: number;
  priceMax?: number;
  bedsMin?: number;
  bathsMin?: number;
  sqftMin?: number;
  type?: string;
  features?: string[];
  zip?: string;
}

// Quiz feature keys → listings feature keys (FEATURE_COLUMN).
const FEATURE_ALIAS: Record<string, string> = Object.fromEntries(
  FEATURES.map((f) => [f.key, f.filter]),
);

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function normalizeCriteria(raw: unknown): ListingCriteria {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const cities = (
    Array.isArray(r.cities) ? r.cities
    : Array.isArray(r.communities) ? r.communities
    : typeof r.city === "string" && r.city ? [r.city]
    : []
  ).filter((c): c is string => typeof c === "string" && c.trim() !== "").map((c) => c.trim());

  let priceMin = num(r.priceMin) ?? num(r.minPrice);
  let priceMax = num(r.priceMax) ?? num(r.maxPrice);
  if (priceMin === undefined && priceMax === undefined && typeof r.price === "string") {
    const band = PRICE_BANDS.find((b) => b.label === r.price);
    if (band) { priceMin = band.min; priceMax = band.max; }
  }
  if (priceMax !== undefined && priceMax >= PRICE_MAX) priceMax = undefined; // slider max = "no limit"

  let sqftMin = num(r.sqftMin) ?? num(r.minSqft);
  const sqftMaxRaw = num(r.sqftMax) ?? num(r.maxSqft);
  const sqftMax = sqftMaxRaw !== undefined && sqftMaxRaw < SQFT_MAX ? sqftMaxRaw : undefined;
  if (sqftMin !== undefined && sqftMin <= 0) sqftMin = undefined;

  const features = (Array.isArray(r.features) ? r.features : [])
    .map((f) => (typeof f === "string" ? FEATURE_ALIAS[f] ?? f : ""))
    .filter((f) => f in FEATURE_COLUMN);

  const crit: ListingCriteria = {
    cities: cities.length > 0 ? cities : undefined,
    bedsMin: num(r.bedsMin) ?? num(r.beds),
    bathsMin: num(r.bathsMin) ?? num(r.baths),
    priceMin,
    priceMax,
    sqftMin,
    sqftMax,
    yearMin: num(r.yearMin) ?? num(r.year),
    type: typeof r.type === "string" && r.type ? r.type : undefined,
    features: [...new Set(features)],
  };
  const zip = typeof r.zip === "string" ? r.zip : typeof r.postalCode === "string" ? r.postalCode : "";
  if (zip) crit.postalCode = zip;
  return crit;
}

/** Validates + canonicalizes what the agent form submits. */
export function canonicalFromForm(body: Record<string, unknown>): ClientSearchCriteria {
  const c = normalizeCriteria(body);
  return {
    cities: c.cities,
    priceMin: c.priceMin,
    priceMax: c.priceMax,
    bedsMin: c.bedsMin,
    bathsMin: c.bathsMin,
    sqftMin: c.sqftMin,
    type: c.type,
    features: c.features,
    zip: c.postalCode,
  };
}

/** Short human summary: "Sulphur, Moss Bluff · $250k–$400k · 3+ bd · pool". */
export function summarizeCriteria(c: ListingCriteria): string {
  const k = (n: number) => `$${Math.round(n / 1000)}k`;
  const parts: string[] = [];
  if (c.cities?.length) parts.push(c.cities.join(", "));
  if (c.priceMin && c.priceMax) parts.push(`${k(c.priceMin)}–${k(c.priceMax)}`);
  else if (c.priceMax) parts.push(`under ${k(c.priceMax)}`);
  else if (c.priceMin) parts.push(`${k(c.priceMin)}+`);
  if (c.bedsMin) parts.push(`${c.bedsMin}+ bd`);
  if (c.bathsMin) parts.push(`${c.bathsMin}+ ba`);
  if (c.type) parts.push(c.type);
  for (const f of c.features ?? []) parts.push(f.replace(/_/g, " "));
  return parts.join(" · ") || "All homes for sale";
}
