import Link from "next/link";
import type { Metadata } from "next";
import ListingCard from "@/components/ListingCard";
import AreaShowcase from "@/components/AreaShowcase";
import LocalMap from "@/components/LocalMap";
import JsonLd from "@/components/JsonLd";
import { fetchCards, fetchFirstPhotos, listingStats } from "@/lib/listings";
import { cityCards } from "@/lib/neighborhoods";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

const SITE = "https://landhomegroup.com";

export const metadata: Metadata = {
  title: "The Land & Home Group | Southwest Louisiana Real Estate",
  description:
    "Buy or sell with a local Southwest Louisiana team. Browse homes for sale in Lake Charles, Sulphur and across SWLA, get a free home value report, and find your place with The Land & Home Group.",
};

export default async function Home() {
  const [stats, { rows: team }, cities] = await Promise.all([
    listingStats({}),
    fetchCards({ lhgOnly: true }, { limit: 6, sort: "new" }),
    cityCards(),
  ]);
  const photos = await fetchFirstPhotos(team.map((r) => r.listing_key));
  for (const r of team) r.photo_url = photos.get(r.listing_key) ?? null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name: site.name,
      url: SITE,
      telephone: site.phoneHref.replace("tel:", ""),
      areaServed: cities.map((c) => ({ "@type": "City", name: c.name })),
      parentOrganization: { "@type": "Organization", name: site.brokerage },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      url: SITE,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE}/listings?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* HERO — the customer is the hero; we're the guide with a clear path */}
      <header className="hero hero--index">
        <div className="wrap">
          <span className="hero__script">welcome home to southwest louisiana</span>
          <h1>Find the place you&apos;ll love coming home to.</h1>
          <p className="hero__sub">
            Buying or selling in Southwest Louisiana shouldn&apos;t feel overwhelming. The Land &amp;
            Home Group is your local team — we know these neighborhoods, we know this market, and
            we&apos;ll guide you the whole way, with no pressure.
          </p>
          <div className="hero__cta">
            <Link className="btn btn--aqua" href="/listings">Browse Homes for Sale</Link>
            <Link className="btn btn--hollow" href="/home-value">What&apos;s My Home Worth?</Link>
          </div>
          <div className="hero__meta">
            <div>
              <div className="n"><b>{stats.count.toLocaleString()}</b></div>
              <div className="k">Active Listings</div>
            </div>
            <div>
              <div className="n">13</div>
              <div className="k">SWLA Communities</div>
            </div>
            <div>
              <div className="n">Local</div>
              <div className="k">Every Step</div>
            </div>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      {/* THE PLAN — simple steps remove the overwhelm */}
      <section className="hv-how">
        <div className="wrap">
          <span className="section__script script">a simple path</span>
          <h2 className="section__title">Your move, made simple</h2>
          <div className="hv-steps">
            <div className="hv-step">
              <div className="hv-step__n">1</div>
              <h3>Tell us your goal</h3>
              <p>Whether you&apos;re buying your first home, moving up, or selling — start with a quick search or a free home value report.</p>
            </div>
            <div className="hv-step">
              <div className="hv-step__n">2</div>
              <h3>We guide the way</h3>
              <p>Lean on a local team that knows every SWLA neighborhood, price trend, and pitfall — so you make confident decisions.</p>
            </div>
            <div className="hv-step">
              <div className="hv-step__n">3</div>
              <h3>Land where you belong</h3>
              <p>Close with clarity and move forward — into the right home, or onto your next chapter, without the stress.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED — the team's own listings */}
      {team.length > 0 && (
        <section className="results" style={{ paddingTop: 8 }}>
          <div className="wrap">
            <div className="results__head">
              <div>
                <span className="script" style={{ fontSize: "1.6rem" }}>our listings</span>
                <h2 className="section__title" style={{ margin: "2px 0 0" }}>Homes listed by our team</h2>
              </div>
              <Link className="seo-seeall" href="/our-listings">See all our listings &rarr;</Link>
            </div>
            <div className="listings__grid">
              {team.map((c) => <ListingCard key={c.listing_key} c={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* BROWSE BY CITY — homes for sale in each community */}
      <AreaShowcase
        eyebrow="by community"
        title="Homes for sale across Southwest Louisiana"
        cards={cities}
        hrefFor={(slug) => `/${slug}`}
      />

      {/* SELL — the CMA tool */}
      <section className="seo-body">
        <div className="wrap home-sell">
          <div className="home-sell__copy">
            <span className="script">thinking of selling?</span>
            <h2 className="section__title">Know what your home is really worth</h2>
            <p className="prose">
              Guessing at your home&apos;s value — or trusting a national estimate that&apos;s never set
              foot in Louisiana — costs you money. Our free report builds a custom value range from the
              most comparable homes that have actually sold near you in the last six months.
            </p>
            <p className="prose">
              It takes about a minute, there&apos;s no obligation, and you&apos;ll get a downloadable report
              plus a real human ready to help when you&apos;re ready to sell.
            </p>
            <Link className="btn btn--primary" href="/home-value" style={{ maxWidth: 280 }}>
              Get My Free Home Value
            </Link>
          </div>
          <div className="home-sell__card">
            <span className="home-sell__big">What&apos;s my home worth?</span>
            <ul>
              <li>✓ Built on recent SWLA sales</li>
              <li>✓ A custom value range in seconds</li>
              <li>✓ Free, downloadable report</li>
              <li>✓ No pressure, ever</li>
            </ul>
          </div>
        </div>
      </section>

      {/* GET PRE-APPROVED — generic (no lender named) */}
      <section className="preapproval">
        <div className="wrap preapproval__inner">
          <div className="preapproval__txt">
            <span className="script">before you fall in love</span>
            <h2>Get pre-approved &amp; shop with confidence</h2>
            <p>
              Knowing your budget up front makes every home search easier — and your offer stronger when
              you find the one. Get pre-approved with our trusted local lending partner in minutes.
            </p>
          </div>
          <a className="btn btn--aqua preapproval__btn" href={site.bayou.ctaHref} target="_blank" rel="noopener">
            Get Pre-Approved
          </a>
        </div>
      </section>

      {/* ABOUT / GUIDE — authority + empathy, with the find-us map */}
      <section className="seo-body" style={{ paddingBottom: 8 }}>
        <div className="wrap">
          <span className="script">your local guide</span>
          <h2 className="section__title">A Southwest Louisiana team you can trust</h2>
          <div className="prose" style={{ maxWidth: "68ch" }}>
            <p>
              The Land &amp; Home Group, brokered by {site.brokerage}, was built on one idea: that buying
              or selling a home should feel personal, not transactional. We live here, we work here, and we
              treat every client like a neighbor — because most of you are.
            </p>
            <p>
              From Lake Charles and Sulphur to Moss Bluff, Westlake, and beyond, we pair real local
              knowledge with modern, live MLS data so you always have the full picture. No pressure, no
              jargon — just honest guidance toward the right move for you.
            </p>
          </div>
          <Link className="seo-seeall" href="/about">Meet the team &rarr;</Link>
        </div>
      </section>

      <LocalMap cityLabel="Southwest Louisiana" href="/listings" ctaLabel="Start your home search" />
    </>
  );
}
