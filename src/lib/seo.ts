// ============================================================
// SEO landing-page data layer. Each row in `seo_pages` defines one
// programmatic page (city-rooted: /[city]/[topic]). We map a row to listing
// filter criteria and fetch its siblings for internal linking.
// ============================================================

import { getLiveClient } from "@/lib/supabase";
import type { ListingCriteria } from "@/lib/listings";

export interface SeoPage {
  id: number;
  slug: string; // e.g. "lake-charles/homes-for-sale"
  page_type: string; // city | land | single_family | feature
  city: string | null;
  property_sub_type: string | null;
  beds_min: number | null;
  price_min: number | null;
  price_max: number | null;
  feature_key: string | null;
  postal_code: string | null;
  county_or_parish: string | null;
  high_school_district: string | null;
  listing_count: number | null;
  min_listing_count: number | null;
  active: boolean;
  gen_h1: string | null;
  gen_intro: string | null;
  gen_meta_title: string | null;
  gen_meta_desc: string | null;
  custom_h1: string | null;
  custom_intro: string | null;
  custom_meta_title: string | null;
  custom_meta_desc: string | null;
  custom_body: string | null;
}

export function slugifyCity(city: string): string {
  return city.toLowerCase().replace(/\s+/g, "-");
}

export async function getSeoPage(slug: string): Promise<SeoPage | null> {
  const supabase = getLiveClient();
  const { data } = await supabase
    .from("seo_pages")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return (data as SeoPage) ?? null;
}

// All city hub pages — for cross-city internal linking (home, footer).
export async function getCityHubs(): Promise<{ slug: string; city: string }[]> {
  const supabase = getLiveClient();
  const { data } = await supabase
    .from("seo_pages")
    .select("slug, city")
    .eq("page_type", "city")
    .eq("active", true);
  return ((data as { slug: string; city: string }[]) ?? []).sort((a, b) => a.city.localeCompare(b.city));
}

// All active pages for a city — used to render the internal-linking cluster.
export async function getCitySiblings(city: string): Promise<SeoPage[]> {
  const supabase = getLiveClient();
  const { data } = await supabase
    .from("seo_pages")
    .select("*")
    .eq("city", city)
    .eq("active", true)
    .order("id", { ascending: true });
  return (data as SeoPage[]) ?? [];
}

// Carlyss has no distinct value in the MLS feed's `city` column — it shares
// Sulphur's ZIP (70665) and Sulphur's city label. Per local knowledge:
// ZIP 70665, south of I-10. There's a visible gap in listing density between
// lat 30.22-30.23 (only ~6 active listings vs 25-44 on either side) that
// lines up with the I-10 corridor itself (highway right-of-way, no
// residential listings) — using 30.215 as the cutoff.
const CARLYSS_ZIP = "70665";
const CARLYSS_LAT_MAX = 30.215; // south of I-10

export function seoCriteria(page: SeoPage): ListingCriteria {
  const category =
    page.page_type === "land"
      ? "land"
      : page.page_type === "single_family"
        ? "single_family"
        : page.page_type === "mobile"
          ? "mobile"
          : undefined;
  const shared = {
    bedsMin: page.beds_min ?? undefined,
    priceMin: page.price_min ?? undefined,
    priceMax: page.price_max ?? undefined,
    category,
    features: page.feature_key ? [page.feature_key] : undefined,
  } as const;

  if (page.slug.startsWith("carlyss/")) {
    return { postalCode: CARLYSS_ZIP, latMax: CARLYSS_LAT_MAX, ...shared };
  }

  return {
    // Some cities' listings are mislabeled in the MLS feed's `city` column
    // (e.g. DeQuincy listings show up tagged Sulphur/Lake Charles/Ragley).
    // When a page specifies postal_code, filter by ZIP instead of the
    // unreliable city name — city is still kept for display (H1, breadcrumbs).
    city: page.postal_code ? undefined : (page.city ?? undefined),
    postalCode: page.postal_code ?? undefined,
    ...shared,
  };
}

// Clean plural noun (no "for sale") for use inside sentences/FAQs, so we don't
// produce "homes for sale are for sale".
export function topicNoun(page: SeoPage): string {
  if (page.page_type === "city") return "homes";
  if (page.page_type === "land") return "land listings";
  if (page.page_type === "single_family") return "single-family homes";
  if (page.page_type === "mobile") return "mobile & manufactured homes";
  if (page.page_type === "beds") return `${page.beds_min ?? 4}+ bedroom homes`;
  const map: Record<string, string> = {
    waterfront: "waterfront homes",
    pool: "homes with pools",
    new_construction: "new-construction homes",
    single_story: "single-story homes",
    acre_plus: "properties with acreage",
    updated: "updated homes",
    garage: "homes with garages",
  };
  return (page.feature_key && map[page.feature_key]) || "homes";
}

// Short label for the page within its city (used in breadcrumbs + cluster nav).
export function pageTopicLabel(page: SeoPage): string {
  if (page.page_type === "city") return "Homes for Sale";
  if (page.page_type === "land") return "Land for Sale";
  if (page.page_type === "single_family") return "Single-Family Homes";
  if (page.page_type === "mobile") return "Mobile & Manufactured Homes";
  if (page.page_type === "beds") return `${page.beds_min ?? 4}+ Bedroom Homes`;
  const map: Record<string, string> = {
    waterfront: "Waterfront Homes",
    pool: "Homes with Pools",
    new_construction: "New Construction",
    single_story: "Single-Story Homes",
    acre_plus: "Homes with Acreage",
    updated: "Updated & Remodeled",
    garage: "Homes with Garages",
  };
  return (page.feature_key && map[page.feature_key]) || "Listings";
}
