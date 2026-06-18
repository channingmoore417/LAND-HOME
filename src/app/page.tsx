import Link from "next/link";
import type { Metadata } from "next";
import ListingCard from "@/components/ListingCard";
import AreaShowcase from "@/components/AreaShowcase";
import LocalMap from "@/components/LocalMap";
import JsonLd from "@/components/JsonLd";
import Testimonials from "@/components/Testimonials";
import BlogCover from "@/components/BlogCover";
import { fetchCards, fetchFirstPhotos } from "@/lib/listings";
import { cityCards } from "@/lib/neighborhoods";
import { getPosts } from "@/lib/blog";
import { REVIEWS } from "@/lib/reviews";
import { site } from "@/config/site";
import { SITE_URL as SITE } from "@/lib/seoConfig";

export const dynamic = "force-dynamic";

const GBP_URL = "https://share.google/P0z9MIBZPEnlqMUMh";

export const metadata: Metadata = {
  title: { absolute: "Lake Charles Realtor | Homes for Sale & Real Estate" },
  description:
    "Looking for a Lake Charles realtor? The Land & Home Group helps you buy and sell across Lake Charles and Southwest Louisiana — browse homes for sale, get a free home value report, and work with a trusted local real estate team.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Lake Charles Realtor | Homes for Sale & Real Estate",
    description:
      "Browse Lake Charles homes for sale and work with a trusted local real estate team. Live MLS listings, free home valuations, and no-pressure guidance.",
    url: SITE,
  },
};

const FAQS = [
  {
    q: "How do I find a good realtor in Lake Charles?",
    a: "Look for a local team that knows the neighborhoods, communicates quickly, and has strong reviews. The Land & Home Group is a Lake Charles real estate team with a 5-star Google rating, helping buyers and sellers across Calcasieu Parish and Southwest Louisiana.",
  },
  {
    q: "Is now a good time to buy a home in Lake Charles?",
    a: "Lake Charles remains one of the more affordable markets in the country, and new listings hit the market every day. The best move is to get pre-approved and start browsing — our live MLS search shows every active home and current pricing.",
  },
  {
    q: "What are the best neighborhoods in Lake Charles?",
    a: "Popular choices include South Lake Charles for newer subdivisions and shopping, the Charpentier Historic District and downtown for character and walkability, and suburbs like Sulphur, Moss Bluff, Westlake and Carlyss for newer homes and more space. See our neighborhood guides on the blog.",
  },
  {
    q: "How much are homes for sale in Lake Charles?",
    a: "Prices vary by neighborhood, size and condition, and Lake Charles offers strong value compared with the national average. Browse current listings to see live pricing, or get a free custom value range for a specific home.",
  },
  {
    q: "How do I find out what my Lake Charles home is worth?",
    a: "Use our free home value tool — it builds a custom range from the most comparable homes that have recently sold near you, then a local agent can refine it with an in-person visit.",
  },
  {
    q: "What areas does The Land & Home Group serve?",
    a: "We serve Lake Charles and all of Southwest Louisiana, including Sulphur, Moss Bluff, Westlake, Carlyss, Iowa, Vinton, Ragley, Jennings, DeRidder and Welsh.",
  },
];

