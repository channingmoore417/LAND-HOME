// ============================================================
// SEO landing-page data layer. Each row in `seo_pages` defines one
// programmatic page (city-rooted: /[city]/[topic]). We map a row to listing
// filter criteria and fetch its siblings for internal linking.
// ============================================================

import { getPublicClient } from "@/lib/supabase";
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
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("seo_pages")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return (data as SeoPage) ?? null;
}

// All active pages for a city — used to render the internal-linking cluster.
export async function getCitySiblings(city: string): Promise<SeoPage[]> {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("seo_pages")
    .select("*")
    .eq("city", city)
    .eq("active", true)
    .order("id", { ascending: true });
  return (data as SeoPage[]) ?? [];
}

export function seoCriteria(page: SeoPage): ListingCriteria {
  return {
    city: page.city ?? undefined,
    bedsMin: page.beds_min ?? undefined,
    priceMin: page.price_min ?? undefined,
    priceMax: page.price_max ?? undefined,
    category:
      page.page_type === "land" ? "land" : page.page_type === "single_family" ? "single_family" : undefined,
    features: page.feature_key ? [page.feature_key] : undefined,
  };
}

// Clean plural noun (no "for sale") for use inside sentences/FAQs, so we don't
// produce "homes for sale are for sale".
export function topicNoun(page: SeoPage): string {
  if (page.page_type === "city") return "homes";
  if (page.page_type === "land") return "land listings";
  if (page.page_type === "single_family") return "single-family homes";
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
