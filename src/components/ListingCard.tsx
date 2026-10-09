import Link from "next/link";
import { usd, int, titleCase } from "@/lib/format";
import { photo } from "@/lib/images";
import type { Card } from "@/lib/listings";
import FavButton from "@/components/FavButton";
import ListingCardMedia from "@/components/ListingCardMedia";

// One property card. Server component (the heart toggle is its own client
// component). Shared by /listings and the SEO landing pages.
function specs(c: Card) {
  if ((c.property_type ?? "").toLowerCase().includes("land")) {
    return (
      <span>
        <b>{c.lot_size_sqft ? int(c.lot_size_sqft) : "—"}</b>
        <i>lot sqft</i>
      </span>
    );
  }
  return (
    <>
      <span><b>{c.bedrooms_total ?? "—"}</b><i>bd</i></span>
      <span className="dot">&bull;</span>
      <span><b>{c.bathrooms_total ?? "—"}</b><i>ba</i></span>
      <span className="dot">&bull;</span>
      <span><b>{int(c.living_area)}</b><i>sqft</i></span>
    </>
  );
}

export default function ListingCard({ c }: { c: Card }) {
  const isNew = c.days_on_market != null && c.days_on_market <= 14;
  const badge = isNew ? { label: "New", cls: " is-new" } : { label: titleCase(c.standard_status) || "For Sale", cls: "" };
  const showAddr = c.internet_address_yn !== false;
  const photoUrls = (c.photos && c.photos.length > 0 ? c.photos : c.photo_url ? [c.photo_url] : []).map((u) =>
    photo(u, 800),
  );
  const alt = showAddr ? c.unparsed_address ?? "Listing" : "Listing";
  const cityState = `${titleCase(c.city)}, ${c.state_or_province ?? "LA"} ${c.postal_code ?? ""}`.trim();

  return (
    <Link className="pcard" href={`/listings/${c.listing_key}`}>
      <div className="pcard__media">
        <ListingCardMedia photos={photoUrls} alt={alt} />
        <span className={`pcard__status${badge.cls}`}>{badge.label}</span>
        <FavButton listingKey={c.listing_key} />
        {c.photos_count ? <span className="pcard__photos">&#9634; {c.photos_count}</span> : null}
      </div>
      <div className="pcard__body">
        <div className="pcard__price">{usd(c.list_price)}</div>
        <div className="pcard__specs">{specs(c)}</div>
        <div className="pcard__addr">
          {showAddr ? c.unparsed_address ?? `${titleCase(c.city)} Area` : `${titleCase(c.city)} Area`}
        </div>
        <div className="pcard__sub">{cityState}</div>
        <div className="pcard__foot">
          <span className="pcard__mls">{c.listing_id ? `MLS# ${c.listing_id}` : ""}</span>
          <span className="pcard__cta">View Home <span className="arr">&rarr;</span></span>
        </div>
        {!c.is_lhg_listing && c.list_office_name && (
          <div className="pcard__courtesy">Listing provided courtesy of {c.list_office_name}</div>
        )}
      </div>
    </Link>
  );
}