export default async function Home() {
  const [{ rows: team }, cities, posts] = await Promise.all([
    fetchCards({ lhgOnly: true }, { limit: 6, sort: "new" }),
    cityCards(),
    getPosts({ limit: 3 }),
  ]);
  const photos = await fetchFirstPhotos(team.map((r) => r.listing_key));
  for (const r of team) r.photo_url = photos.get(r.listing_key) ?? null;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name: site.name,
      description:
        "Lake Charles realtor and Southwest Louisiana real estate team helping buyers and sellers across Calcasieu Parish — homes for sale, free home valuations, and local guidance.",
      url: SITE,
      image: site.teamPhotoUrl,
      logo: site.logoUrl,
      telephone: site.phoneHref.replace("tel:", ""),
      priceRange: "$$",
      areaServed: [
        { "@type": "City", name: "Lake Charles" },
        ...cities.filter((c) => c.name !== "Lake Charles").map((c) => ({ "@type": "City", name: c.name })),
      ],
      address: {
        "@type": "PostalAddress",
        addressLocality: site.localSeo.city,
        addressRegion: site.localSeo.region,
        addressCountry: "US",
      },
      geo: { "@type": "GeoCoordinates", latitude: site.localSeo.latitude, longitude: site.localSeo.longitude },
      sameAs: [GBP_URL],
      parentOrganization: { "@type": "Organization", name: site.brokerage },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5.0",
        reviewCount: String(REVIEWS.length),
        bestRating: "5",
      },
      review: REVIEWS.map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.name },
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
        reviewBody: r.text,
      })),
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
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div className="home">
      <JsonLd data={jsonLd} />

      {/* HERO — the customer is the hero; we're the guide with a clear path */}
      <header className="hero hero--index hero--home">
        <div className="wrap">
          <div className="herohome">
            <div className="herohome__copy">
              <h1 className="hero__kicker">Lake Charles Realtor</h1>
              <h2 className="hero__headline">Find the place you&apos;ll love coming home to.</h2>
              <p className="hero__sub">
                The Land &amp; Home Group helps you buy and sell across Lake Charles and Southwest
                Louisiana — local expertise, modern tools, and no-pressure guidance every step of the way.
              </p>
              <form className="hsearch" action="/listings" method="get">
                <input type="hidden" name="view" value="split" />
                <input className="hsearch__input" type="text" name="q" placeholder="Search by city, address, or ZIP…" aria-label="Search properties" />
                <button className="hsearch__btn" type="submit">Search</button>
              </form>
              <div className="hero__cta">
                <Link className="btn btn--hollow" href="/home-value">What&apos;s My Home Worth?</Link>
              </div>
              <a className="gbadge" href={GBP_URL} target="_blank" rel="noopener" aria-label="Rated 5 stars on Google — read our reviews">
                <span className="gbadge__g">G</span>
                <span className="gbadge__stars">★★★★★</span>
                <span className="gbadge__txt">5.0 on Google · read our reviews</span>
              </a>
            </div>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      {/* SEO INTRO — keyword-rich, indexable content */}
      <section className="seo-body" style={{ paddingBottom: 0 }}>
        <div className="wrap" style={{ maxWidth: 880, textAlign: "center" }}>
          <h2 className="section__title">Lake Charles Real Estate, Made Simple</h2>
          <p className="prose">
            Looking for homes for sale in Lake Charles, Louisiana? The Land &amp; Home Group is your local
            real estate team, helping buyers and sellers across Lake Charles, Sulphur, Moss Bluff, Westlake
            and all of Southwest Louisiana. Search every active listing with live MLS data, find out what
            your home is worth, and work with a Lake Charles realtor who actually lives and works here.
          </p>
          <p className="prose">
            Whether you&apos;re buying your first home, moving up, relocating for work, or selling for top
            dollar, you get honest, no-pressure guidance and deep local market knowledge — from
            neighborhoods and schools to financing and timing.
          </p>
        </div>
      </section>

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
          <div className="home-cta">
            <Link className="btn btn--primary" href="/listings">Start Browsing Homes</Link>
            <Link className="btn btn--ghost" href="/home-value">Get My Home Value</Link>
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
                <h2 className="section__title" style={{ margin: "2px 0 0" }}>Featured Lake Charles Listings</h2>
              </div>
              <Link className="seo-seeall" href="/our-listings">See all our listings &rarr;</Link>
            </div>
            <div className="listings__grid">
              {team.map((c) => <ListingCard key={c.listing_key} c={c} />)}
            </div>
            <div className="home-cta">
              <Link className="btn btn--primary" href="/our-listings">View All Our Listings</Link>
            </div>
          </div>
        </section>
      )}

      {/* SOCIAL PROOF — client reviews */}
      <Testimonials reviewsUrl={GBP_URL} />

      {/* BROWSE BY CITY — homes for sale in each community */}
      <AreaShowcase
        eyebrow="by community"
        title="Lake Charles &amp; Southwest Louisiana Homes for Sale"
        cards={cities}
        hrefFor={(slug) => `/${slug}`}
      />
      <div className="wrap home-cta home-cta--tight">
        <Link className="btn btn--primary" href="/listings">Search All Homes for Sale</Link>
        <Link className="btn btn--ghost" href="/buy">Explore Buying in SWLA</Link>
      </div>

      {/* BUY / SELL TOOLS — dual boxes */}
      <section className="seo-body">
        <div className="wrap">
          <div style={{ textAlign: "center" }}>
            <span className="script">buying or selling?</span>
            <h2 className="section__title">Start with the right tool</h2>
          </div>
          <div className="home-tools">
            <div className="home-tool">
              <span className="home-tool__eyebrow">for sellers</span>
              <h3>What&apos;s my home worth?</h3>
              <p>
                Get a custom value range built from the most comparable homes that have actually sold
                near you in the last six months — not a national guess.
              </p>
              <ul>
                <li>✓ Built on recent local sales</li>
                <li>✓ A custom value range in seconds</li>
                <li>✓ Free, downloadable report</li>
                <li>✓ No pressure, ever</li>
              </ul>
              <Link className="btn btn--aqua" href="/home-value">Get My Free Home Value</Link>
            </div>
            <div className="home-tool">
              <span className="home-tool__eyebrow">for buyers</span>
              <h3>Your home buying guide</h3>
              <p>
                New to the area or buying your first home? See how buying works in Southwest Louisiana,
                explore every community, and find the right fit with a local team in your corner.
              </p>
              <ul>
                <li>✓ Browse homes by city &amp; price</li>
                <li>✓ How the buying process works here</li>
                <li>✓ Get pre-approved with confidence</li>
                <li>✓ A local guide every step</li>
              </ul>
              <Link className="btn btn--aqua" href="/home-buying-guide">Get the Free Buyer&apos;s Guide</Link>
            </div>
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

      {/* FROM THE BLOG — local guides */}
      {posts.length > 0 && (
        <section className="results" style={{ paddingTop: 8 }}>
          <div className="wrap">
            <div className="results__head">
              <div>
                <span className="script" style={{ fontSize: "1.6rem" }}>local know-how</span>
                <h2 className="section__title" style={{ margin: "2px 0 0" }}>Lake Charles Real Estate Guides</h2>
              </div>
              <Link className="seo-seeall" href="/blog">Read the blog &rarr;</Link>
            </div>
            <div className="bgrid">
              {posts.map((p) => (
                <Link key={p.id} className="bcard" href={`/blog/${p.slug}`}>
                  <BlogCover slug={p.slug} title={p.title} category={p.category} cover={p.cover_image} />
                  <div className="bcard__body">
                    <h3 className="bcard__title">{p.title}</h3>
                    {p.excerpt && <p className="bcard__ex">{p.excerpt}</p>}
                    <span className="bcard__meta">{p.read_minutes ? `${p.read_minutes} min read` : "Read more"} &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ABOUT / GUIDE — authority + empathy, team photo beside the copy */}
      <section className="seo-body" style={{ paddingBottom: 8 }}>
        <div className="wrap home-about">
          <div className="home-about__copy">
            <span className="script">your local guide</span>
            <h2 className="section__title">Your Lake Charles Real Estate Team</h2>
            <div className="prose">
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
            <div className="home-cta" style={{ justifyContent: "flex-start" }}>
              <Link className="btn btn--primary" href="/about">Meet the Team</Link>
              <Link className="btn btn--ghost" href="/contact">Get in Touch</Link>
            </div>
          </div>
          <div className="home-about__photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.teamPhotoUrl} alt={`${site.name} — Lake Charles real estate team`} />
          </div>
        </div>
      </section>

      {/* FAQ — local questions + FAQPage schema */}
      <section className="faq">
        <div className="wrap">
          <span className="script">good to know</span>
          <h2 className="section__title">Lake Charles Real Estate FAQ</h2>
          <div className="faq__list">
            {FAQS.map((f, i) => (
              <details key={f.q} className="faq__item" {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <LocalMap cityLabel="Southwest Louisiana" mapOnly />
      <div className="wrap home-cta home-cta--tight" style={{ paddingBottom: 8 }}>
        <Link className="btn btn--primary" href="/listings">Start Your Home Search</Link>
        <a className="btn btn--ghost" href={site.phoneHref}>Call {site.phone}</a>
      </div>
    </div>
  );
}
