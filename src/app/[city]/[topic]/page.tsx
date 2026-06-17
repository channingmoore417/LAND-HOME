import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { site } from "@/config/site";
import { usd } from "@/lib/format";
import { fetchCards, fetchFirstPhotos, listingStats, type ListingCriteria } from "@/lib/listings";
import { getSeoPage, getCitySiblings, seoCriteria, slugifyCity, pageTopicLabel, topicNoun, type SeoPage } from "@/lib/seo";
import { resolveContent, faqsFor, jsonLdGraph } from "@/lib/seoContent";
import ListingCard from "@/components/ListingCard";
import JsonLd from "@/components/JsonLd";

export const revalidate = 3600; // ISR — landing pages are stable; refresh hourly
export const dynamicParams = true;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://landhomegroup.com").replace(/\/$/, "");

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
            <Link className="btn btn--aqua" href={seeAll}>Browse {cityLabel} {noun}</Link>
            <a className="btn btn--hollow" href={site.bayou.ctaHref} target="_blank" rel="noopener">
              Get Pre-Approved
            </a>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap">
          <div className="results__head">
            <div className="meta">
              Showing <b>{Math.min(rows.length, stats.count)}</b> of <b>{stats.count.toLocaleString()}</b> {topicLabel.toLowerCase()}
            </div>
            <Link className="seo-seeall" href={seeAll}>Search &amp; filter all &rarr;</Link>
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
      </main>

      {/* Rich body copy */}
      {bodyParas.length > 0 && (
        <section className="seo-body">
          <div className="wrap">
            <span className="script">about {cityLabel.toLowerCase()}</span>
            <h2 className="section__title">{topicLabel} in {cityLabel}, Louisiana</h2>
            <div className="prose">
              {bodyParas.map((p, i) =>
                p.startsWith("## ") ? (
                  <h3 key={i} className="seo-h3">{p.slice(3)}</h3>
                ) : (
                  <p key={i}>{p}</p>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/* Pre-approval CTA → Bayou Mortgage quote page */}
      <section className="preapproval">
        <div className="wrap preapproval__inner">
          <div className="preapproval__txt">
            <span className="script">first step</span>
            <h2>Know what you can afford in {cityLabel}</h2>
            <p>
              Get pre-approved with Bayou Mortgage — our preferred local Louisiana lender — so you can
              shop with confidence and move fast when you find the one.
            </p>
          </div>
          <a className="btn btn--aqua preapproval__btn" href={site.bayou.ctaHref} target="_blank" rel="noopener">
            Get Pre-Approved
          </a>
        </div>
      </section>

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
      {showMap && (
        <section className="localmap">
          <div className="wrap">
            <div className="localmap__grid">
              <div>
                <span className="script">find us</span>
                <h2 className="section__title">Your local {cityLabel} real estate team</h2>
                <p className="prose">
                  {site.name}, brokered by {site.brokerage}, serves {cityLabel} and all of Southwest
                  Louisiana. Reach us at <a href={site.phoneHref}><strong>{site.phone}</strong></a> — no
                  pressure, just local expertise.
                </p>
                <Link className="btn btn--aqua" href={seeAll} style={{ maxWidth: 320 }}>
                  Browse {cityLabel} listings
                </Link>
              </div>
              <iframe
                title={`${cityLabel} map — ${site.localSeo.gbpName}`}
                src={site.localSeo.mapEmbedUrl}
                className="localmap__frame"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

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
