import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { listingStats } from "@/lib/listings";
import { cityCards } from "@/lib/neighborhoods";
import LocalMap from "@/components/LocalMap";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://landhomegroup.com").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Meet The Land & Home Group, brokered by EXIT Realty Southern — a local, no-pressure real estate team serving Lake Charles, Sulphur and all of Southwest Louisiana with live MLS listings and honest guidance.",
  alternates: { canonical: `${SITE}/about` },
};

const VALUES = [
  {
    icon: "🤝",
    title: "No pressure, ever",
    body: "We work on your timeline, not ours. Honest answers, straight talk, and zero pushy sales tactics — whether you're buying next month or just exploring.",
  },
  {
    icon: "📍",
    title: "Truly local",
    body: "We live and work in Southwest Louisiana. From Lake Charles neighborhoods to country acreage in Ragley, we know these communities because they're home.",
  },
  {
    icon: "⚡",
    title: "Fast & responsive",
    body: "Real estate moves quickly here. We answer calls and texts, line up tours fast, and keep you ahead of new listings the moment they hit the market.",
  },
  {
    icon: "🔑",
    title: "Start to close",
    body: "From your first question to the keys in your hand, we handle the details — and connect you with trusted local lending so financing never slows you down.",
  },
];

export default async function AboutPage() {
  const [stats, cities] = await Promise.all([listingStats({}), cityCards()]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "About", item: `${SITE}/about` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name: site.name,
      description: `${site.name}, brokered by ${site.brokerage}, helping buyers and sellers across Southwest Louisiana.`,
      url: SITE,
      telephone: site.phone,
      areaServed: { "@type": "AdministrativeArea", name: "Southwest Louisiana" },
      address: {
        "@type": "PostalAddress",
        addressLocality: site.localSeo.city,
        addressRegion: site.localSeo.region,
        addressCountry: "US",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: site.localSeo.latitude,
        longitude: site.localSeo.longitude,
      },
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; About
          </nav>
          <span className="hero__script">who we are</span>
          <h1>Real estate, done the Louisiana way</h1>
          <p className="hero__sub">
            {site.name} is a local team brokered by {site.brokerage}, serving {site.serviceArea} and
            all of Southwest Louisiana — with live MLS listings, honest guidance, and a genuinely
            no-pressure approach.
          </p>
          <div className="hero__meta">
            <div><div className="n"><b>{stats.count.toLocaleString()}</b></div><div className="k">Live Listings</div></div>
            <div><div className="n">{cities.length}</div><div className="k">Communities Served</div></div>
            <div><div className="n">SWLA</div><div className="k">Born &amp; Based Here</div></div>
          </div>
          <div className="hero__cta">
            <Link className="btn btn--aqua" href="/listings">Browse Listings</Link>
            <Link className="btn btn--hollow" href="/contact">Get in Touch</Link>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      {/* Our story */}
      <section className="seo-body">
        <div className="wrap">
          <span className="script">our story</span>
          <h2 className="section__title">Local people, helping local people move</h2>
          <div className="prose">
            <p>
              {site.name} was built on a simple idea: buying or selling a home in Southwest Louisiana
              should feel personal, not transactional. We&apos;re a local team — we know these
              neighborhoods, these parishes, and the families who call them home.
            </p>
            <p>
              Brokered by {site.brokerage}, we pair real local expertise with modern tools. Our site
              pulls live MLS data so you&apos;re always seeing real, current listings — and when
              you&apos;re ready, we&apos;re a call or text away to tour homes, talk strategy, or just
              answer a question with no strings attached.
            </p>
            <h3 className="seo-h3">From the lake to the country</h3>
            <p>
              We help buyers and sellers across all 13 SWLA communities — from in-town Lake Charles
              and family-friendly Sulphur and Westlake, to acreage and waterfront in Moss Bluff,
              Iowa, Ragley, Jennings, DeRidder, Vinton, Cameron and Welsh. Wherever you&apos;re
              headed in the region, we&apos;ve got you covered.
            </p>
            <h3 className="seo-h3">Financing made simple</h3>
            <p>
              When it&apos;s time to make a move, we connect you with {site.bayou.name}, our preferred
              local Louisiana lender, for a fast, no-pressure pre-approval — so you shop with
              confidence and never miss the right home over financing.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="cluster" style={{ background: "var(--sand)" }}>
        <div className="wrap">
          <span className="script">how we work</span>
          <h2 className="section__title" style={{ marginTop: 0 }}>What you can expect</h2>
          <div className="values__grid">
            {VALUES.map((v) => (
              <div key={v.title} className="value">
                <span className="value__ic" aria-hidden>{v.icon}</span>
                <h3 className="value__t">{v.title}</h3>
                <p className="value__b">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team photo + Google map */}
      <LocalMap href="/contact" ctaLabel="Contact the team" />

      {/* Pre-approval CTA — the referral flywheel */}
      <section className="preapproval">
        <div className="wrap preapproval__inner">
          <div className="preapproval__txt">
            <span className="script">first step</span>
            <h2>{site.bayou.headline}</h2>
            <p>{site.bayou.sub}</p>
          </div>
          <a className="btn btn--aqua preapproval__btn" href={site.bayou.ctaHref} target="_blank" rel="noopener">
            {site.bayou.ctaLabel}
          </a>
        </div>
      </section>
    </>
  );
}
