import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { normalizeCriteria } from "@/lib/alerts/criteria";

export const dynamic = "force-dynamic";

// Everything here is service-role (bypasses RLS) — requireAdmin verifies the
// Bearer token and the caller's is_admin flag before any query below runs.
// Never widen this route to skip that check; leads/showing_requests/
// saved_searches/favorites hold visitor PII (names, emails, phone numbers).
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if ("failure" in auth) return auth.failure;
  const { admin } = auth;

  const [leads, showings, searches, favorites, signups] = await Promise.all([
    admin.from("leads").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("showing_requests").select("*").order("created_at", { ascending: false }).limit(1000),
    admin.from("saved_searches").select("*").order("created_at", { ascending: false }).limit(1000),
    admin.from("favorites").select("*").order("created_at", { ascending: false }).limit(1000),
    admin.from("profiles").select("id, email, full_name, phone, created_at").order("created_at", { ascending: false }).limit(200),
  ]);

  // Enrich saved homes and showing requests with listing context (address,
  // price, beds/baths, city) so the dashboard can summarise instead of listing bare MLS keys.
  const keys = [...new Set([...(favorites.data ?? []), ...(showings.data ?? []), ...(leads.data ?? [])].map((r) => r.listing_key).filter(Boolean))];
  type ListingCtx = {
    listing_key: string; unparsed_address: string | null; list_price: number | null; city: string | null;
    bedrooms_total: number | null; bathrooms_total: number | null; living_area: number | null; property_type: string | null;
  };
  const listingsByKey = new Map<string, ListingCtx>();
  for (let i = 0; i < keys.length; i += 200) {
    const { data: rows } = await admin
      .from("listings")
      .select("listing_key, unparsed_address, list_price, city, bedrooms_total, bathrooms_total, living_area, property_type")
      .in("listing_key", keys.slice(i, i + 200));
    for (const l of (rows ?? []) as ListingCtx[]) listingsByKey.set(l.listing_key, l);
  }
  const withListing = <T extends { listing_key: string | null }>(r: T) => ({
    ...r,
    listing: (r.listing_key && listingsByKey.get(r.listing_key)) || null,
  });

  return NextResponse.json({
    leads: (leads.data ?? []).map(withListing),
    showingRequests: (showings.data ?? []).map(withListing),
    savedSearches: (searches.data ?? []).map((x) => ({ ...x, norm: normalizeCriteria(x.criteria) })),
    favorites: (favorites.data ?? []).map(withListing),
    signups: signups.data ?? [],
  });
}
