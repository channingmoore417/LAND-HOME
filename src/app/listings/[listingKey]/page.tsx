import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicClient } from "@/lib/supabase";
import { site } from "@/config/site";
import { usd, int, num, titleCase, splitFeatures, estAnnualTax } from "@/lib/format";
import { photo } from "@/lib/images";
import type { Listing, ListingMedia } from "@/lib/types";
import Gallery, { type Photo } from "@/components/Gallery";
import MortgageCalculator from "@/components/MortgageCalculator";
import PropertyInteractive from "@/components/PropertyInteractive";
import PropertyMap from "@/components/PropertyMap";
import LocalMap from "@/components/LocalMap";
import Testimonials from "@/components/Testimonials";

export const revalidate = 300; // ISR: refresh each page ~every 5 min

async function getListing(key: string): Promise<Listing | null> {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("listing_key", key)
    .maybeSingle();
  return (data as Listing) ?? null;
}

async function getMedia(key: string): Promise<ListingMedia[]> {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("listing_media")
    .select("*")
    .eq("listing_key", key)
    .order("order", { ascending: true });
  return (data as ListingMedia[]) ?? [];
}

interface SimilarCard {
  listing_key: string;
  list_price: number | null;
  bedrooms_total: number | null;
  bathrooms_total: number | null;
  living_area: number | null;
  unparsed_address: string | null;
  city: string | null;
  photo: string | null;
}

async function getSimilar(listing: Listing): Promise<SimilarCard[]> {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("listings")
    .select(
      "listing_key, list_price, bedrooms_total, bathrooms_total, living_area, unparsed_address, city, photos_count",
    )
    .eq("city", listing.city)
    .eq("standard_status", "Active")
    .neq("listing_key", listing.listing_key)
    .gt("photos_count", 0)
    .limit(3);

  const rows = (data as Omit<SimilarCard, "photo">[]) ?? [];
  if (rows.length === 0) return [];

  const { data: media } = await supabase
    .from("listing_media")
    .select("listing_key, media_url, order")
    .in(
      "listing_key",
      rows.map((r) => r.listing_key),
    )
    .order("order", { ascending: true });

  const firstPhoto = new Map<string, string>();
  for (const m of (media as { listing_key: string; media_url: string }[]) ?? []) {
    if (!firstPhoto.has(m.listing_key)) firstPhoto.set(m.listing_key, m.media_url);
  }
  return rows.map((r) => ({ ...r, photo: firstPhoto.get(r.listing_key) ?? null }));
}

export async function generateMetadata({
  params,
}: {
  params: { listingKey: string };
}): Promise<Metadata> {
  const listing = await getListing(params.listingKey);
  if (!listing) return { title: "Listing not found" };
  const showAddr = listing.internet_address_yn !== false;
  const addr = showAddr ? listing.unparsed_address ?? "" : titleCase(listing.city);
  const title = `${addr}${addr ? ", " : ""}${titleCase(listing.city)}, ${listing.state_or_province ?? "LA"}`;
  return {
    title,
    description: `${listing.bedrooms_total ?? "—"} bed, ${listing.bathrooms_total ?? "—"} bath, ${int(
      listing.living_area,
    )} sq ft home in ${titleCase(listing.city)}. Offered at ${usd(listing.list_price)} by ${site.name}.`,
  };
}

