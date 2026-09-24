import type { Metadata } from "next";
import AwardList from "@/components/AwardList";
import Link from "next/link";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seoMeta";
import { SITE_URL } from "@/lib/seoConfig";
import { getLiveClient } from "@/lib/supabase";
import { cityCards } from "@/lib/neighborhoods";
import { getPageMarket } from "@/lib/market";
import { seoCriteria, type SeoPage } from "@/lib/seo";
import { fetchCards, fetchFirstPhotos } from "@/lib/listings";
import { photo } from "@/lib/images";
import { REVIEWS } from "@/lib/reviews";
import { breadcrumbSchema, agentSchema } from "@/lib/schema";
import JsonLd from "@/components/JsonLd";
import ListingAlertsQuiz, { OpenListingAlertsButton } from "@/components/ListingAlertsQuiz";
import MobileActionBar from "@/components/MobileActionBar";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Buyer's Agent in Lake Charles, LA",
  description:
    "Work with a buyer's agent who knows Southwest Louisiana. Search homes for sale in Lake Charles, Sulphur, Moss Bluff, Westlake and across SWLA.",
  path: "/buyers-agent",
});

// The 10 markets on this page, in the order the spec lists them.
const CITIES: { name: string; slug: string }[] = [
  { name: "Lake Charles", slug: "lake-charles" },
  { name: "Sulphur", slug: "sulphur" },
  { name: "Moss Bluff", slug: "moss-bluff" },
  { name: "Carlyss", slug: "carlyss" },
  { name: "Westlake", slug: "westlake" },
  { name: "Iowa", slug: "iowa" },
  { name: "Vinton", slug: "vinton" },
  { name: "DeQuincy", slug: "dequincy" },
  { name: "Ragley", slug: "ragley" },
  { name: "Jennings", slug: "jennings" },
];

const SERVICES = [
  { h: "Finding Homes Early", p: "Search alerts built off your exact criteria, plus coming soon and off market homes we hear about through other agents before they are listed." },
  { h: "Pricing The House Honestly", p: "Before you offer, you get recent comparable sales for that neighborhood so you know whether the asking price is fair or hopeful." },
  { h: "Writing The Offer", p: "Price is one term out of many. Closing date, inspection period, what conveys, and who pays what all move the real cost of the deal." },
  { h: "Reading The Neighborhood", p: "Drainage, school zones, traffic patterns, and what is planned nearby. Things that do not show up in listing photos but show up when you resell." },
  { h: "Inspection And Repairs", p: "We line up the inspector, read the report with you, and negotiate repairs or credits instead of letting a long punch list kill the deal." },
  { h: "Getting You To Closing", p: "Appraisal, title, lender deadlines, and the walkthrough. Somebody has to chase every one of those, and it should not be you." },
];

const STEPS = [
  { h: "Talk It Through", p: "What you want, what you can spend, and when you need to be in." },
  { h: "Get Pre Approved", p: "A lender letter in hand so your offer gets taken seriously." },
  { h: "Tour Homes", p: "Curated showings on your schedule, with honest feedback on each one." },
  { h: "Write And Negotiate", p: "Offer terms built around the comps and what the seller actually needs." },
  { h: "Inspect And Close", p: "We chase the deadlines, you show up and sign." },
];

