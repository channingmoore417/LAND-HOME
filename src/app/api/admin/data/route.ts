import { NextResponse } from "next/server";
import { getPublicClient, getAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Everything here is service-role (bypasses RLS) — the Bearer token is
// verified against Supabase Auth, then the caller's profile must have
// is_admin = true before any query below runs. Never widen this route to
// skip that check; leads/showing_requests/saved_searches/favorites hold
// visitor PII (names, emails, phone numbers).
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const publicClient = getPublicClient();
  const { data: userData, error: userErr } = await publicClient.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = getAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

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
