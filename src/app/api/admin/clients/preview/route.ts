import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { applyListingFilters, listingStats } from "@/lib/listings";
import { canonicalFromForm, normalizeCriteria, summarizeCriteria } from "@/lib/alerts/criteria";

export const dynamic = "force-dynamic";

// Live "23 homes match right now" count for the client-search form.
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("failure" in auth) return auth.failure;

  const body = await req.json().catch(() => ({}));
  const crit = normalizeCriteria(canonicalFromForm(body.criteria ?? {}));

  const stats = await listingStats(crit);
  const week = await applyListingFilters(
    auth.admin.from("listings").select("listing_key", { count: "exact", head: true }),
    crit,
  ).gt("first_seen_at", new Date(Date.now() - 7 * 86_400_000).toISOString());

  return NextResponse.json({
    count: stats.count,
    new_last_7_days: week.count ?? 0,
    price_min: stats.priceMin,
    price_max: stats.priceMax,
    summary: summarizeCriteria(crit),
  });
}