export default async function ListingPage({
  params,
}: {
  params: { listingKey: string };
}) {
  const listing = await getListing(params.listingKey);
  if (!listing) notFound();

  const [media, similar] = await Promise.all([
    getMedia(listing.listing_key),
    getSimilar(listing),
  ]);

  const showAddress = listing.internet_address_yn !== false;
  const showRemarks = listing.internet_comment_yn !== false;

  const cityState = `${titleCase(listing.city)}, ${listing.state_or_province ?? "LA"} ${listing.postal_code ?? ""}`.trim();
  const addressLine = showAddress
    ? listing.unparsed_address ??
      [listing.street_number, titleCase(listing.street_name), listing.street_suffix]
        .filter(Boolean)
        .join(" ")
    : `${titleCase(listing.city)} Area`;
  const fullLabel = showAddress
    ? `${addressLine}, ${cityState}`
    : `${titleCase(listing.city)}, ${listing.state_or_province ?? "LA"}`;
  const priceLabel = usd(listing.list_price);

  const photos: Photo[] = media.map((m, idx) => ({
    url: photo(m.media_url, 1600),
    alt: m.short_desc || `${addressLine} — photo ${idx + 1}`,
  }));

  const taxAnnual = listing.tax_annual_amount ?? estAnnualTax(listing.list_price);
  const taxIsEst = listing.tax_annual_amount == null;

  // Property details rows (skip empties; Flood Zone intentionally kept).
  const details: { k: string; v: string | null }[] = [
    { k: "Property Type", v: titleCase(listing.property_sub_type) || titleCase(listing.property_type) || null },
    { k: "Stories", v: listing.stories_total ? String(listing.stories_total) : null },
    {
      k: "Garage",
      v: listing.garage_spaces
        ? `${listing.garage_spaces} Car`
        : listing.has_garage
          ? "Yes"
          : null,
    },
    { k: "Heating", v: listing.heating || null },
    { k: "Cooling", v: listing.cooling || null },
    { k: "Roof", v: listing.roof || null },
    { k: "Subdivision", v: titleCase(listing.subdivision_name) || null },
    { k: "County", v: titleCase(listing.county_or_parish) || null },
    // Flood Zone — kept per brand direction (Bayou rule does not apply here).
    { k: "Flood Zone", v: "Contact for details" },
    {
      k: "Annual Taxes",
      v: taxAnnual ? `${usd(taxAnnual)}${taxIsEst ? " (est.)" : ""}` : null,
    },
  ].filter((d) => d.v);

  const amenities = Array.from(
    new Set(
      [
        ...splitFeatures(listing.interior_features),
        ...splitFeatures(listing.exterior_features),
        ...splitFeatures(listing.pool_features),
        ...splitFeatures(listing.appliances),
      ].map((s) => titleCase(s)),
    ),
  ).slice(0, 16);

  const statusLabel = listing.standard_status
    ? `For Sale · ${listing.standard_status}`
    : "For Sale";

  return (
    <>
      {/* HERO */}
      <header className="hero">
        <div className="wrap">
          <div className="hero__head">
            <div>
              <div className="hero__crumb">
                <Link href="/">Home</Link> &nbsp;/&nbsp;{" "}
                <Link href="/listings">{titleCase(listing.city)}</Link>
                {listing.listing_id ? ` · MLS# ${listing.listing_id}` : ""}
              </div>
              <span className="hero__script">welcome home to</span>
              <h1 className="hero__addr">
                {addressLine}
                <span>{cityState}</span>
              </h1>
            </div>
            <div className="hero__price">
              <div className="lbl">Offered At</div>
              <div className="val">{priceLabel}</div>
              <div className="hero__status">{statusLabel}</div>
            </div>
          </div>

          <Gallery photos={photos} />
        </div>
      </header>

      {/* FACT STRIP */}
      <div className="facts">
        <div className="facts__inner">
          <div className="fact">
            <div className="n">{listing.bedrooms_total ?? "—"}</div>
            <div className="k">Bedrooms</div>
          </div>
          <div className="fact">
            <div className="n">{listing.bathrooms_total ?? "—"}</div>
            <div className="k">Bathrooms</div>
          </div>
          <div className="fact">
            <div className="n">
              {int(listing.living_area)} <small>sq ft</small>
            </div>
            <div className="k">Living Area</div>
          </div>
          <div className="fact">
            <div className="n">
              {num(listing.lot_size_acres, 2)} <small>ac</small>
            </div>
            <div className="k">Lot Size</div>
          </div>
          <div className="fact">
            <div className="n">{listing.year_built ?? "—"}</div>
            <div className="k">Year Built</div>
          </div>
          <div className="fact">
            <div className="n">
              {usd(listing.price_per_sqft)} <small>/sf</small>
            </div>
            <div className="k">Price / SqFt</div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <main className="body">
        <div className="wrap">
          <div className="grid">
            <div>
              {showRemarks && listing.public_remarks && (
                <section className="section">
                  <span className="script section__script">about this home</span>
                  <h2 className="section__title">About this home</h2>
                  <div className="prose">
                    <p>{listing.public_remarks}</p>
                  </div>
                </section>
              )}

              {details.length > 0 && (
                <section className="section">
                  <span className="script section__script">the details</span>
                  <h2 className="section__title">Property details</h2>
                  <div className="features">
                    {details.map((d) => (
                      <div key={d.k}>
                        <span>{d.k}</span>
                        <span>{d.v}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {amenities.length > 0 && (
                <section className="section">
                  <span className="script section__script">what you&apos;ll love</span>
                  <h2 className="section__title">Features &amp; finishes</h2>
                  <div className="amenities">
                    {amenities.map((a) => (
                      <span key={a}>{a}</span>
                    ))}
                  </div>
                </section>
              )}

              <section className="section" id="calc">
                <span className="script section__script">run the numbers</span>
                <h2 className="section__title">Estimate your payment</h2>
                <MortgageCalculator price={listing.list_price ?? 0} taxAnnual={taxAnnual} />
              </section>

              <section className="section">
                <span className="script section__script">the neighborhood</span>
                <h2 className="section__title">Location</h2>
                <PropertyMap
                  latitude={listing.latitude}
                  longitude={listing.longitude}
                  label={fullLabel}
                  city={titleCase(listing.city)}
                  state={listing.state_or_province ?? "LA"}
                  precise={showAddress}
                />
              </section>

              {!listing.is_lhg_listing && listing.list_office_name && (
                <div className="idx-attribution">
                  Listing provided courtesy of {listing.list_office_name}
                </div>
              )}
            </div>

            {/* SIDEBAR */}
            <aside className="aside">
              <PropertyInteractive
                listingKey={listing.listing_key}
                address={fullLabel}
                priceLabel={priceLabel}
              />

              <div className="card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="team__photo" src={site.teamPhotoUrl} alt={site.name} />
                <div className="card__inner">
                  <div className="agent__name">{site.name}</div>
                  <div className="agent__role">{site.brokerage}</div>
                  <div className="agent__lic">
                    {site.serviceArea} · <a href={site.phoneHref}>{site.phone}</a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* SIMILAR */}
      {similar.length > 0 && (
        <section className="similar">
          <div className="wrap">
            <span className="script" style={{ fontSize: "1.7rem" }}>
              more nearby
            </span>
            <h2 className="section__title" style={{ marginTop: 0 }}>
              More homes in {titleCase(listing.city)}
            </h2>
            <div className="sim__grid">
              {similar.map((s) => (
                <Link className="sim__card" key={s.listing_key} href={`/listings/${s.listing_key}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.photo && <img src={photo(s.photo, 800)} alt={s.unparsed_address ?? "Listing"} />}
                  <div className="p">
                    <div className="sim__price">{usd(s.list_price)}</div>
                    <div className="sim__meta">
                      {s.bedrooms_total ?? "—"} bd · {s.bathrooms_total ?? "—"} ba ·{" "}
                      {int(s.living_area)} sq ft
                    </div>
                    <div className="sim__addr">
                      {s.unparsed_address ?? `${titleCase(s.city)}, LA`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS — social proof */}
      <Testimonials max={6} />

      {/* FIND US — local team + Google map embed */}
      <LocalMap
        cityLabel={titleCase(listing.city)}
        href={`/listings?city=${encodeURIComponent(listing.city ?? "")}`}
        ctaLabel={`More homes in ${titleCase(listing.city)}`}
      />
    </>
  );
}
