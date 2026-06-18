import type { Metadata } from "next";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { site } from "@/config/site";
import { usd } from "@/lib/format";
import { fetchCards, fetchFirstPhotos, listingStats, PRICE_MAX, SQFT_MAX, type ListingCriteria } from "@/lib/listings";
import { getSeoPage, getCitySiblings, seoCriteria, slugifyCity, pageTopicLabel, topicNoun, type SeoPage } from "@/lib/seo";
import { resolveContent, faqsFor, jsonLdGraph } from "@/lib/seoContent";
import ListingCard from "@/components/ListingCard";
import JsonLd from "@/components/JsonLd";
import LocalMap from "@/components/LocalMap";
import Testimonials from "@/components/Testimonials";
import AreaShowcase from "@/components/AreaShowcase";
import ListingsControls, { type ListingFilters } from "@/components/ListingsControls";
import { neighborhoodCards, zipCards, neighborhoodsFor, zipAreasFor } from "@/lib/neighborhoods";

// Seed the on-page filter sidebar with this landing page's own criteria, so a
// pools page opens with "Pool" checked, a 4-bedroom page with 4+ beds, etc.
function pageToFilters(page: SeoPage): ListingFilters {
  return {
    q: "",
    city: page.city ?? "",
    beds: page.page_type === "beds" ? page.beds_min ?? 0 : 0,
    baths: 0,
    type:
      page.page_type === "land" ? "Land"
        : page.page_type === "single_family" ? "Single Family"
        : page.page_type === "mobile" ? "Mobile / Manufactured" : "",
    status: "",
    minPrice: page.price_min ?? 0,
    maxPrice: page.price_max ?? PRICE_MAX,
    minSqft: 0,
    maxSqft: SQFT_MAX,
    year: 0,
    features: page.feature_key ? [page.feature_key] : [],
    zip: "",
    neighborhood: "",
    sort: "new",
  };
}

// Render fresh per request: SEO copy lives in seo_pages and is edited often,
// and listing counts change constantly — caching risks serving stale content.
// These pages do only a few light, indexed queries, so dynamic is fine.
export const dynamic = "force-dynamic";

import { SITE_URL as SITE } from "@/lib/seoConfig";

// Build the /listings search URL that matches this page's criteria, so "view
// all" hands off to the full filterable search pre-filtered.
function searchHref(page: SeoPage): string {
  const p = new URLSearchParams();
  if (page.city) p.set("city", page.city);
  if (page.page_type === "land") p.set("type", "Land");
  else if (page.page_type === "single_family") p.set("type", "Single Family");
  else if (page.page_type === "mobile") p.set("type", "Mobile / Manufactured");
  if (page.page_type === "beds" && page.beds_min) p.set("beds", String(page.beds_min));
  if (page.feature_key) p.append("feature", page.feature_key);
  return `/listings${p.toString() ? `?${p}` : ""}`;
}

export async function generateMetadata({
  params,
}: {
  params: { city: string; topic: string };
}): Promise<Metadata> {
  const page = await getSeoPage(`${params.city}/${params.topic}`);
  if (!page) return { title: "Page not found" };
  const c = resolveContent(page);
  const url = `${SITE}/${page.slug}`;
  return {
    title: c.title,
    description: c.metaDesc,
    alternates: { canonical: url },
    openGraph: { title: c.title, description: c.metaDesc, url, type: "website" },
  };
}