async function getCityCards() {
  const [cards, hubs] = await Promise.all([
    cityCards(),
    getLiveClient().from("seo_pages").select("*").eq("page_type", "city").eq("active", true),
  ]);
  const hubRows = (hubs.data as SeoPage[]) ?? [];
  const bySlug = new Map(hubRows.map((h) => [h.slug, h]));
  const photos = new Map(cards.map((c) => [c.slug, c.photoUrl]));

  // cityCards() matches on the MLS city column, which misses towns the feed
  // files under another name (Moss Bluff, Carlyss). Fall back to the city
  // page's own filters for a cover photo.
  const missing = CITIES.filter((c) => !photos.get(`${c.slug}/homes-for-sale`) && bySlug.get(`${c.slug}/homes-for-sale`));
  await Promise.all(
    missing.map(async (c) => {
      const slug = `${c.slug}/homes-for-sale`;
      const { rows } = await fetchCards(seoCriteria(bySlug.get(slug)!), { limit: 1, sort: "new" });
      const first = await fetchFirstPhotos(rows.map((r) => r.listing_key));
      if (rows[0]) photos.set(slug, first.get(rows[0].listing_key) ?? null);
    }),
  );

  return CITIES.map((c) => {
    const slug = `${c.slug}/homes-for-sale`;
    return { ...c, href: `/${slug}`, count: bySlug.get(slug)?.listing_count ?? 0, photoUrl: photos.get(slug) ?? null };
  });
}

