import type { Metadata } from "next";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { site } from "@/config/site";
import { usd } from "@/lib/format";
import { fetchCards, fetchFirstPhotos, fetchPhotosMap, listingStats, PRICE_MAX, SQFT_MAX, type ListingCriteria } from "@/lib/listings";
import { getSeoPage, getCitySiblings, seoCriteria, slugifyCity, pageTopicLabel, topicNoun, isIndexablePage, type SeoPage } from "@/lib/seo";
import { resolveContent, faqsFor, jsonLdGraph } from "@/lib/seoContent";
import { getPageMarket, getCityGuides, PRICE_BAND_LABELS } from "@/lib/market";
import BlogCover from "@/components/BlogCover";
import CtaBand from "@/components/CtaBand";
import MobileActionBar from "@/components/MobileActionBar";
import ListingAlertsQuiz from "@/components/ListingAlertsQuiz";
import { pageMetadata } from "@/lib/seoMeta";
import { photo } from "@/lib/images";
import ListingCard from "@/components/ListingCard";
import JsonLd from "@/components/JsonLd";
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
  return `/homes-for-sale${p.toString() ? `?${p}` : ""}`;
}

export async function generateMetadata({
  params,
}: {
  params: { city: string; topic: string };
}): Promise<Metadata> {
  const page = await getSeoPage(`${params.city}/${params.topic}`);
  if (!page) return { title: "Page not found" };
  const c = resolveContent(page);

  // Unless someone wrote one, build the meta description from this page's
  // live numbers so each of the 130+ landing pages reads differently.
  let description = page.custom_meta_desc || page.gen_meta_desc || "";
  if (!description) {
    const m = await getPageMarket(page.slug);
    const place = page.page_type === "neighborhood" && page.neighborhood ? `${page.neighborhood}, Lake Charles` : `${page.city ?? "Southwest Louisiana"}, LA`;
    const count = m?.count ?? 0;
    const med = m?.median_price && m.priced_count >= 3 ? `, median asking price ${usd(m.median_price)}` : "";
    description = count
      ? `${count.toLocaleString()} ${topicNoun(page)} for sale in ${place}${med}. See photos, prices and new listings daily, with local agents ready to help.`
      : c.metaDesc;
  }

  // Grab one representative listing photo for the link-preview image.
  const { rows } = await fetchCards(seoCriteria(page), { limit: 1, sort: "new" });
  const photos = await fetchFirstPhotos(rows.map((r) => r.listing_key));
  const heroPhoto = rows[0] ? photos.get(rows[0].listing_key) : undefined;

  // Branded cover image (photo + logo + title overlay) for the link-preview
  // card — see /api/og. Falls back to the raw photo if there's no hero shot.
  let ogImage = heroPhoto ? photo(heroPhoto, 1200) : undefined;
  if (heroPhoto) {
    const qs = new URLSearchParams({ title: c.h1, photo: photo(heroPhoto, 1200) });
    ogImage = `${SITE}/api/og?${qs.toString()}`;
  }

  return pageMetadata({
    title: c.title,
    description,
    path: `/${page.slug}`,
    image: ogImage,
    imageAlt: c.h1,
    // Too few listings to be worth indexing yet — flips back on its own as
    // inventory grows (listing_count is refreshed hourly).
    noIndex: !isIndexablePage(page),
  });
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
  const citySlug = page.city ? slugifyCity(page.city) : "";
  const [stats, { rows }, siblings, market, guides] = await Promise.all([
    listingStats(criteria),
    fetchCards(criteria, { limit: 12, sort: "new" }),
    getCitySiblings(page.city ?? ""),
    getPageMarket(slug),
    page.city ? getCityGuides(page.city, citySlug) : Promise.resolve([]),
  ]);
  const photos = await fetchPhotosMap(rows.map((r) => r.listing_key));
  for (const r of rows) r.photos = photos.get(r.listing_key) ?? [];

  const content = resolveContent(page);
  const faqs = faqsFor(page, stats, market);
  const cityLabel = page.city || "Southwest Louisiana";
  // Neighborhood pages speak about the neighborhood ("in Graywood"); city/topic
  // pages about the city.
  const isHood = page.page_type === "neighborhood" && !!page.neighborhood;
  const place = isHood ? page.neighborhood! : cityLabel;
  const topicLabel = pageTopicLabel(page);
  const noun = topicNoun(page);
  const cityHubUrl = `${SITE}/${citySlug}/homes-for-sale`;
  const pageUrl = `${SITE}/${page.slug}`;

  const isLandPage = page.page_type === "land";
  const hasMedian = !!market?.median_price && market.priced_count >= 3;
  const typical = hasMedian ? `, with a median asking price of ${usd(market!.median_price!)}` : "";
  const maxBand = market ? Math.max(1, ...market.bands) : 1;

  const bodyParas = (page.custom_body || content.intro || "")
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seeAll = searchHref(page);

  // Neighborhood + ZIP showcases — only on the city hub page.
  const isHub = page.page_type === "city";
  const [hoodCards, zoneCards] =
    isHub && page.city
      ? await Promise.all([neighborhoodCards(page.city), zipCards(page.city)])
      : [[], []];
  const hoodHref = (slug: string) => `/homes-for-sale?city=${encodeURIComponent(cityLabel)}&neighborhood=${slug}`;
  const zipHref = (slug: string) => `/homes-for-sale?city=${encodeURIComponent(cityLabel)}&zip=${slug}`;

  const jsonLd = jsonLdGraph({
    content, stats, cards: rows, faqs, siteUrl: SITE, pageUrl, cityHubUrl, cityLabel, topicLabel,
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <ListingAlertsQuiz city={page.city} source={page.slug} />
      <MobileActionBar />

      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp;{" "}
            <Link href={`/${citySlug}/homes-for-sale`}>{cityLabel}</Link> &nbsp;/&nbsp; {topicLabel}
          </nav>
          <span className="hero__script">{isHood ? `a ${cityLabel.toLowerCase()} neighborhood` : `${topicLabel.toLowerCase()} in`}</span>
          <h1>{content.h1}</h1>
          <p className="hero__sub">
            {stats.count.toLocaleString()} {noun} for sale in {isHood ? `${place}, ${cityLabel}` : `${cityLabel}, Louisiana`}{typical}.
          </p>
          <div className="hero__meta">
            <div><div className="n"><b>{stats.count.toLocaleString()}</b></div><div className="k">Active Listings</div></div>
            {hasMedian ? <div><div className="n">{usd(market!.median_price!)}</div><div className="k">Median Price</div></div> : null}
            {!isLandPage && market?.median_ppsf ? <div><div className="n">{usd(market.median_ppsf)}</div><div className="k">Per Sq Ft</div></div> : null}
            {isLandPage && market?.median_acres ? <div><div className="n">{market.median_acres}</div><div className="k">Median Acres</div></div> : null}
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
                  <Link href="/homes-for-sale">Browse all listings</Link>
                </div>
              ) : (
                <>
                  <div className="listings__grid">
                    {rows.map((c) => <ListingCard key={c.listing_key} c={c} />)}
                  </div>
                  <CtaBand
                    text={<>New {isHood ? `homes in ${place}` : `${topicLabel.toLowerCase()} in ${cityLabel}`} go fast. Get them the day they list.</>}
                    actions={[
                      { kind: "alerts", label: "Get New Listings First", primary: true },
                      { kind: "link", label: "Take the Buyer Quiz", href: "/buyer-quiz" },
                    ]}
                  />
                  {stats.count > rows.length && (
                    <div className="seo-cta">
                      <Link className="btn btn--primary" href={seeAll} style={{ maxWidth: 360, margin: "0 auto" }}>
                        View all {stats.count.toLocaleString()} {isHood ? `homes in ${place}` : `${topicLabel.toLowerCase()} in ${cityLabel}`}
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Live market snapshot — unique, self-updating numbers for this page */}
      {market && market.priced_count >= 3 && (
        <section className="mkt">
          <div className="wrap">
            <span className="script">by the numbers</span>
            <h2 className="section__title">{isHood ? `${place} market` : `${cityLabel} ${topicLabel.toLowerCase()} market`} at a glance</h2>
            <p className="mkt__lede">
              Live from the local MLS: {market.count.toLocaleString()} {noun} for sale in {place} right now
              {hasMedian ? <>, with a median asking price of <b>{usd(market.median_price!)}</b></> : null}
              {market.new_7d > 0 ? <>. {market.new_7d.toLocaleString()} came on the market in the last week</> : null}
              {market.price_cuts > 0 ? <>, and {market.price_cuts.toLocaleString()} have had a price reduction</> : null}.
            </p>
            <div className="mkt__tiles">
              {hasMedian && <div className="mkt__tile"><b>{usd(market.median_price!)}</b><span>Median asking price</span></div>}
              {!isLandPage && market.median_ppsf ? <div className="mkt__tile"><b>{usd(market.median_ppsf)}</b><span>Median price per sq ft</span></div> : null}
              {!isLandPage && market.median_sqft ? <div className="mkt__tile"><b>{market.median_sqft.toLocaleString()}</b><span>Median square feet</span></div> : null}
              {market.median_acres ? <div className="mkt__tile"><b>{market.median_acres}</b><span>Median lot (acres)</span></div> : null}
              {market.median_dom != null ? <div className="mkt__tile"><b>{market.median_dom}</b><span>Median days on market</span></div> : null}
              <div className="mkt__tile"><b>{market.new_7d.toLocaleString()}</b><span>New this week</span></div>
            </div>
            <div className="mkt__bands" aria-label={`${place} listings by price range`}>
              {market.bands.map((n, i) => (
                <div className="mkt__band" key={PRICE_BAND_LABELS[i]}>
                  <span className="mkt__band-l">{PRICE_BAND_LABELS[i]}</span>
                  <span className="mkt__band-bar"><span style={{ width: `${(n / maxBand) * 100}%` }} /></span>
                  <span className="mkt__band-n">{n.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <p className="mkt__fine">
              {isLandPage ? "Land" : "Home"} medians use {market.priced_count.toLocaleString()} priced {isLandPage ? "land listings" : "homes"}. Updated continuously from the MLS.
            </p>
            <CtaBand
              text={<>Own a home in {place}? See what it would sell for in this market.</>}
              actions={[
                { kind: "link", label: "What's My Home Worth?", href: "/home-value", primary: true },
                { kind: "link", label: "Sell My House Fast", href: "/sell-my-house-fast" },
              ]}
            />
          </div>
        </section>
      )}

      {/* Rich body copy */}
      {bodyParas.length > 0 && (
        <section className="seo-body">
          <div className="wrap">
            <span className="script">about {place.toLowerCase()}</span>
            <h2 className="section__title">{isHood ? `Living in ${place}` : `${topicLabel} in ${cityLabel}, Louisiana`}</h2>
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

      {/* Pre-approval CTA → mortgage pre-approval quiz page */}
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

      {/* Blog guides about this city */}
      {guides.length > 0 && (
        <section className="cityguides">
          <div className="wrap">
            <span className="script">local guides</span>
            <h2 className="section__title">Guides for {cityLabel}</h2>
            <div className="bgrid">
              {guides.map((g) => (
                <Link key={g.id} className="bcard" href={`/blog/${g.slug}`}>
                  <BlogCover slug={g.slug} title={g.title} category={g.category} cover={g.cover_image} />
                  <div className="bcard__body">
                    <h3 className="bcard__title">{g.title}</h3>
                    <span className="bcard__meta">Read the guide &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
            <CtaBand
              text={<>Moving to {cityLabel}? Tell us where you'll work and what you need, and we'll narrow it down for you.</>}
              actions={[
                { kind: "link", label: "Talk to a Local Agent", href: "/contact", primary: true },
                { kind: "tel", label: `Call ${site.phone}`, href: site.phoneHref },
              ]}
            />
          </div>
        </section>
      )}

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

      {/* FAQ — rendered as native disclosures (content in the DOM for AEO) */}
      <section className="faq">
        <div className="wrap">
          <span className="script">good to know</span>
          <h2 className="section__title">{isHood ? topicLabel : `${cityLabel} ${topicLabel}`} — FAQ</h2>
          <div className="faq__list">
            {faqs.map((f, i) => (
              <details key={i} className="faq__item" {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <CtaBand
            text={<>Still have a question about {place}? Ask a local. We answer fast.</>}
            actions={[
              { kind: "sms", label: "Text Us", href: site.phoneHref.replace("tel:", "sms:"), primary: true },
              { kind: "tel", label: `Call ${site.phone}`, href: site.phoneHref },
              { kind: "link", label: "Send a Message", href: "/contact" },
            ]}
          />
        </div>
      </section>
    </>
  );
}
