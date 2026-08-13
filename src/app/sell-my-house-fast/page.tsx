import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import CashOfferForm from "@/components/CashOfferForm";
import JsonLd from "@/components/JsonLd";
import { SITE_URL as SITE } from "@/lib/seoConfig";

export const metadata: Metadata = {
  title: "Sell My House Fast in Lake Charles, LA | Cash Offer As-Is",
  description:
    `Sell your house fast in Lake Charles & Southwest Louisiana — as-is, any condition. Fast, fair cash offer, no repairs, no fees. Call ${site.phone}.`,
  alternates: { canonical: `${SITE}/sell-my-house-fast` },
};

// FAQ copy lives in ONE place so the visible accordion and the FAQPage
// structured data can never drift apart.
const FAQS = [
  {
    q: "How fast can I sell my house in Lake Charles?",
    a: "With a cash offer, most sales close in 7 to 21 days. There's no financing, no appraisal contingency, and no waiting on a buyer's lender. Tell us your timeline — if you need to stay a few extra weeks after closing, that can usually be arranged too.",
  },
  {
    q: "Do I pay any fees or commissions on a cash sale?",
    a: "No. A direct cash sale has no agent commission, no closing-cost surprises, and no repair credits. The offer you accept is what you walk away with, minus anything you still owe on the home. If you choose to list instead, standard commission applies — we'll show you both numbers so you can compare.",
  },
  {
    q: "What kinds of houses do you buy?",
    a: "Any condition, truly. Storm-damaged homes, houses that flooded, inherited properties still full of furniture, fire damage, foundation problems, bad roofs, old rental houses with tenants in place. If it's in Southwest Louisiana, we want to see it.",
  },
  {
    q: "Is a cash offer lower than what my house is worth?",
    a: "Usually, yes — a cash buyer pays for speed and takes on the repairs, so offers typically come in below full retail value. That's exactly why we show you two numbers: the cash offer and what your home would likely bring listed as-is on the open market. You pick the trade-off that fits your situation.",
  },
  {
    q: "Do I need to clean out the house before selling?",
    a: "No. Take what you want and leave the rest — furniture, appliances, boxes in the attic, all of it. This matters a lot with inherited homes, where clearing out decades of belongings is often the hardest part. We handle it after closing.",
  },
  {
    q: "Can I sell an inherited house before the succession is complete?",
    a: "In Louisiana, the succession (what other states call probate) generally needs to be opened before the home can transfer to a buyer. We work alongside your succession attorney, line up the sale in parallel, and close as soon as the court paperwork allows — so the process costs you as little time as possible.",
  },
];

const SITUATIONS = [
  { t: "Storm or flood damage", d: "Still dealing with damage from Hurricane Laura, Delta, or the 2021 flooding? Sell without making a single repair." },
  { t: "Inherited property", d: "A succession home you don't want to maintain from out of town. We'll even work around the court timeline." },
  { t: "Behind on payments", d: "Facing foreclosure or just underwater on repairs? A fast sale can protect your equity and your credit." },
  { t: "Divorce or life change", d: "When you need a clean, quick, drama-free sale so everyone can move forward." },
  { t: "Tired landlord", d: "Done with tenants, turnovers, and 2 a.m. calls — sell with tenants in place." },
  { t: "Relocating for work", d: "New job, new city, no time for showings. Close on your schedule, not the market's." },
];

