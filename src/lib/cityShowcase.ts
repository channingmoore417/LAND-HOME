import { getLiveClient } from "@/lib/supabase";
import { applyListingFilters, fetchFirstPhotos } from "@/lib/listings";
import { seoCriteria, type SeoPage } from "@/lib/seo";
import { getPageMarket } from "@/lib/market";

// Data for the city photo cards (home, Buy, All Homes, Buyer's Agent pages).
// Each card shows a real home for sale in that city: our own listings first,
// otherwise one of the nicer homes on the market, rotating daily.

// Two plain sentences per city. Facts only; the live numbers carry the rest.
export const CITY_CARD_COPY: Record<string, string> = {
  "Lake Charles": "The biggest city in Southwest Louisiana, with the most homes for sale in the region. Historic streets near the lake, established neighborhoods like Graywood, and new construction on the east side.",
  "Sulphur": "About 10 miles west of Lake Charles on I-10. Family neighborhoods, newer subdivisions and an easy drive to the plants.",
  "Moss Bluff": "About 15 minutes north of Lake Charles on Highway 171. Bigger lots, newer homes and a quieter, semi-rural feel close to town.",
  "Westlake": "Right across the Calcasieu River from Lake Charles. Established streets, new subdivisions and quick access to the west-side plants.",
  "Carlyss": "Just south of Sulphur on Highway 27. Larger lots, more room between neighbors and a short drive to the Sulphur-area plants.",
  "Iowa": "About 15 minutes east of Lake Charles on I-10. A small town with newer subdivisions, acreage and a quick commute.",
  "Ragley": "About 25 minutes north of Lake Charles in Beauregard Parish. Country living, acreage and room for a shop or animals.",
  "DeQuincy": "A small railroad town about 35 minutes north of Lake Charles. Quiet streets, lower prices and land just outside town.",
  "DeRidder": "The seat of Beauregard Parish, just under an hour north. Affordable homes, plenty of land and close to Fort Johnson.",
  "Jennings": "The seat of Jefferson Davis Parish, about 35 minutes east on I-10. A historic downtown, affordable homes and a small-town pace.",
  "Welsh": "A small town between Lake Charles and Jennings on I-10. Affordable homes, farmland and room to spread out.",
  "Vinton": "Near the Texas line, about 30 minutes west on I-10. Affordable homes, acreage and Delta Downs down the road.",
  "Cameron": "On the Gulf Coast about an hour south of Lake Charles. Fishing camps, waterfront land and coastal living.",
};

export interface CityShowcaseCard {
  slug: string; // hub slug, e.g. "lake-charles/homes-for-sale"
  name: string;
  href: string;
  blurb: string;
  count: number;
  medianPrice: number | null;
  photoUrl: string | null;
  featured: {
    price: number | null;
    beds: number | null;
    baths: number | null;
    courtesy: string | null; // listing office, when it isn't ours (IDX attribution)
  } | null;
}

interface FeaturedRow {
  listing_key: string;
  list_price: number | null;
  bedrooms_total: number | null;
  bathrooms_total: number | null;
  is_lhg_listing: boolean | null;
  list_office_name: string | null;
}

async function featuredFor(page: SeoPage): Promise<FeaturedRow | null> {
  const q = applyListingFilters(
    getLiveClient()
      .from("listings")
      .select("listing_key, list_price, bedrooms_total, bathrooms_total, is_lhg_listing, list_office_name"),
    { ...seoCriteria(page), category: "residential" },
  )
    .gte("photos_count", 8)
    .order("is_lhg_listing", { ascending: false })
    .order("list_price", { ascending: false, nullsFirst: false })
    .limit(6);
  const { data } = await q;
  const rows = (data as FeaturedRow[]) ?? [];
  if (!rows.length) return null;
  // Our own listing when we have one; otherwise rotate through the top few daily.
  if (rows[0].is_lhg_listing) return rows[0];
  const day = Math.floor(Date.now() / 86_400_000);
  return rows[day % rows.length];
}

export async function cityShowcase(): Promise<CityShowcaseCard[]> {
  const { data } = await getLiveClient().from("seo_pages").select("*").eq("page_type", "city").eq("active", true);
  const hubs = ((data as SeoPage[]) ?? []).filter((h) => h.city);

  const built = await Promise.all(
    hubs.map(async (h) => {
      const [feat, market] = await Promise.all([featuredFor(h), getPageMarket(h.slug)]);
      return { h, feat, market };
    }),
  );
  const photos = await fetchFirstPhotos(built.map((b) => b.feat?.listing_key).filter(Boolean) as string[]);

  return built
    .map(({ h, feat, market }) => ({
      slug: h.slug,
      name: h.city!,
      href: `/${h.slug}`,
      blurb: CITY_CARD_COPY[h.city!] ?? "",
      count: market?.count ?? h.listing_count ?? 0,
      medianPrice: market?.median_price && market.priced_count >= 3 ? market.median_price : null,
      photoUrl: feat ? photos.get(feat.listing_key) ?? null : null,
      featured: feat
        ? {
            price: feat.list_price,
            beds: feat.bedrooms_total,
            baths: feat.bathrooms_total,
            courtesy: feat.is_lhg_listing ? null : feat.list_office_name,
          }
        : null,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}
