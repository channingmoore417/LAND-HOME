import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Full contact record for one person, keyed by email — works for signed-up
// users (profile + browsing activity) and anonymous form leads (forms only).
// GET  ?email=…        → profile, homes viewed, forms completed, notes
// POST { email, note } → add a team note to the contact
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if ("failure" in auth) return auth.failure;
  const { admin } = auth;

  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name, phone, created_at, is_admin")
    .ilike("email", email)
    .maybeSingle();

  const [leads, showings, searches, favorites, notes] = await Promise.all([
    admin.from("leads").select("*").ilike("email", email).order("created_at", { ascending: false }),
    admin.from("showing_requests").select("*").ilike("email", email).order("created_at", { ascending: false }),
    admin.from("saved_searches").select("*").ilike("email", email).order("created_at", { ascending: false }),
    admin.from("favorites").select("*").ilike("email", email).order("created_at", { ascending: false }),
    admin.from("contact_notes").select("*").ilike("contact_email", email).order("created_at", { ascending: false }),
  ]);

  // Browsing history only exists for signed-up users (keyed by user_id).
  let views: {
    listing_key: string;
    views: number;
    last_viewed_at: string;
    listing: { unparsed_address: string | null; list_price: number | null; city: string | null } | null;
  }[] = [];
  let otherActivity: { type: string; created_at: string; meta: Record<string, unknown> }[] = [];

  if (profile?.id) {
    const { data: activity } = await admin
      .from("user_activity")
      .select("type, listing_key, meta, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(500);

    const byListing = new Map<string, { views: number; last: string }>();
    for (const a of activity ?? []) {
      if (a.type === "view_listing" && a.listing_key) {
        const cur = byListing.get(a.listing_key);
        if (cur) cur.views += 1;
        else byListing.set(a.listing_key, { views: 1, last: a.created_at });
      } else if (a.type !== "view_listing") {
        otherActivity.push({ type: a.type, created_at: a.created_at, meta: a.meta ?? {} });
      }
    }
    otherActivity = otherActivity.slice(0, 25);

    const keys = [...byListing.keys()];
    let listingsByKey = new Map<string, { unparsed_address: string | null; list_price: number | null; city: string | null }>();
    if (keys.length > 0) {
      const { data: listingRows } = await admin
        .from("listings")
        .select("listing_key, unparsed_address, list_price, city")
        .in("listing_key", keys);
      listingsByKey = new Map((listingRows ?? []).map((l) => [l.listing_key, l]));
    }
    views = keys
      .map((k) => ({
        listing_key: k,
        views: byListing.get(k)!.views,
        last_viewed_at: byListing.get(k)!.last,
        listing: listingsByKey.get(k) ?? null,
      }))
      .sort((a, b) => (a.last_viewed_at < b.last_viewed_at ? 1 : -1));
  }

  // Favorites enriched with listing context, same as the overview endpoint.
  const favKeys = [...new Set((favorites.data ?? []).map((f) => f.listing_key).filter(Boolean))];
  let favListings = new Map<string, { unparsed_address: string | null; list_price: number | null; city: string | null }>();
  if (favKeys.length > 0) {
    const { data: rows } = await admin
      .from("listings")
      .select("listing_key, unparsed_address, list_price, city")
      .in("listing_key", favKeys);
    favListings = new Map((rows ?? []).map((l) => [l.listing_key, l]));
  }

  return NextResponse.json({
    profile: profile ?? null,
    views,
    otherActivity,
    leads: leads.data ?? [],
    showingRequests: showings.data ?? [],
    savedSearches: searches.data ?? [],
    favorites: (favorites.data ?? []).map((f) => ({ ...f, listing: favListings.get(f.listing_key) ?? null })),
    notes: notes.data ?? [],
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("failure" in auth) return auth.failure;
  const { admin, user } = auth;

  let body: { email?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const note = body.note?.trim();
  if (!email || !note) return NextResponse.json({ error: "email and note are required" }, { status: 400 });
  if (note.length > 5000) return NextResponse.json({ error: "Note is too long" }, { status: 400 });

  const { data, error } = await admin
    .from("contact_notes")
    .insert({ contact_email: email, body: note, author_email: user.email ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: "Could not save note" }, { status: 500 });

  return NextResponse.json({ note: data });
}