export default function SellFastPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Sell My House Fast", item: `${SITE}/sell-my-house-fast` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Sell Your House Fast — As-Is Cash Home Sales",
      serviceType: "Cash home buying and as-is home sales",
      description:
        "Fast, as-is home sales across Lake Charles and Southwest Louisiana. Fast, fair cash offers with no repairs, no cleaning, and no fees — plus a free comparison of what the home would bring on the open market.",
      url: `${SITE}/sell-my-house-fast`,
      areaServed: { "@type": "AdministrativeArea", name: "Southwest Louisiana" },
      provider: {
        "@type": "RealEstateAgent",
        name: site.name,
        telephone: site.phone,
        url: SITE,
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
    <>
      <JsonLd data={jsonLd} />

      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; Sell My House Fast
          </nav>
          <span className="hero__script">no repairs. no cleaning. no waiting.</span>
          <h1>Sell My House Fast in Lake Charles, Louisiana</h1>
          <p className="hero__sub">
            Get a fast, fair cash offer on your house — as-is, any condition. Storm damage,
            inherited homes, houses that need everything: we buy them the way they sit. No repairs,
            no cleaning, no commissions, and you pick the closing date.
          </p>
          <div className="hero__cta">
            <a className="btn btn--aqua" href="#cash-offer">Get My Cash Offer</a>
            <a className="btn btn--hollow" href={site.phoneHref}>Call {site.phone}</a>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap">
          <div className="contact-grid" id="cash-offer">
            {/* Left: the direct answer + trust copy */}
            <div className="contact-info">
              <span className="script" style={{ fontSize: "1.7rem" }}>sell as-is</span>
              <h2 className="section__title" style={{ marginTop: 2 }}>
                Can I sell my house as-is in Lake Charles?
              </h2>
              <p className="prose">
                Yes. You can sell your house as-is in Lake Charles and anywhere in Southwest
                Louisiana — no repairs, no inspections to pass, no cleaning out the garage. The
                Land &amp; Home Group, a Lake Charles real estate team brokered by EXIT Realty
                Southern, gets you a fast, fair cash offer and can close in as little as
                7 days.
              </p>
              <p className="prose">
                Here&apos;s what makes us different from the &ldquo;we buy houses&rdquo; signs on
                the corner: <strong>we always show you two numbers</strong> — a cash offer for a
                fast, as-is sale, and what your home would likely bring listed on the open market.
                Most cash buyers hope you never learn that second number. We lead with it, because
                the right answer depends on your situation, not ours.
              </p>
              <ul className="hv-why__list" style={{ marginTop: 18 }}>
                <li><b>Fast offers</b><span>One quick walk-through (or photos), then a written, no-obligation offer.</span></li>
                <li><b>Truly as-is</b><span>Storm damage, flooded, fire, foundation, full of furniture — we&apos;ve seen it all.</span></li>
                <li><b>Zero fees on a cash sale</b><span>No commission, no repair credits, no junk fees at closing.</span></li>
                <li><b>You pick the closing date</b><span>7 days or 70 — and if you need time to move after closing, just ask.</span></li>
              </ul>
            </div>

            {/* Right: the form */}
            <div className="contact-card">
              <span className="script" style={{ fontSize: "1.5rem" }}>start here</span>
              <h2 className="section__title" style={{ marginTop: 2, marginBottom: 18 }}>
                Get your free cash offer
              </h2>
              <CashOfferForm />
            </div>
          </div>

          {/* How it works */}
          <section className="hv-how">
            <span className="section__script script">how it works</span>
            <h2 className="section__title">How to sell your house fast — 3 steps</h2>
            <div className="hv-steps">
              <div className="hv-step">
                <div className="hv-step__n">1</div>
                <h3>Tell us about the house</h3>
                <p>Fill out the short form above or call {site.phone}. Address, condition, and your timeline — that&apos;s all we need to get started.</p>
              </div>
              <div className="hv-step">
                <div className="hv-step__n">2</div>
                <h3>Get two numbers, fast</h3>
                <p>A written cash offer for an as-is sale, plus an honest estimate of what your home would bring listed on the market. Compare them side by side.</p>
              </div>
              <div className="hv-step">
                <div className="hv-step__n">3</div>
                <h3>Close on your date</h3>
                <p>Accept the offer and pick your closing day — as fast as 7 days. No repairs, no cleaning, no showings. Walk away with cash and a clean break.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Cash offer vs. listing comparison */}
      <section className="seo-body">
        <div className="wrap">
          <span className="script">know your options</span>
          <h2 className="section__title">Cash offer vs. listing your home: which is right?</h2>
          <p className="prose">
            A cash sale trades some price for speed and certainty. Listing — even as-is — usually
            nets more but takes longer and involves showings. Neither is &ldquo;better&rdquo;; it
            depends on the house and your life. This is the honest comparison we walk every seller
            through:
          </p>
          <div className="cashcmp">
            <table>
              <thead>
                <tr>
                  <th scope="col"></th>
                  <th scope="col">Direct Cash Sale</th>
                  <th scope="col">Listing As-Is</th>
                  <th scope="col">Traditional Listing</th>
                </tr>
              </thead>
              <tbody>
                <tr><th scope="row">Time to close</th><td>7–21 days</td><td>30–60 days</td><td>45–90+ days</td></tr>
                <tr><th scope="row">Repairs needed</th><td>None</td><td>None</td><td>Often significant</td></tr>
                <tr><th scope="row">Showings &amp; cleaning</th><td>None</td><td>Yes</td><td>Yes</td></tr>
                <tr><th scope="row">Commission &amp; fees</th><td>$0</td><td>Standard commission</td><td>Standard commission</td></tr>
                <tr><th scope="row">Financing can fall through</th><td>No</td><td>Possible</td><td>Possible</td></tr>
                <tr><th scope="row">Typical net price</th><td>Below market</td><td>Near as-is market value</td><td>Highest</td></tr>
              </tbody>
            </table>
          </div>
          <p className="prose" style={{ marginTop: 18 }}>
            Want the listing-side number first? Start with our free{" "}
            <Link href="/home-value"><strong>Lake Charles home value estimate</strong></Link> — it&apos;s
            built from actual Southwest Louisiana sales in the last six months, and it takes about a
            minute.
          </p>
        </div>
      </section>

      {/* Situations */}
      <main className="results">
        <div className="wrap">
          <section className="hv-how" style={{ marginTop: 0 }}>
            <span className="section__script script">we can help</span>
            <h2 className="section__title">Situations where a fast, as-is sale makes sense</h2>
            <p className="prose" style={{ marginBottom: 24 }}>
              Southwest Louisiana homes carry stories most markets never deal with. Hurricane Laura
              came ashore in August 2020 as a Category 4 storm with 150&nbsp;mph winds — one of the
              strongest hurricanes ever to hit Louisiana — and Hurricane Delta followed just six
              weeks later. Years on, plenty of local homeowners still own houses with storm damage
              that never got fully repaired. Those homes have value, and they can be sold exactly as
              they sit.
            </p>
            <div className="hv-steps cash-situations">
              {SITUATIONS.map((s) => (
                <div className="hv-step" key={s.t}>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Areas served */}
          <section className="hv-how">
            <span className="section__script script">where we buy</span>
            <h2 className="section__title">We buy houses across Southwest Louisiana</h2>
            <p className="prose">
              Based in Lake Charles, we make cash offers on houses in{" "}
              <Link href="/lake-charles/homes-for-sale">Lake Charles</Link>,{" "}
              <Link href="/sulphur/homes-for-sale">Sulphur</Link>,{" "}
              <Link href="/moss-bluff/homes-for-sale">Moss Bluff</Link>,{" "}
              <Link href="/westlake/homes-for-sale">Westlake</Link>, Carlyss,{" "}
              <Link href="/iowa/homes-for-sale">Iowa</Link>,{" "}
              <Link href="/vinton/homes-for-sale">Vinton</Link>, DeQuincy,{" "}
              <Link href="/ragley/homes-for-sale">Ragley</Link>,{" "}
              <Link href="/deridder/homes-for-sale">DeRidder</Link>,{" "}
              <Link href="/jennings/homes-for-sale">Jennings</Link>,{" "}
              <Link href="/welsh/homes-for-sale">Welsh</Link> and{" "}
              <Link href="/cameron/homes-for-sale">Cameron</Link>. In town, out in the parish, or
              down on the water — if it&apos;s in Southwest Louisiana, bring it to us.
            </p>
          </section>
        </div>
      </main>

      {/* FAQ */}
      <section className="faq">
        <div className="wrap">
          <span className="script">questions, answered</span>
          <h2 className="section__title">Selling your house fast — FAQ</h2>
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

      {/* Closing CTA */}
      <section className="preapproval">
        <div className="wrap preapproval__inner">
          <div className="preapproval__txt">
            <span className="script">no pressure, ever</span>
            <h2>Get both numbers. Then decide.</h2>
            <p>
              A written cash offer and an honest market estimate, free and fast. If listing
              nets you more and you have the time, we&apos;ll tell you so — and help you do that
              instead.
            </p>
          </div>
          <a className="btn btn--aqua preapproval__btn" href="#cash-offer">Get My Cash Offer</a>
        </div>
      </section>
    </>
  );
}
