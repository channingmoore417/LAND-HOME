import { NextResponse } from "next/server";
import { fetchCards, fetchFirstPhotos, fetchMapPins, type ListingCriteria, type SortKey } from "@/lib/listings";
import { parseFilters, toCriteria, type SP } from "@/lib/listingQuery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST_LIMIT = 60;

// Live map search. Returns lightweight pins for the map + photo cards for the
// list, both constrained to the current map bounds (when provided) and the
// active filters. Same criteria builder as the /listings page.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams;

  // Build the SP shape parseFilters expects (feature can repeat).
  const sp: SP = {};
  for (const key of p.keys()) {
    if (key === "feature") sp.feature = p.getAll("feature");
    else sp[key] = p.get(key) ?? undefined;
  }

  const f = parseFilters(sp);
  const criteria: ListingCriteria = toCriteria(f);

  // Optional map bounds: s,n,w,e
  const s = Number(p.get("s")), n = Number(p.get("n")), w = Number(p.get("w")), e = Number(p.get("e"));
  if ([s, n, w, e].every((v) => Number.isFinite(v))) {
    criteria.latMin = s; criteria.latMax = n; criteria.lngMin = w; criteria.lngMax = e;
  }

  const [pins, { rows, total }] = await Promise.all([
    fetchMapPins(criteria),
    fetchCards(criteria, { limit: LIST_LIMIT, sort: f.sort as SortKey }),
  ]);

  const photos = await fetchFirstPhotos(rows.map((r) => r.listing_key));
  for (const r of rows) r.photo_url = photos.get(r.listing_key) ?? null;

  return NextResponse.json({ pins, cards: rows, total });
}
