// ============================================================
// Shared listing query + presentation helpers, used by both the IDX search
// page (/listings) and the programmatic SEO pages (/[city]/[topic]). Keeping
// the filter logic in ONE place means the RESO value mapping (e.g.
// SingleFamilyResidence, Land) can never drift between the two.
// ============================================================

import { getLiveClient } from "@/lib/supabase";

export const PRICE_MAX = 1_000_000;
export const SQFT_MAX = 5_000;

// Feature key → indexed boolean column in `listings`.
export const FEATURE_COLUMN: Record<string, string> = {
  pool: "has_pool",
  garage: "has_garage",
  waterfront: "is_waterfront",
  fireplace: "has_fireplace",
  new_construction: "is_new_construction",
  updated: "is_updated_remodeled",
  single_story: "is_single_story",
  acre_plus: "has_acre_plus",
};

export interface ListingCriteria {
  status?: string; // defaults to "Active"
  city?: string;
  bedsMin?: number;
  bathsMin?: number;
  priceMin?: number;
  priceMax?: number;
  sqftMin?: number;
  sqftMax?: number;
  yearMin?: number;
  type?: string; // UI value: "Single Family" | "Multi-Family" | "New Construction" | "Land" | "Mobile / Manufactured"
  category?: "land" | "single_family" | "mobile"; // SEO-page shorthand
  features?: string[]; // feature keys (see FEATURE_COLUMN)
  postalCode?: string; // ZIP (prefix match, tolerates ZIP+4)
  subdivisionAny?: string[]; // neighborhood: subdivision_name ILIKE keywords (OR'd)
  q?: string; // free-text search
  lhgOnly?: boolean; // only The Land & Home Group's own listings
  // Geographic bounds (map "search this area"): south/north lat, west/east lng.
  latMin?: number;
  latMax?: number;
  lngMin?: number;
  lngMax?: number;
}

export const CARD_SELECT =
  "listing_key, listing_id, list_price, bedrooms_total, bathrooms_total, living_area, lot_size_sqft, property_type, property_sub_type, standard_status, unparsed_address, city, state_or_province, postal_code, photos_count, is_new_construction, is_lhg_listing, list_office_name, internet_address_yn, days_on_market";

export interface Card {
  listing_key: string;
  listing_id: string | null;
  list_price: number | null;
  bedrooms_total: number | null;
  bathrooms_total: number | null;
  living_area: number | null;
  lot_size_sqft: number | null;
  property_type: string | null;
  property_sub_type: string | null;
  standard_status: string | null;
  unparsed_address: string | null;
  city: string | null;
  state_or_province: string | null;
  postal_code: string | null;
  photos_count: number | null;
  is_new_construction: boolean;
  is_lhg_listing: boolean;
  list_office_name: string | null;
  internet_address_yn: boolean;
  days_on_market: number | null;
  photo_url?: string | null; // attached after fetchFirstPhotos
}

// Applies every filter to a Supabase query builder. Shared so the search page
// and SEO pages filter identically. `query` is a PostgREST builder.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyListingFilters(query: any, c: ListingCriteria) {
  // IDX compliance + for-sale-only baseline.
  query = query.neq("internet_display_yn", false);
  query = query.eq("standard_status", c.status || "Active");
  query = query.not("property_type", "in", "(ResidentialLease,CommercialLease)");

  if (c.lhgOnly) query = query.eq("is_lhg_listing", true);
  if (c.city) query = query.ilike("city", c.city);
  if (c.bedsMin) query = query.gte("bedrooms_total", c.bedsMin);
  if (c.bathsMin) query = query.gte("bathrooms_total", c.bathsMin);
  if (c.priceMin && c.priceMin > 0) query = query.gte("list_price", c.priceMin);
  if (c.priceMax && c.priceMax < PRICE_MAX) query = query.lte("list_price", c.priceMax);
  if (c.sqftMin && c.sqftMin > 0) query = query.gte("living_area", c.sqftMin);
  if (c.sqftMax && c.sqftMax < SQFT_MAX) query = query.lte("living_area", c.sqftMax);
  if (c.yearMin) query = query.gte("year_built", c.yearMin);

  const MOBILE_SUBTYPES = ["MobileHome", "ManufacturedHome", "ManufacturedOnLand"];
  if (c.category === "land") query = query.eq("property_type", "Land");
  else if (c.category === "single_family") query = query.eq("property_sub_type", "SingleFamilyResidence");
  else if (c.category === "mobile") query = query.in("property_sub_type", MOBILE_SUBTYPES);

  if (c.type === "Single Family") query = query.eq("property_sub_type", "SingleFamilyResidence");
  else if (c.type === "Multi-Family")
    query = query.or("property_type.eq.ResidentialIncome,property_sub_type.eq.Duplex,property_sub_type.eq.Triplex");
  else if (c.type === "New Construction") query = query.eq("is_new_construction", true);
  else if (c.type === "Land") query = query.eq("property_type", "Land");
  else if (c.type === "Mobile / Manufactured") query = query.in("property_sub_type", MOBILE_SUBTYPES);

  for (const key of c.features ?? []) {
    const col = FEATURE_COLUMN[key];
    if (col) query = query.eq(col, true);
  }

  if (typeof c.latMin === "number") query = query.gte("latitude", c.latMin);
  if (typeof c.latMax === "number") query = query.lte("latitude", c.latMax);
  if (typeof c.lngMin === "number") query = query.gte("longitude", c.lngMin);
  if (typeof c.lngMax === "number") query = query.lte("longitude", c.lngMax);

  if (c.postalCode) query = query.ilike("postal_code", `${c.postalCode}%`);

  if (c.subdivisionAny?.length) {
    query = query.or(
      c.subdivisionAny.map((k) => `subdivision_name.ilike.%${k.replace(/[(),]/g, " ")}%`).join(","),
    );
  }

  if (c.q) {
    const term = c.q.replace(/[(),]/g, " ").trim();
    if (term) {
      query = query.or(
        `unparsed_address.ilike.%${term}%,city.ilike.%${term}%,postal_code.ilike.%${term}%,subdivision_name.ilike.%${term}%`,
      );
    }
  }
  return query;
}

