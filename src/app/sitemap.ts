import type { MetadataRoute } from "next";
import { getPublicClient } from "@/lib/supabase";
import { getCategories, categorySlug } from "@/lib/blog";
import { isIndexablePage } from "@/lib/seo";

// Dynamic sitemap so EVERY active property is discoverable/indexable by
// search engines — not just the ones a visitor happens to click. Regenerated
// hourly (and on demand via /api/revalidate). One sitemap supports up to
// 50,000 URLs, comfortably above the current ~3,000 listings.
export const revalidate = 3600;

import { SITE_URL as SITE } from "@/lib/seoConfig";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/homes-for-sale`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/our-listings`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE}/buy`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/buyers-agent`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/sell-my-house-fast`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/home-value`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/get-pre-approved`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/buyer-quiz`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/home-buying-guide`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Agent profile pages.
  let agents: MetadataRoute.Sitemap = [];
  try {
    const { data } = await getPublicClient().from("agents").select("slug").eq("active", true);
    agents = ((data as { slug: string }[]) ?? []).map((r) => ({
      url: `${SITE}/agents/${r.slug}`, changeFrequency: "weekly" as const, priority: 0.6,
    }));
  } catch { /* sitemap still renders without them */ }

  // Blog posts.
  let blog: MetadataRoute.Sitemap = [];
  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("published", true);
    blog = ((data as { slug: string; updated_at: string | null }[]) ?? []).map((r) => ({
      url: `${SITE}/blog/${r.slug}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.error("[sitemap] blog fetch failed:", (e as Error).message);
  }

  // Blog categories.
  let blogCategories: MetadataRoute.Sitemap = [];
  try {
    const cats = await getCategories();
    blogCategories = cats.map((c) => ({
      url: `${SITE}/blog/category/${categorySlug(c)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch (e) {
    console.error("[sitemap] blog categories fetch failed:", (e as Error).message);
  }

  // Programmatic SEO landing pages (/[city]/[topic]).
  let seoPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("seo_pages")
      .select("slug, page_type, listing_count, min_listing_count")
      .eq("active", true);
    seoPages = ((data as { slug: string; page_type: string; listing_count: number | null; min_listing_count: number | null }[]) ?? [])
      .filter(isIndexablePage)
      .map((r) => ({
      url: `${SITE}/${r.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch (e) {
    console.error("[sitemap] seo_pages fetch failed:", (e as Error).message);
  }

  let listings: MetadataRoute.Sitemap = [];
  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("listings")
      .select("listing_key, modification_timestamp")
      .neq("internet_display_yn", false)
      .eq("standard_status", "Active")
      .limit(50000);
    listings = ((data as { listing_key: string; modification_timestamp: string | null }[]) ?? []).map(
      (r) => ({
        url: `${SITE}/listings/${r.listing_key}`,
        lastModified: r.modification_timestamp ? new Date(r.modification_timestamp) : undefined,
        changeFrequency: "daily" as const,
        priority: 0.7,
      }),
    );
  } catch (e) {
    console.error("[sitemap] listing fetch failed:", (e as Error).message);
  }

  return [...staticRoutes, ...agents, ...blog, ...blogCategories, ...seoPages, ...listings];
}
