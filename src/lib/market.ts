import { getLiveClient } from "@/lib/supabase";

// Live market snapshot for an SEO landing page — computed in Postgres by
// seo_page_market(slug) with the same filters the page lists homes with.
// Medians use homes (Residential) except on land pages, so a stray $3k lot
// or a $25M tract can't skew what a "homes for sale" page reports.
export interface PageMarket {
  count: number;
  priced_count: number;
  median_price: number | null;
  median_ppsf: number | null;
  median_sqft: number | null;
  median_dom: number | null;
  median_acres: number | null;
  new_7d: number;
  price_cuts: number;
  /** Priced listings under $150k, $150–250k, $250–350k, $350–500k, $500k+ */
  bands: number[];
  waterfront_count: number;
  /** Land listings anywhere in the page's area. */
  land_count: number;
}

export const PRICE_BAND_LABELS = ["Under $150k", "$150k–$250k", "$250k–$350k", "$350k–$500k", "$500k+"];

export async function getPageMarket(slug: string): Promise<PageMarket | null> {
  const { data, error } = await getLiveClient().rpc("seo_page_market", { p_slug: slug });
  if (error) {
    console.error("[market] snapshot failed:", error.message);
    return null;
  }
  return (data as PageMarket) ?? null;
}

export interface CityGuide {
  id: number;
  slug: string;
  title: string;
  category: string;
  cover_image: string | null;
}

/** Published blog posts about a city: tagged with it, named in the title, or linking to its pages. */
export async function getCityGuides(city: string, citySlug: string, limit = 3): Promise<CityGuide[]> {
  const safe = city.replace(/[(),%]/g, " ").trim();
  if (!safe) return [];
  const { data, error } = await getLiveClient()
    .from("blog_posts")
    .select("id, slug, title, category, cover_image, city, published_at")
    .eq("published", true)
    .or(`city.ilike.${safe},title.ilike.%${safe}%,body.ilike.%/${citySlug}/%`)
    .order("published_at", { ascending: false })
    .limit(12);
  if (error) {
    console.error("[market] city guides failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as (CityGuide & { city: string | null })[];
  // Posts tagged with the city first, then the rest (already newest-first).
  const tagged = (r: { city: string | null }) => (r.city ?? "").toLowerCase() === city.toLowerCase();
  return [...rows.filter(tagged), ...rows.filter((r) => !tagged(r))].slice(0, limit);
}
