// Shared answer options for the buyer-match quizzes (the /buyer-quiz page and
// the blog's new-listings popup), plus the search URL their answers map to.

export const COMMUNITIES = [
  "Lake Charles", "Sulphur", "Moss Bluff", "Iowa", "Vinton", "Cameron",
  "Ragley", "DeQuincy", "DeRidder", "Jennings", "Welsh", "Carlyss", "Westlake",
];

export const FEATURES = [
  { key: "pool", label: "Pool or outdoor structures", note: "Pool, shop, covered patio", filter: "pool" },
  { key: "acreage", label: "Acreage / large lot", note: "Room to spread out", filter: "acre_plus" },
  { key: "waterfront", label: "Waterfront", note: "Lake, bayou, or canal", filter: "waterfront" },
  { key: "newconstruction", label: "New construction", note: "Recently built or to-be-built", filter: "new_construction" },
  { key: "singlestory", label: "Single story", note: "Everything on one level", filter: "single_story" },
];

export const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: "Under $150k", max: 150000 },
  { label: "$150k–$250k", min: 150000, max: 250000 },
  { label: "$250k–$350k", min: 250000, max: 350000 },
  { label: "$350k–$500k", min: 350000, max: 500000 },
  { label: "$500k–$750k", min: 500000, max: 750000 },
  { label: "$750k+", min: 750000 },
];

export const BEDS = ["1+", "2+", "3+", "4+", "5+"];
export const BATHS = ["1+", "2+", "3+", "4+"];

/** /homes-for-sale URL pre-filtered to a set of quiz answers. */
export function matchHref(a: {
  communities: string[];
  price: string;
  beds: string;
  baths: string;
  features: string[];
}): string {
  const p = new URLSearchParams();
  if (a.communities.length === 1) p.set("city", a.communities[0]);
  const b = parseInt(a.beds); if (b) p.set("beds", String(b));
  const ba = parseInt(a.baths); if (ba) p.set("baths", String(ba));
  const band = PRICE_BANDS.find((x) => x.label === a.price);
  if (band?.min) p.set("minPrice", String(band.min));
  if (band?.max) p.set("maxPrice", String(band.max));
  for (const f of a.features) {
    const k = FEATURES.find((x) => x.key === f)?.filter;
    if (k) p.append("feature", k);
  }
  return `/homes-for-sale${p.toString() ? `?${p}` : ""}`;
}