export type SortKey = "new" | "plow" | "phigh" | "beds" | "sqft";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applySort(query: any, sort: SortKey) {
  switch (sort) {
    case "plow": return query.order("list_price", { ascending: true, nullsFirst: false });
    case "phigh": return query.order("list_price", { ascending: false, nullsFirst: false });
    case "beds": return query.order("bedrooms_total", { ascending: false, nullsFirst: false });
    case "sqft": return query.order("living_area", { ascending: false, nullsFirst: false });
    default: return query.order("modification_timestamp", { ascending: false, nullsFirst: false });
  }
}

// First photo per listing_key (paginates listing_media in order).
export async function fetchFirstPhotos(keys: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (keys.length === 0) return map;
  const supabase = getLiveClient();
  const { data } = await supabase
    .from("listing_media")
    .select("listing_key, media_url, order")
    .in("listing_key", keys)
    .order("order", { ascending: true });
  for (const m of (data as { listing_key: string; media_url: string }[]) ?? []) {
    if (!map.has(m.listing_key)) map.set(m.listing_key, m.media_url);
  }
  return map;
}

export interface ListingStats {
  count: number;
  priceMin: number | null;
  priceMax: number | null;
}

// Live count + price range for a criteria set — powers SEO intros, FAQs and
// JSON-LD. Three light, indexed queries.
export async function listingStats(c: ListingCriteria): Promise<ListingStats> {
  const supabase = getLiveClient();

  const countQ = applyListingFilters(
    supabase.from("listings").select("listing_key", { count: "exact", head: true }),
    c,
  );
  const { count } = await countQ;

  const minQ = applyListingFilters(
    supabase.from("listings").select("list_price"),
    c,
  ).gt("list_price", 0).order("list_price", { ascending: true }).limit(1);
  const { data: minRow } = await minQ;

  const maxQ = applyListingFilters(
    supabase.from("listings").select("list_price"),
    c,
  ).order("list_price", { ascending: false }).limit(1);
  const { data: maxRow } = await maxQ;

  return {
    count: count ?? 0,
    priceMin: (minRow as { list_price: number }[])?.[0]?.list_price ?? null,
    priceMax: (maxRow as { list_price: number }[])?.[0]?.list_price ?? null,
  };
}

// Lightweight pins for the map view: coordinates + minimal card fields for the
// popup. Capped so a wide-open search can't pull the whole feed at once.
export interface MapPin {
  listing_key: string;
  list_price: number | null;
  bedrooms_total: number | null;
  bathrooms_total: number | null;
  living_area: number | null;
  unparsed_address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  internet_address_yn: boolean;
}

export async function fetchMapPins(c: ListingCriteria, cap = 1500): Promise<MapPin[]> {
  const supabase = getLiveClient();
  const q = applyListingFilters(
    supabase
      .from("listings")
      .select(
        "listing_key, list_price, bedrooms_total, bathrooms_total, living_area, unparsed_address, city, latitude, longitude, internet_address_yn",
      ),
    c,
  )
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(cap);
  const { data, error } = await q;
  if (error) {
    console.error("[listings] map pins query failed:", error.message);
    return [];
  }
  return (data as MapPin[]) ?? [];
}

// Fetch a page of cards for a criteria set.
export async function fetchCards(
  c: ListingCriteria,
  opts: { limit?: number; offset?: number; sort?: SortKey } = {},
): Promise<{ rows: Card[]; total: number }> {
  const supabase = getLiveClient();
  let q = applyListingFilters(
    supabase.from("listings").select(CARD_SELECT, { count: "exact" }),
    c,
  );
  q = applySort(q, opts.sort ?? "new");
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 9;
  q = q.range(offset, offset + limit - 1);
  const { data, count, error } = await q;
  if (error) {
    console.error("[listings] query failed:", error.message);
    return { rows: [], total: 0 };
  }
  return { rows: (data as Card[]) ?? [], total: count ?? 0 };
}
