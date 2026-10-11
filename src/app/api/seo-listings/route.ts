import { NextResponse } from "next/server";
import { getSeoPage, seoCriteria } from "@/lib/seo";
import { fetchCards, fetchPhotosMap, type ListingCriteria, type SortKey } from "@/lib/listings";
import { parseFilters, toCriteria, type SP } from "@/lib/listingQuery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH = 12;

// Next batch of cards for infinite scroll.
//   city/topic landing page:  ?slug=sulphur/homes-for-sale&offset=12
//   /homes-for-sale search:   ?city=Sulphur&beds=3&feature=pool&offset=9
// Uses the same criteria as the server-rendered first batch.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const offset = Number(p.get("offset") ?? 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 5000) {
    return NextResponse.json({ cards: [], total: 0 }, { status: 400 });
  }

  let criteria: ListingCriteria;
  let sort: SortKey = "new";
  const slug = p.get("slug");
  if (slug) {
    if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(slug)) return NextResponse.json({ cards: [], total: 0 }, { status: 400 });
    const page = await getSeoPage(slug);
    if (!page) return NextResponse.json({ cards: [], total: 0 }, { status: 404 });
    criteria = seoCriteria(page);
  } else {
    const sp: SP = {};
    for (const key of p.keys()) {
      if (key === "offset") continue;
      if (key === "feature") sp.feature = p.getAll("feature");
      else sp[key] = p.get(key) ?? undefined;
    }
    const f = parseFilters(sp);
    criteria = toCriteria(f);
    sort = f.sort as SortKey;
  }

  const { rows, total } = await fetchCards(criteria, { limit: BATCH, offset, sort });
  const photos = await fetchPhotosMap(rows.map((r) => r.listing_key));
  for (const r of rows) r.photos = photos.get(r.listing_key) ?? [];
  return NextResponse.json({ cards: rows, total });
}
