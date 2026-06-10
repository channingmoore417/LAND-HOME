import Link from "next/link";
import { getPublicClient } from "@/lib/supabase";
import { usd, int, titleCase } from "@/lib/format";

export const revalidate = 300;

// Minimal landing for now — featured grid linking to listing pages.
// (Full IDX search + programmatic SEO pages come next.)
export default async function Home() {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("listings")
    .select(
      "listing_key, list_price, bedrooms_total, bathrooms_total, living_area, unparsed_address, city, photos_count",
    )
    .eq("standard_status", "Active")
    .gt("photos_count", 0)
    .order("modification_timestamp", { ascending: false })
    .limit(6);

  const rows = data ?? [];
  const keys = rows.map((r) => r.listing_key);
  const { data: media } = keys.length
    ? await supabase
        .from("listing_media")
        .select("listing_key, media_url, order")
        .in("listing_key", keys)
        .order("order", { ascending: true })
    : { data: [] as { listing_key: string; media_url: string }[] };

  const firstPhoto = new Map<string, string>();
  for (const m of (media as { listing_key: string; media_url: string }[]) ?? []) {
    if (!firstPhoto.has(m.listing_key)) firstPhoto.set(m.listing_key, m.media_url);
  }

  return (
    <section className="similar" style={{ borderTop: 0, marginTop: 0 }}>
      <div className="wrap">
        <div className="eyebrow">Featured Listings</div>
        <hr className="rule--gold" style={{ marginTop: "12px" }} />
        <div className="sim__grid">
          {rows.map((s) => (
            <Link className="sim__card" key={s.listing_key} href={`/listings/${s.listing_key}`}>
              {firstPhoto.get(s.listing_key) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={firstPhoto.get(s.listing_key)} alt={s.unparsed_address ?? "Listing"} />
              )}
              <div className="p">
                <div className="sim__price">{usd(s.list_price)}</div>
                <div className="sim__meta">
                  {s.bedrooms_total ?? "—"} bd · {s.bathrooms_total ?? "—"} ba ·{" "}
                  {int(s.living_area)} sq ft
                </div>
                <div className="sim__addr">{s.unparsed_address ?? `${titleCase(s.city)}, LA`}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
