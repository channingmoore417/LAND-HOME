import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

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
    admin.from("showing_requests").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("saved_searches").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("favorites").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("profiles").select("id, email, full_name, phone, created_at").order("created_at", { ascending: false }).limit(200),
  ]);

  // Enrich favorites with a bit of listing context (address/price) so the
  // dashboard shows something readable instead of bare MLS keys.
  const favKeys = [...new Set((favorites.data ?? []).map((f) => f.listing_key).filter(Boolean))];
  let listingsByKey = new Map<string, { unparsed_address: string | null; list_price: number | null; city: string | null }>();
  if (favKeys.length > 0) {
    const { data: listingRows } = await admin
      .from("listings")
      .select("listing_key, unparsed_address, list_price, city")
      .in("listing_key", favKeys);
    listingsByKey = new Map((listingRows ?? []).map((l) => [l.listing_key, l]));
  }
  const favoritesEnriched = (favorites.data ?? []).map((f) => ({
    ...f,
    listing: listingsByKey.get(f.listing_key) ?? null,
  }));

  return NextResponse.json({
    leads: leads.data ?? [],
    showingRequests: showings.data ?? [],
    savedSearches: searches.data ?? [],
    favorites: favoritesEnriched,
    signups: signups.data ?? [],
  });
}
