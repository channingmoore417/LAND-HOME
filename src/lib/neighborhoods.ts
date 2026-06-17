// ============================================================
// Curated neighborhood layer. The MLS only gives us SubdivisionName (noisy,
// ~54% coverage) — not a clean neighborhood taxonomy — so we define the
// well-known Lake Charles neighborhoods here and match listings by subdivision
// keyword and/or ZIP. Photo cards pull a real, recent listing photo from each
// neighborhood, so they stay fresh automatically.
// ============================================================

import { getLiveClient } from "@/lib/supabase";
import { fetchFirstPhotos } from "@/lib/listings";
import { getCityHubs } from "@/lib/seo";

// One-line descriptors for the city photo cards on the Buy hub.
const CITY_BLURB: Record<string, string> = {
  "Lake Charles": "The lakefront hub of Southwest Louisiana — the region's deepest inventory.",
  "Sulphur": "Family-friendly living just west of Lake Charles, with newer subdivisions.",
  "Iowa": "Rural acreage and newer homes a short drive east of the city.",
  "Westlake": "Established neighborhoods and new growth across the river.",
  "Ragley": "Country living, acreage, and room to roam north of town.",
  "Jennings": "Small-town charm and affordability along the I-10 corridor.",
  "DeRidder": "Affordable homes and plentiful land in Beauregard Parish.",
  "Vinton": "Affordable homes and acreage near the Texas line.",
  "Cameron": "Gulf-coast camps, waterfront, and coastal land.",
  "Welsh": "Affordable rural living in Jefferson Davis Parish.",
  "Moss Bluff": "Larger lots and good schools just north of Lake Charles.",
};

export interface Neighborhood {
  slug: string;
  name: string;
  blurb: string;
  keywords?: string[]; // matched against subdivision_name (ILIKE, OR'd)
  zip?: string; // matched against postal_code (prefix)
}

// Ordered roughly by inventory + recognizability. Add other cities' lists here
// as the program expands.
export const NEIGHBORHOODS: Record<string, Neighborhood[]> = {
  "Lake Charles": [
    {
      slug: "morganfield",
      name: "Morganfield",
      keywords: ["morganfield"],
      blurb:
        "One of Lake Charles' fastest-growing master-planned communities. Morganfield — including Waterside Meadows and The Ridge — offers newer construction, community lakes, and family-friendly streets in the 70605 corridor.",
    },
    {
      slug: "graywood",
      name: "Graywood",
      keywords: ["graywood"],
      blurb:
        "An upscale master-planned golf community in south Lake Charles, Graywood pairs newer custom homes with resort-style amenities, walking trails, and a championship course.",
    },
    {
      slug: "southridge-estates",
      name: "Southridge Estates",
      keywords: ["southridge"],
      blurb:
        "An established south Lake Charles subdivision known for spacious lots and solid family homes, convenient to top schools and Nelson Road shopping.",
    },
    {
      slug: "roseville-estates",
      name: "Roseville Estates",
      keywords: ["roseville"],
      blurb:
        "A popular newer-development neighborhood in south Lake Charles offering modern homes and quick access to shopping, dining, and I-210.",
    },
    {
      slug: "lakewood-pointe",
      name: "Lakewood Pointe",
      keywords: ["lakewood point"],
      blurb:
        "A sought-after south Lake Charles community with newer homes and a quiet, established feel — a favorite for families and move-up buyers.",
    },
    {
      slug: "summer-place",
      name: "Summer Place",
      keywords: ["summer place"],
      blurb:
        "A centrally located Lake Charles neighborhood prized for its convenience and approachable price points, close to McNeese and downtown.",
    },
    {
      slug: "margaret-place",
      name: "Margaret Place",
      keywords: ["margaret"],
      blurb:
        "One of Lake Charles' most beloved historic neighborhoods. Margaret Place is lined with grand early-1900s homes, mature oaks, and timeless character just minutes from downtown.",
    },
    {
      slug: "charpentier-historic-district",
      name: "Charpentier Historic District",
      keywords: ["charpentier", "historic"],
      blurb:
        "Downtown Lake Charles' signature historic district, famous for its eclectic turn-of-the-century architecture and walkable, character-rich streets.",
    },
  ],
};