export default async function BuyersAgentPage() {
  const [cities, lc, sulphur] = await Promise.all([
    getCityCards(),
    getPageMarket("lake-charles/homes-for-sale"),
    getPageMarket("sulphur/homes-for-sale"),
  ]);
  const sms = site.phoneHref.replace("tel:", "sms:");
  const reviews = REVIEWS.slice(0, 3);

  const domAnswer =
    lc?.median_dom != null
      ? `It depends on the town and the price. Right now the typical home for sale in Lake Charles has been on the market about ${lc.median_dom} days${sulphur?.median_dom != null ? `, and about ${sulphur.median_dom} days in Sulphur` : ""}. Well priced homes in popular neighborhoods often go much faster, which is why getting new listings the day they come out matters.`
      : "It depends on the town, the neighborhood and the price. Well priced homes in popular neighborhoods often go quickly, which is why getting new listings the day they come out matters.";

  const faqs: { q: string; a: React.ReactNode; text: string }[] = [
    {
      q: "Do I Pay My Buyer's Agent?",
      text: "How buyer agent compensation is handled changed across the industry in 2024. It is now spelled out in a written buyer agreement before you tour homes, and in some deals the seller still contributes toward it. We walk you through exactly how it works before you sign anything.",
      a: <>How buyer agent compensation is handled changed across the industry in 2024. It is now spelled out in a written buyer agreement before you tour homes, and in some deals the seller still contributes toward it. We walk you through exactly how it works before you sign anything.</>,
    },
    {
      q: "Should I Get Pre Approved Before I Start Looking?",
      text: "Yes. A pre approval tells you the real price range, and in a multiple offer situation a seller will almost always take the offer backed by a lender letter over the one that is not. It also keeps you from falling for a house you cannot finance.",
      a: <>Yes. A pre approval tells you the real price range, and in a multiple offer situation a seller will almost always take the offer backed by a lender letter over the one that is not. It also keeps you from falling for a house you cannot finance. <Link href="/get-pre-approved">Check your eligibility here</Link>.</>,
    },
    {
      q: "Can I Just Use The Listing Agent Instead?",
      text: "You can, but that agent already has a signed agreement to get the seller the best outcome. Having your own agent means somebody in the transaction is looking at the deal from your side of the table.",
      a: <>You can, but that agent already has a signed agreement to get the seller the best outcome. Having your own agent means somebody in the transaction is looking at the deal from your side of the table.</>,
    },
    { q: "How Fast Do Homes Sell In Southwest Louisiana?", text: domAnswer, a: <>{domAnswer}</> },
    {
      q: "What If I Want To Build Instead Of Buy Existing?",
      text: "New construction is a different process, and builders have their own contracts written by their attorneys. You can still bring your own agent, and it costs you nothing extra in most cases, but you usually have to register your agent on the first visit to the model home.",
      a: <>New construction is a different process, and builders have their own contracts written by their attorneys. You can still bring your own agent, and it costs you nothing extra in most cases, but you usually have to register your agent on the first visit to the model home. <Link href="/lake-charles/new-construction-homes">See new construction in Lake Charles</Link>.</>,
    },
    {
      q: "Do You Help Buyers Looking For Acreage Or Land?",
      text: "Yes. Land and acreage are a big part of the market here, from home lots to larger tracts toward Ragley, Moss Bluff and Iowa. We help you check access, utilities, restrictions and survey before you buy.",
      a: <>Yes. Land and acreage are a big part of the market here, from home lots to larger tracts toward Ragley, Moss Bluff and Iowa. We help you check access, utilities, restrictions and survey before you buy. Browse <Link href="/lake-charles/homes-with-acreage">homes with acreage</Link> or <Link href="/lake-charles/land-for-sale">land for sale</Link>.</>,
    },
  ];

  const jsonLd = [
    { "@context": "https://schema.org", ...agentSchema(), areaServed: CITIES.map((c) => ({ "@type": "City", name: `${c.name}, LA` })) },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Buyer's Agent Representation",
      serviceType: "Real estate buyer representation",
      url: `${SITE_URL}/buyers-agent`,
      provider: agentSchema(),
      areaServed: { "@type": "AdministrativeArea", name: "Southwest Louisiana" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.text } })),
    },
    breadcrumbSchema([["Home", "/"], ["Buy", "/buy"], ["Buyer's Agent", "/buyers-agent"]]),
  ];

  return (
    <div className="ba">
      <JsonLd data={jsonLd} />
      <ListingAlertsQuiz city="Lake Charles" source="buyers-agent" />
      <MobileActionBar />

      {/* 3. Hero */}
      <header className="ba-hero">
        <div className="wrap ba-hero__grid">
          <div className="ba-hero__copy">
            <nav className="ba-crumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link> / <Link href="/buy">Buy</Link> / Buyer&apos;s Agent
            </nav>
            <span className="ba-eyebrow">Buyer&apos;s Agent</span>
            <h1 className="ba-hero__h1">See The Right Homes First, And Know What They Are Really Worth</h1>
            <p className="ba-hero__sub">
              Buying in Southwest Louisiana means knowing which streets hold value, which builders finish clean, and what a house should actually sell for before you write an offer. That is the job.
            </p>
            <ul className="ba-checks">
              <li>New listings sent to you the day they hit the market</li>
              <li>A real number on what the home is worth before you offer</li>
              <li>Showings scheduled around your work week, not ours</li>
            </ul>
            <div className="ba-ctas">
              <a className="ba-btn ba-btn--solid" href="#cities">Browse Homes By City</a>
              <a className="ba-btn ba-btn--light" href={sms}>Call Or Text Us</a>
            </div>
          </div>
          <div id="start" className="ba-hero__form ba-card">
            <div className="ba-card__top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ba-card__photo" src={site.blogAuthor.photoUrl} alt={site.blogAuthor.name} />
              <div>
                <div className="ba-card__name">{site.blogAuthor.name}</div>
                <div className="ba-card__role">SWLAR Realtor of the Year 2025</div>
                <div className="ba-card__rating"><span aria-hidden>★★★★★</span> {site.nap.rating} on Google · {site.nap.reviewCount} reviews</div>
              </div>
            </div>
            <p className="ba-card__lead">Talk to a buyer&apos;s agent today. No forms to fill out, no pressure.</p>
            <OpenListingAlertsButton className="ba-btn ba-btn--solid ba-card__btn">Get New Listings First</OpenListingAlertsButton>
            <a className="ba-btn ba-btn--outline ba-card__btn" href={site.phoneHref}>Call {site.phone}</a>
            <a className="ba-btn ba-btn--outline ba-card__btn" href={sms}>Text Us</a>
            <Link className="ba-card__link" href={`/agents/lauren-huffman`}>Meet Lauren &rarr;</Link>
          </div>
        </div>
      </header>

      {/* 4. Trust strip */}
      <section className="ba-trust" aria-label="Why work with us">
        <div className="wrap ba-trust__grid">
          {[
            ["Southwest Louisiana Only", "Local market, not a national call center", "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"],
            ["Licensed In Louisiana", "Representing buyers, not the seller", "M12 1 3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5l-9-4zm-1.5 15.5-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z"],
            ["Full MLS Access", "Every active listing, updated daily", "M10 3a7 7 0 1 0 4.2 12.6l5.1 5.1 1.4-1.4-5.1-5.1A7 7 0 0 0 10 3zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z"],
            ["Call Or Text Direct", "You reach your agent, not a queue", "M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"],
          ].map(([h, p, d]) => (
            <div className="ba-trust__item" key={h}>
              <svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d={d} /></svg>
              <div><b>{h}</b><span>{p}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Services */}
      <section className="ba-sec" id="services">
        <div className="wrap">
          <h2 className="ba-h2">What Your Buyer&apos;s Agent Handles For You</h2>
          <p className="ba-intro">Most buyers think an agent unlocks doors. The work that actually saves you money happens before and after the showing.</p>
          <div className="ba-cards">
            {SERVICES.map((s, i) => (
              <article className="ba-card" key={s.h}>
                <span className="ba-card__n" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </article>
            ))}
          </div>
          <div className="ba-ctas ba-ctas--center">
            <a className="ba-btn ba-btn--solid" href="#start">Start Your Home Search</a>
            <Link className="ba-btn ba-btn--outline" href="/contact">Ask A Question First</Link>
          </div>
        </div>
      </section>

      {/* 6. City search */}
      <section className="ba-sec ba-sec--tint" id="cities">
        <div className="wrap">
          <h2 className="ba-h2">Search Homes For Sale By City</h2>
          <p className="ba-intro">Every active listing in Southwest Louisiana, sorted by the town you actually want to live in. Pick a market to see what is available right now.</p>
          <div className="ba-cities">
            {cities.map((c) => (
              <Link className="ba-city" key={c.slug} href={c.href}>
                <div className="ba-city__media">
                  {c.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo(c.photoUrl, 600)} alt={`Homes for sale in ${c.name}, LA`} loading="lazy" />
                  ) : (
                    <div className="ba-city__ph" />
                  )}
                  <span className="ba-city__name">{c.name}</span>
                </div>
                <div className="ba-city__meta">
                  <span>{c.count.toLocaleString()} active {c.count === 1 ? "listing" : "listings"}</span>
                  <span className="ba-city__link">View homes</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="ba-ctas ba-ctas--center">
            <OpenListingAlertsButton className="ba-btn ba-btn--solid">Get New Listings Emailed To You</OpenListingAlertsButton>
          </div>
          <p className="ba-note">Or tell us what you want and we will send only the homes that fit.</p>
        </div>
      </section>

      {/* 7. Team */}
      <section className="ba-sec" id="team">
        <div className="wrap ba-team">
          <div className="ba-team__photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.teamPhotoUrl} alt={`${site.name} team`} loading="lazy" />
          </div>
          <div>
            <h2 className="ba-h2">Meet The Land &amp; Home Group</h2>
            <p className="ba-p">
              Lauren Huffman leads The Land &amp; Home Group out of Southwest Louisiana. She was named the Southwest Louisiana Association of REALTORS® 2025 Realtor of the Year and earned EXIT Realty&apos;s Platinum Award for 100+ transactions. She works the same markets she lives in, which means when you ask what a street is like, what the schools are like, or whether a price makes sense, you get an answer from someone who has actually been down that road.
            </p>
            <p className="ba-p">
              The team handles buyers across Calcasieu, Cameron, Beauregard and Jefferson Davis parishes, from first homes in Sulphur to acreage out toward Ragley.
            </p>
            <div className="ba-stats">
              <div className="ba-stat"><b>{site.nap.rating}</b><span>Google Rating</span></div>
              <div className="ba-stat"><b>{site.nap.reviewCount}</b><span>Google Reviews</span></div>
              <div className="ba-stat"><b>100+</b><span>Transactions (EXIT Platinum)</span></div>
            </div>
            <AwardList />
            <div className="ba-ctas">
              <a className="ba-btn ba-btn--solid" href="#start">Work With Our Team</a>
              <a className="ba-btn ba-btn--outline" href={site.phoneHref}>Call Lauren Direct</a>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Process */}
      <section className="ba-process">
        <div className="wrap">
          <h2 className="ba-h2">How Buying A Home With Us Works</h2>
          <p className="ba-intro">Five steps from first conversation to keys in your hand. You always know what is next.</p>
          <ol className="ba-steps">
            {STEPS.map((s, i) => (
              <li className="ba-step" key={s.h}>
                <span className="ba-step__n">{i + 1}</span>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </li>
            ))}
          </ol>
          <div className="ba-ctas ba-ctas--center">
            <a className="ba-btn ba-btn--solid" href="#start">Start At Step One</a>
            <a className="ba-btn ba-btn--light" href="#faq">Read Common Questions</a>
          </div>
        </div>
      </section>

      {/* 9. Reviews */}
      <section className="ba-sec ba-sec--tint">
        <div className="wrap">
          <h2 className="ba-h2">What Buyers Say About Working With Us</h2>
          <p className="ba-intro">
            <span className="ba-stars" aria-hidden>★★★★★</span> {site.nap.rating} on Google from {site.nap.reviewCount} reviews.
          </p>
          <div className="ba-reviews">
            {reviews.map((r) => (
              <figure className="ba-review" key={r.name}>
                <span className="ba-stars" aria-label="5 out of 5 stars">★★★★★</span>
                <blockquote>{r.text}</blockquote>
                <figcaption>{r.name.split(" ")[0]}{r.when ? <span> · {r.when}</span> : null}</figcaption>
              </figure>
            ))}
          </div>
          <div className="ba-ctas ba-ctas--center">
            <a className="ba-btn ba-btn--solid" href="#start">Start Your Home Search</a>
            <a className="ba-btn ba-btn--outline" href={site.nap.mapsUrl} target="_blank" rel="noopener">Read All Google Reviews</a>
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section className="ba-sec" id="faq">
        <div className="wrap ba-faq">
          <h2 className="ba-h2">Buyer Questions We Get Every Week</h2>
          <div className="ba-faq__list">
            {faqs.map((f, i) => (
              <details className="ba-faq__item" key={f.q} {...(i === 0 ? { open: true } : {})}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <div className="ba-ctas ba-ctas--center">
            <Link className="ba-btn ba-btn--solid" href="/contact">Ask Us Your Question</Link>
            <a className="ba-btn ba-btn--outline" href={site.phoneHref}>Call {site.phone}</a>
          </div>
        </div>
      </section>

      {/* 11. City chips (the NAP + Google map band follows from the site layout) */}
      <section className="ba-sec ba-sec--tint ba-chipsec">
        <div className="wrap">
          <h2 className="ba-h2">Where We Help Buyers</h2>
          <div className="ba-chips">
            {cities.map((c) => <Link key={c.slug} className="ba-chip" href={c.href}>{c.name}</Link>)}
          </div>
          <div className="ba-ctas ba-ctas--center">
            <Link className="ba-btn ba-btn--solid" href="/contact">Set Up A Time To Talk</Link>
          </div>
        </div>
      </section>

      {/* 12. CTA banner */}
      <section className="ba-banner">
        <div className="wrap">
          <h2 className="ba-h2">Ready To See What Is Out There?</h2>
          <p>Send us what you are looking for and we will have matching homes in your inbox today, including listings that have not hit the search sites yet.</p>
          <div className="ba-ctas ba-ctas--center">
            <a className="ba-btn ba-btn--solid" href="#start">Start Your Home Search</a>
            <a className="ba-btn ba-btn--light" href={sms}>Call Or Text {site.phone}</a>
          </div>
        </div>
      </section>
    </div>
  );
}
