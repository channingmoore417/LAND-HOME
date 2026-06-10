import type { MetadataRoute } from "next";
import { getPublicClient } from "@/lib/supabase";

// Dynamic sitemap so EVERY active property is discoverable/indexable by
// search engines — not just the ones a visitor happens to click. Regenerated
// hourly (and on demand via /api/revalidate). One sitemap supports up to
// 50,000 URLs, comfortably above the current ~3,000 listings.
export const revalidate = 3600;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://landhomegroup.com").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/listings`, changeFrequency: "hourly", priority: 0.9 },
  ];

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

  return [...staticRoutes, ...listings];
}