// ZIP-code areas — a SEPARATE layer from neighborhoods. Clean and reliable
// (ZIP is ~96% populated), each given a friendly area label + description.
export const ZIP_AREAS: Record<string, Neighborhood[]> = {
  "Lake Charles": [
    {
      slug: "70605",
      name: "South Lake Charles",
      zip: "70605",
      blurb:
        "The most sought-after side of town — newer subdivisions, top-rated schools, Prien Lake Park, and the Nelson Road shopping corridor.",
    },
    {
      slug: "70601",
      name: "Central & Downtown",
      zip: "70601",
      blurb:
        "The historic heart of the city, from downtown and the Charpentier District to established mid-century neighborhoods.",
    },
    {
      slug: "70607",
      name: "Southeast Lake Charles",
      zip: "70607",
      blurb:
        "A growing area to the southeast with a mix of newer homes and acreage, plus easy access to I-210 and the airport.",
    },
    {
      slug: "70611",
      name: "North Lake Charles",
      zip: "70611",
      blurb:
        "North-side living with larger lots and a more rural feel, stretching toward Moss Bluff and Gillis.",
    },
    {
      slug: "70615",
      name: "East Lake Charles",
      zip: "70615",
      blurb:
        "East-side neighborhoods offering affordable homes and convenient access along the I-10 corridor.",
    },
  ],
};

export function neighborhoodsFor(city: string | null | undefined): Neighborhood[] {
  return (city && NEIGHBORHOODS[city]) || [];
}
export function zipAreasFor(city: string | null | undefined): Neighborhood[] {
  return (city && ZIP_AREAS[city]) || [];
}
export function findNeighborhood(city: string, slug: string): Neighborhood | undefined {
  return neighborhoodsFor(city).find((n) => n.slug === slug);
}
export function findZipArea(city: string, zip: string): Neighborhood | undefined {
  return zipAreasFor(city).find((z) => z.zip === zip || z.slug === zip);
}

export interface AreaCard extends Neighborhood {
  count: number;
  photoUrl: string | null;
}

// Shared card builder: for each area (neighborhood or ZIP) returns the active
// listing count + a representative (newest) listing photo. One query per area
// plus a single batched photo lookup.
async function fetchAreaCards(city: string, items: Neighborhood[]): Promise<AreaCard[]> {
  if (items.length === 0) return [];
  const supabase = getLiveClient();

  const reps = await Promise.all(
    items.map(async (n) => {
      let q = supabase
        .from("listings")
        .select("listing_key", { count: "exact" })
        .eq("standard_status", "Active")
        .neq("internet_display_yn", false)
        .not("property_type", "in", "(ResidentialLease,CommercialLease)")
        .ilike("city", city)
        .gt("photos_count", 0)
        .order("modification_timestamp", { ascending: false })
        .limit(1);
      if (n.keywords?.length) {
        q = q.or(n.keywords.map((k) => `subdivision_name.ilike.%${k}%`).join(","));
      }
      if (n.zip) q = q.ilike("postal_code", `${n.zip}%`);
      const { data, count } = await q;
      const key = (data as { listing_key: string }[])?.[0]?.listing_key;
      return { n, key, count: count ?? 0 };
    }),
  );

  const keys = reps.map((r) => r.key).filter(Boolean) as string[];
  const photos = await fetchFirstPhotos(keys);

  return reps.map((r) => ({
    ...r.n,
    count: r.count,
    photoUrl: r.key ? photos.get(r.key) ?? null : null,
  }));
}

export function neighborhoodCards(city: string): Promise<AreaCard[]> {
  return fetchAreaCards(city, neighborhoodsFor(city));
}
export function zipCards(city: string): Promise<AreaCard[]> {
  return fetchAreaCards(city, zipAreasFor(city));
}

// City photo cards for the Buy hub: count + representative photo per city hub.
export async function cityCards(): Promise<AreaCard[]> {
  const hubs = await getCityHubs(); // { slug: "lake-charles/homes-for-sale", city }
  const supabase = getLiveClient();
  const reps = await Promise.all(
    hubs.map(async (h) => {
      const { data, count } = await supabase
        .from("listings")
        .select("listing_key", { count: "exact" })
        .eq("standard_status", "Active")
        .neq("internet_display_yn", false)
        .not("property_type", "in", "(ResidentialLease,CommercialLease)")
        .ilike("city", h.city)
        .gt("photos_count", 0)
        .order("modification_timestamp", { ascending: false })
        .limit(1);
      const key = (data as { listing_key: string }[])?.[0]?.listing_key;
      return { h, key, count: count ?? 0 };
    }),
  );
  const photos = await fetchFirstPhotos(reps.map((r) => r.key).filter(Boolean) as string[]);
  return reps
    .map((r) => ({
      slug: r.h.slug, // full hub slug → href is `/${slug}`
      name: r.h.city,
      blurb: CITY_BLURB[r.h.city] ?? "",
      count: r.count,
      photoUrl: r.key ? photos.get(r.key) ?? null : null,
    }))
    .sort((a, b) => b.count - a.count);
}
