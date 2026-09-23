import { getLiveClient } from "@/lib/supabase";
import { usd } from "@/lib/format";

// Live "how long does it take to sell" numbers for a city, from
// city_sell_stats(slug): days to an accepted offer (MLS days on market of
// homes now under contract) plus the last 6 months of closed sales.
export interface SellStats {
  city: string;
  pending_n: number;
  days_to_offer: number | null;
  pct_offer_30d: number | null;
  pct_over_90d: number | null;
  active_n: number;
  sold_6mo: number;
  sales_per_month: number | null;
  months_inventory: number | null;
  median_sold: number | null;
  sale_to_list: number | null;
  pct_at_or_above: number | null;
}

export async function getSellStats(slug: string): Promise<SellStats | null> {
  const { data, error } = await getLiveClient().rpc("city_sell_stats", { p_slug: slug });
  if (error) {
    console.error("[sellStats] failed:", error.message);
    return null;
  }
  return (data as SellStats) ?? null;
}

/** Word the market by months of supply, so copy stays true as numbers move. */
function marketType(mi: number | null): string {
  if (mi == null) return "is hard to read right now";
  if (mi < 4) return "leans toward sellers";
  if (mi <= 6) return "is fairly balanced between buyers and sellers";
  return "leans toward buyers";
}

function pace(days: number | null): string {
  if (days == null) return "hard to measure right now";
  if (days <= 30) return "moving quickly";
  if (days <= 60) return "moving at a steady pace";
  return "taking a while";
}

const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString());

/** Fills {{tokens}} in a post with live numbers. Unknown tokens are left as-is. */
export function fillSellTokens(text: string, s: SellStats | null): string {
  if (!s) return text;
  const d = s.days_to_offer;
  const small = s.pending_n < 10 || s.sold_6mo < 10;
  const vals: Record<string, string> = {
    city: s.city,
    days_to_offer: n(d),
    total_low: d == null ? "—" : String(d + 30),
    total_high: d == null ? "—" : String(d + 45),
    pct_offer_30d: n(s.pct_offer_30d),
    pct_over_90d: n(s.pct_over_90d),
    pending_n: n(s.pending_n),
    active_n: n(s.active_n),
    sold_6mo: n(s.sold_6mo),
    sales_per_month: n(s.sales_per_month),
    months_inventory: n(s.months_inventory),
    median_sold: s.median_sold ? usd(s.median_sold) : "—",
    sale_to_list: s.sale_to_list == null ? "—" : `${s.sale_to_list}%`,
    pct_at_or_above: n(s.pct_at_or_above),
    pace: pace(d),
    market_type: marketType(s.months_inventory),
    as_of: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "America/Chicago" }),
    sample_note: small
      ? `One thing to keep in mind: ${s.city} only has a handful of recent sales and homes under contract, so treat these numbers as a rough guide. One or two homes can move them a lot.`
      : "",
  };
  return text.replace(/\{\{(\w+)\}\}/g, (all, k: string) => vals[k] ?? all);
}