export default async function SeoLandingPage({
  params,
}: {
  params: { city: string; topic: string };
}) {
  const slug = `${params.city}/${params.topic}`;
  const page = await getSeoPage(slug);
  if (!page) notFound();

  const criteria: ListingCriteria = seoCriteria(page);
  const [stats, { rows }, siblings] = await Promise.all([
    listingStats(criteria),
    fetchCards(criteria, { limit: 12, sort: "new" }),
    getCitySiblings(page.city ?? ""),
  ]);
  const photos = await fetchFirstPhotos(rows.map((r) => r.listing_key));
  for (const r of rows) r.photo_url = photos.get(r.listing_key) ?? null;

  const content = resolveContent(page);
  const faqs = faqsFor(page, stats);
  const cityLabel = page.city || "Southwest Louisiana";
  const topicLabel = pageTopicLabel(page);
  const noun = topicNoun(page);
  const citySlug = page.city ? slugifyCity(page.city) : "";
  const cityHubUrl = `${SITE}/${citySlug}/homes-for-sale`;
  const pageUrl = `${SITE}/${page.slug}`;

  const range =
    stats.priceMin && stats.priceMax ? ` priced from ${usd(stats.priceMin)} to ${usd(stats.priceMax)}` : "";

  const bodyParas = (page.custom_body || content.intro || "")
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const showMap = page.city === site.localSeo.city;
  const seeAll = searchHref(page);

  // Neighborhood + ZIP showcases — only on the city hub page.
  const isHub = page.page_type === "city";
  const [hoodCards, zoneCards] =
    isHub && page.city
      ? await Promise.all([neighborhoodCards(page.city), zipCards(page.city)])
      : [[], []];
  const hoodHref = (slug: string) => `/listings?city=${encodeURIComponent(cityLabel)}&neighborhood=${slug}`;
  const zipHref = (slug: string) => `/listings?city=${encodeURIComponent(cityLabel)}&zip=${slug}`;

  const jsonLd = jsonLdGraph({
    content, stats, cards: rows, faqs, siteUrl: SITE, pageUrl, cityHubUrl, cityLabel, topicLabel,
  });

  return (
    <>
      <JsonLd data={jsonLd} />

      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp;{" "}
            <Link href={`/${citySlug}/homes-for-sale`}>{cityLabel}</Link> &nbsp;/&nbsp; {topicLabel}
          </nav>
          <span className="hero__script">{topicLabel.toLowerCase()} in</span>
          <h1>{content.h1}</h1>
          <p className="hero__sub">
            {stats.count.toLocaleString()} {noun} for sale in {cityLabel}, Louisiana{range}.
          </p>
          <div className="hero__meta">
            <div><div className="n"><b>{stats.count.toLocaleString()}</b></div><div className="k">Active Listings</div></div>
            {stats.priceMin ? <div><div className="n">{usd(stats.priceMin)}</div><div className="k">Starting Price</div></div> : null}
            {stats.priceMax ? <div><div className="n">{usd(stats.priceMax)}</div><div className="k">Up To</div></div> : null}
          </div>
          <div className="hero__cta">
            <Link className="btn btn--aqua" href="/buyer-quiz">Take the Buyer Quiz</Link>
            <a className="btn btn--hollow" href={site.phoneHref}>Call Us Now</a>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap">
          <div className="searchgrid">
            <ListingsControls
              filters={pageToFilters(page)}
              total={stats.count}
              neighborhoods={neighborhoodsFor(page.city).map((n) => ({ slug: n.slug, name: n.name }))}
              zips={zipAreasFor(page.city).map((z) => ({ slug: z.slug, name: `${z.name} · ${z.zip}` }))}
            />
            <div className="searchgrid__main">
              <div className="results__head">
                <div className="meta">
                  Showing <b>{Math.min(rows.length, stats.count)}</b> of <b>{stats.count.toLocaleString()}</b> {topicLabel.toLowerCase()}
                </div>
                <div className="viewtoggle">
                  <span className="is-on">List</span>
                  <Link href={`${seeAll}${seeAll.includes("?") ? "&" : "?"}view=split`}>Map</Link>
                </div>
              </div>

              {rows.length === 0 ? (
                <div className="empty">
                  <span className="script">nothing active</span>
                  <h3>No {topicLabel.toLowerCase()} are active right now</h3>
                  <p>Inventory changes daily — check back soon or browse all listings.</p>
                  <Link href="/listings">Browse all listings</Link>
                </div>
              ) : (
                <>
                  <div className="listings__grid">
                    {rows.map((c) => <ListingCard key={c.listing_key} c={c} />)}
                  </div>
                  {stats.count > rows.length && (
                    <div className="seo-cta">
                      <Link className="btn btn--primary" href={seeAll} style={{ maxWidth: 360, margin: "0 auto" }}>
                        View all {stats.count.toLocaleString()} {topicLabel.toLowerCase()} in {cityLabel}
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Rich body copy */}
      {bodyParas.length > 0 && (
        <section className="seo-body">
          <div className="wrap">
            <span className="script">about {cityLabel.toLowerCase()}</span>
            <h2 className="section__title">{topicLabel} in {cityLabel}, Louisiana</h2>
            <div className="prose">
              {bodyParas.map((block, i) => {
                if (block.startsWith("## ")) {
                  const nl = block.indexOf("\n");
                  const heading = nl === -1 ? block.slice(3) : block.slice(3, nl);
                  const rest = nl === -1 ? "" : block.slice(nl + 1).trim();
                  return (
                    <Fragment key={i}>
                      <h3 className="seo-h3">{heading}</h3>
                      {rest && <p>{rest}</p>}
                    </Fragment>
                  );
                }
                return <p key={i}>{block}</p>;
              })}
            </div>
          </div>
        </section>
      )}

      {/* Neighborhoods + ZIP showcases (city hub only) */}
      {isHub && (
        <AreaShowcase
          eyebrow="by neighborhood"
          title={`${cityLabel} neighborhoods`}
          cards={hoodCards}
          hrefFor={hoodHref}
        />
      )}
      {isHub && (
        <AreaShowcase
          eyebrow="by zip code"
          title={`Search ${cityLabel} by ZIP code`}
          cards={zoneCards}
          hrefFor={zipHref}
        />
      )}

      {/* Pre-approval CTA → Bayou Mortgage quote page */}
      <section className="preapproval">
        <div className="wrap preapproval__inner">
          <div className="preapproval__txt">
            <span className="script">first step</span>
            <h2>Know what you can afford in {cityLabel}</h2>
            <p>
              Get pre-approved with our trusted local lending partner so you can
              shop with confidence and move fast when you find the one.
            </p>
          </div>
          <a className="btn btn--aqua preapproval__btn" href={site.bayou.ctaHref} target="_blank" rel="noopener">
            Get Pre-Approved
          </a>
        </div>
      </section>

      {/* Reviews — social proof */}
      <Testimonials max={6} />

      {/* Internal-linking cluster */}
      {siblings.length > 1 && (
        <section className="cluster">
          <div className="wrap">
            <span className="script">explore</span>
            <h2 className="section__title">More ways to search {cityLabel}</h2>
            <div className="cluster__grid">
              {siblings
                .filter((s) => s.slug !== page.slug)
                .map((s) => (
                  <Link key={s.id} className="cluster__link" href={`/${s.slug}`}>
                    <span className="cluster__t">{pageTopicLabel(s)}</span>
                    <span className="cluster__c">in {s.city}</span>
                    <span className="cluster__btn">View Listings &rarr;</span>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Local map (client's Google Business Profile) — local SEO */}
      {showMap && <LocalMap cityLabel={cityLabel} href={seeAll} ctaLabel={`Browse ${cityLabel} listings`} />}

      {/* FAQ — rendered as native disclosures (content in the DOM for AEO) */}
      <section className="faq">
        <div className="wrap">
          <span className="script">good to know</span>
          <h2 className="section__title">{cityLabel} {topicLabel} — FAQ</h2>
          <div className="faq__list">
            {faqs.map((f, i) => (
              <details key={i} className="faq__item" {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
