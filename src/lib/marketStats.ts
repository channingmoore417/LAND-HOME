// ============================================================
// Real market metrics from the live MLS data, powering the "market at a
// glance" section on city hub pages. Two sources:
//
//   1. market_stats(p_city) RPC — live medians over Active Residential
//      listings (percentiles can't be expressed through PostgREST filters).
//   2. market_snapshots — weekly per-city aggregates captured by pg_cron
//      (capture_market_snapshot). The feed carries only Active/Pending, so
//      month-over-month change has to come from accumulated snapshots: we
//      compare today's live stats against the snapshot closest to 30 days
//      ago. Until a snapshot that old exists, trend fields are null and the
//      UI simply omits the deltas.
// ============================================================

import { getLiveClient } from "@/lib/supabase";

export interface MarketStats {
  activeCount: number;
  medianPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  medianDom: number | null;
  avgDom: number | null;
  medianPpsf: number | null;
  reducedCount: number;
  newLast30d: number;
  newPrior30d: number;
}

export interface MarketTrend {
  baselineDate: string; // snapshot_date the deltas compare against
  medianPriceChangePct: number | null;
  medianDomChangeDays: number | null;
  activeCountChangePct: number | null;
}

// PostgREST serializes numerics as strings — coerce defensively.
const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

export async function fetchMarketStats(city?: string | null): Promise<MarketStats | null> {
  const supabase = getLiveClient();
  const { data, error } = await supabase.rpc("market_stats", { p_city: city || null });
  if (error) {
    console.error("[marketStats] rpc failed:", error.message);
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    activeCount: num(row.active_count) ?? 0,
    medianPrice: num(row.median_price),
    minPrice: num(row.min_price),
    maxPrice: num(row.max_price),
    medianDom: num(row.median_dom),
    avgDom: num(row.avg_dom),
    medianPpsf: num(row.median_ppsf),
    reducedCount: num(row.reduced_count) ?? 0,
    newLast30d: num(row.new_last_30d) ?? 0,
    newPrior30d: num(row.new_prior_30d) ?? 0,
  };
}

// Snapshots eligible as a month-over-month baseline: at least 23 days old
// (so a fresh weekly snapshot never compares against itself) and at most 45
// (so the delta still honestly reads as "vs. about a month ago").
const BASELINE_MIN_DAYS = 23;
const BASELINE_MAX_DAYS = 45;

export async function fetchMarketTrend(
  live: MarketStats,
  city?: string | null,
): Promise<MarketTrend | null> {
  const supabase = getLiveClient();
  const min = new Date(Date.now() - BASELINE_MAX_DAYS * 86400_000).toISOString().slice(0, 10);
  const max = new Date(Date.now() - BASELINE_MIN_DAYS * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("market_snapshots")
    .select("snapshot_date, active_count, median_price, median_dom")
    .ilike("city", city || "ALL")
    .gte("snapshot_date", min)
    .lte("snapshot_date", max)
    .order("snapshot_date", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[marketStats] snapshot query failed:", error.message);
    return null;
  }
  const base = data?.[0];
  if (!base) return null;

  const basePrice = num(base.median_price);
  const baseDom = num(base.median_dom);
  const baseCount = num(base.active_count);

  const pct = (now: number | null, then: number | null): number | null =>
    now !== null && then !== null && then > 0 ? ((now - then) / then) * 100 : null;

  return {
    baselineDate: base.snapshot_date as string,
    medianPriceChangePct: pct(live.medianPrice, basePrice),
    medianDomChangeDays:
      live.medianDom !== null && baseDom !== null ? live.medianDom - baseDom : null,
    activeCountChangePct: pct(live.activeCount, baseCount),
  };
}
