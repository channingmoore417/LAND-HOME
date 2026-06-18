import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { usd } from "@/lib/format";
import { listingStats } from "@/lib/listings";
import { cityCards } from "@/lib/neighborhoods";
import AreaShowcase from "@/components/AreaShowcase";
import LocalMap from "@/components/LocalMap";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://landhomegroup.com").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Buy a Home in Southwest Louisiana",
  description:
    "Buy a home in Southwest Louisiana with The Land & Home Group. Browse homes by city — Lake Charles, Sulphur, Westlake and more — with live MLS listings, local guidance, and easy pre-approval.",
  alternates: { canonical: `${SITE}/buy` },
};

const FAQS = [
  {
    q: "How much do I need for a down payment in Southwest Louisiana?",
    a: "It varies by loan program. Many buyers here use low- and no-down-payment options — FHA (3.5%), conventional (as little as 3%), and USDA or VA loans (often 0% down) that fit much of rural SWLA. The best first step is a quick pre-approval so you know your exact numbers.",
  },
  {
    q: "Should I get pre-approved before I start looking?",
    a: "Yes. A pre-approval tells you what you can afford, shows sellers you're serious, and lets you move fast when you find the right home. Our trusted local lending partner offers a fast, no-pressure quote.",
  },
  {
    q: "How long does it take to buy a home here?",
    a: "Once you're pre-approved, finding a home can take anywhere from a day to a few months depending on your criteria. From an accepted offer to closing is typically about 30–45 days.",
  },
  {
    q: "What areas does The Land & Home Group cover?",
    a: "We serve all of Southwest Louisiana — Lake Charles, Sulphur, Westlake, Moss Bluff, Iowa, Ragley, Jennings, DeRidder, Vinton, Cameron, and Welsh — across Calcasieu and the surrounding parishes.",
  },
  {
    q: "How do I start?",
    a: `Browse homes by city below, save the ones you like, and reach out for a tour — or call ${site.phone}. There's no pressure and no obligation.`,
  },
];

export default async function BuyPage() {
  const [stats, cities] = await Promise.all([listingStats({}), cityCards()]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Buy", item: `${SITE}/buy` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name: site.name,
      description: `${site.name}, brokered by ${site.brokerage}, helping buyers across Southwest Louisiana.`,
      url: SITE,
      telephone: site.phone,
      areaServed: { "@type": "AdministrativeArea", name: "Southwest Louisiana" },
      address: { "@type": "PostalAddress", addressLocality: site.localSeo.city, addressRegion: site.localSeo.region, addressCountry: "US" },
      geo: { "@type": "GeoCoordinates", latitude: site.localSeo.latitude, longitude: site.localSeo.longitude },
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; Buy
          </nav>
          <span className="hero__script">buy a home in</span>
          <h1>Southwest Louisiana</h1>
          <p className="hero__sub">
            Find your next home across Lake Charles, Sulphur, Westlake and every community in between —
            with live MLS listings, real local guidance, and no-pressure help from start to close.
          </p>
          <div className="hero__meta">
            <div><div className="n"><b>{stats.count.toLocaleString()}</b></div><div className="k">Homes for Sale</div></div>
            <div><div className="n">{cities.length}</div><div className="k">Communities</div></div>
            {stats.priceMin ? <div><div className="n">{usd(stats.priceMin)}</div><div className="k">Starting Price</div></div> : null}
          </div>
          <div className="hero__cta">
            <Link className="btn btn--aqua" href="/listings">Browse all listings</Link>
            <a className="btn btn--hollow" href={site.phoneHref}>Call Us Now</a>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      {/* City photo cards */}
      <AreaShowcase
        eyebrow="by community"
        title="Browse homes by city"
        cards={cities}
        hrefFor={(slug) => `/${slug}`}
      />

      {/* Informational content */}
      <section className="seo-body">
        <div className="wrap">
          <span className="script">why here</span>
          <h2 className="section__title">Why buy in Southwest Louisiana?</h2>
          <div className="prose">
            <p>
              Southwest Louisiana offers something increasingly rare: genuine affordability. Home prices
              sit well below the national average, so first-time buyers, growing families, and investors
              alike can find real value — from in-town starter homes to acreage and waterfront.
            </p>
            <h3 className="seo-h3">A community for every buyer</h3>
            <p>
              Lake Charles anchors the region with the deepest inventory and most neighborhoods, while
              Sulphur and Westlake offer family-friendly suburbs, and towns like Iowa, Ragley, and
              DeRidder deliver country living and acreage. Use the city cards above to explore each one.
            </p>
            <h3 className="seo-h3">How buying works</h3>
            <p>
              The path is simple: get pre-approved so you know your budget, browse and save homes, tour
              your favorites, then make an offer with us in your corner. From accepted offer to closing
              is typically about 30–45 days. We handle the details and keep it pressure-free.
            </p>
          </div>
        </div>
      </section>

      {/* Pre-approval CTA */}
      <section className="preapproval">
        <div className="wrap preapproval__inner">
          <div className="preapproval__txt">
            <span className="script">first step</span>
            <h2>Know what you can afford</h2>
            <p>
              Get pre-approved with our trusted local lending partner and shop with
              confidence. It's fast, free, and there's no obligation.
            </p>
          </div>
          <a className="btn btn--aqua preapproval__btn" href={site.bayou.ctaHref} target="_blank" rel="noopener">
            Get Pre-Approved
          </a>
        </div>
      </section>

      {/* About + map */}
      <LocalMap href="/listings" ctaLabel="Browse all listings" />

      {/* Buyer FAQ */}
      <section className="faq">
        <div className="wrap">
          <span className="script">good to know</span>
          <h2 className="section__title">Buying in Southwest Louisiana — FAQ</h2>
          <div className="faq__list">
            {FAQS.map((f, i) => (
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
