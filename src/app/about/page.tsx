import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { cityCards } from "@/lib/neighborhoods";
import { getTeam } from "@/lib/team";
import LocalMap from "@/components/LocalMap";
import TeamGrid from "@/components/TeamGrid";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

import { SITE_URL as SITE } from "@/lib/seoConfig";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Meet the agents behind The Land & Home Group, brokered by EXIT Realty Southern — a local, no-pressure real estate team helping families buy and sell across Lake Charles, Sulphur and all of Southwest Louisiana.",
  alternates: { canonical: `${SITE}/about` },
};

const REVIEWS = [
  { name: "Avery Greninger", text: "Lauren is the best, a true advocate for her clients. She helped ease the stresses of my first home-buying experience. You can always count on her, trusting she prioritizes her clients!" },
  { name: "Erica Duhon", text: "Lauren was truly the best realtor I could've asked for! She was so patient and determined to help me find the perfect house for me and my daughter! She'll be the first person I recommend to anyone looking for a realtor!" },
  { name: "Shelbie Winn", text: "My house sat on the market with no movement for months and once I switched to Lauren she got it sold in 2 months!! Very professional and good at her job. Gained a lifetime realtor and friend!" },
  { name: "Gary Sanders", text: "Mrs Lauren is an excellent agent! She answers quick and helped me sell my house that I thought I wasn't going to sell! She has helped me on two different houses. I really appreciate all of her help!" },
  { name: "Mandy Kelly", text: "Lauren's exceptional service was invaluable in our first-time home buying experience. With patience and professionalism, she guided us through every stage, ensuring we felt confident and informed." },
  { name: "Ernest Hillebrandt", text: "As a real estate investor I've had Lauren sell several homes for me over the past 4 years. I deal with multiple realtors across Louisiana — Lauren is at the top of her game, a go-getter who works nonstop to get the best results." },
  { name: "Darbi Wood", text: "Lauren was the absolute best! Helped us every step of the way and made our lives so easy. She is truly compassionate and very knowledgeable. Having her on your side is having a top-tier realtor in your corner!" },
  { name: "Brandon Lee", text: "Lauren was excellent! Never pushy and always available. Knew exactly what my wife and I needed. If you need a realtor, Lauren is your gal." },
  { name: "Vikki Banks", text: "Lauren is the best! She listened to what we were looking for and stayed within our budget. She even worked after hours and weekends with us due to our work schedules. Highly recommend her and her staff." },
  { name: "Cara Giles", text: "Lauren helped us find our forever home after being gone from our hometown of Sulphur for 13 years. She knew exactly what we were looking for and never gave up until we found it." },
  { name: "Sarah Rainwater", text: "I can't say enough good things about Lauren and our home-buying experience. She goes above and beyond and has a work ethic like no other — a positive, happy person who made the whole process a joy." },
  { name: "Mike Glynn", text: "Lauren is the best realtor — she has sold 8 of our homes for us. She worked extra all the time to make it happen, even with COVID slowing things down. She never gave up." },
];

const CLOSINGS = [
  "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/6a331f58bc828629fa81bf19.webp",
  "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/6a331f556dd61c546a1271f7.webp",
  "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/6a331f526dd61c546a1271d1.webp",
  "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/6a331f4fad2dd4493c2d6eda.webp",
  "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/6a331f4c1c5d711b354ca43e.webp",
];

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
    title: "Always reachable",
    body: "Real estate moves quickly here. Every client gets a real person — we answer calls and texts, line up tours fast, and keep you ahead of the market.",
  },
  {
    icon: "🔑",
    title: "Start to close",
    body: "From your first question to the keys in your hand, our team handles the details — and connects you with trusted local lending so financing never slows you down.",
  },
];

export default async function AboutPage() {
  const [team, cities] = await Promise.all([getTeam(), cityCards()]);

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
      employee: team.map((a) => ({
        "@type": "RealEstateAgent",
        name: a.full_name,
        ...(a.title ? { jobTitle: a.title } : {}),
        ...(a.phone ? { telephone: a.phone } : {}),
        ...(a.email ? { email: a.email } : {}),
        ...(a.photo_url ? { image: a.photo_url } : {}),
      })),
    },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <header className="hero hero--index hero--about">
        <div className="wrap">
          <div className="hero__split">
            <div className="hero__copy">
              <nav className="hero__crumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link> &nbsp;/&nbsp; About
              </nav>
              <span className="hero__script">meet the team</span>
              <h1>The people behind The Land &amp; Home Group</h1>
              <p className="hero__sub">
                We&apos;re a local team brokered by {site.brokerage}, helping families buy and sell
                across {site.serviceArea} and all of Southwest Louisiana — with honest guidance and a
                genuinely no-pressure approach.
              </p>
              <div className="hero__meta">
                {team.length > 0 && (
                  <div><div className="n"><b>{team.length}</b></div><div className="k">Agents on Your Side</div></div>
                )}
                <div><div className="n">{cities.length}</div><div className="k">Communities Served</div></div>
                <div><div className="n">{site.brokerage}</div><div className="k">Proudly Brokered By</div></div>
              </div>
              <div className="hero__cta">
                <Link className="btn btn--aqua" href="/contact">Get in Touch</Link>
                <Link className="btn btn--hollow" href="/listings">Browse Listings</Link>
              </div>
            </div>
            <div className="hero__photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={site.teamPhotoUrl} alt={`The ${site.name} team — ${site.serviceArea} REALTORS®`} />
            </div>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      {/* Our story — about the team, not the tech */}
      <section className="seo-body">
        <div className="wrap">
          <span className="script">who we are</span>
          <h2 className="section__title">Local people, helping local people move</h2>
          <div className="prose">
            <p>
              {site.name} was built on a simple idea: buying or selling a home in Southwest Louisiana
              should feel personal, not transactional. We&apos;re neighbors first — we know these
              communities, these parishes, and the families who call them home, because we&apos;re part
              of them.
            </p>
            <p>
              Brokered by {site.brokerage}, our agents bring real local expertise and a hands-on,
              relationship-driven approach to every client. Whether you&apos;re a first-time buyer, a
              growing family, or ready to sell, you get a partner who listens, communicates, and has
              your back from the first showing to the closing table.
            </p>
            <h3 className="seo-h3">From the lake to the country</h3>
            <p>
              We help buyers and sellers across all 13 SWLA communities — from in-town Lake Charles
              and family-friendly Sulphur and Westlake, to acreage and waterfront in Moss Bluff,
              Iowa, Ragley, Jennings, DeRidder, Vinton, Cameron and Welsh. Wherever you&apos;re
              headed in the region, one of our agents knows it well.
            </p>
          </div>
        </div>
      </section>

      {/* The team */}
      {team.length > 0 && (
        <section className="team">
          <div className="wrap">
            <span className="script">our agents</span>
            <h2 className="section__title" style={{ marginTop: 0 }}>Meet the team</h2>
            <TeamGrid team={team} />
          </div>
        </section>
      )}

      {/* Client reviews — social proof */}
      <section className="reviews">
        <div className="wrap">
          <span className="script">in their words</span>
          <h2 className="section__title" style={{ marginTop: 0 }}>What our clients say</h2>
          <p className="prose" style={{ maxWidth: "60ch" }}>
            We&apos;re grateful for every family we get to work with. Here&apos;s what a few of them
            had to say.
          </p>
          <div className="reviews__grid">
            {REVIEWS.map((r) => (
              <figure className="review" key={r.name}>
                <div className="review__stars" aria-label="5 out of 5 stars">★★★★★</div>
                <blockquote className="review__text">{r.text}</blockquote>
                <figcaption className="review__by">
                  {r.name}
                  <span className="review__src">Google review</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Recent closings — social proof */}
      <section className="closings">
        <div className="wrap">
          <span className="script">the best part</span>
          <h2 className="section__title" style={{ marginTop: 0 }}>Recent closings &amp; happy homeowners</h2>
          <p className="prose" style={{ maxWidth: "60ch" }}>
            Nothing beats handing over the keys. Here are some of the families we&apos;ve recently
            helped find home across Southwest Louisiana.
          </p>
          <div className="closings__grid">
            {CLOSINGS.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`The Land & Home Group closing day ${i + 1}`} loading="lazy" />
            ))}
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

      {/* Google map (team photo now lives in the hero) */}
      <LocalMap href="/contact" ctaLabel="Contact the team" showPhoto={false} />

      {/* Pre-approval CTA — the referral flywheel */}
      <section className="preapproval">
        <div className="wrap preapproval__inner">
          <div className="preapproval__txt">
            <span className="script">first step</span>
            <h2>Know what you can afford</h2>
            <p>
              Get pre-approved and shop with confidence. It&apos;s fast, free, and there&apos;s no
              obligation — you&apos;ll know your true budget before you ever tour a home.
            </p>
          </div>
          <a className="btn btn--aqua preapproval__btn" href={site.bayou.ctaHref} target="_blank" rel="noopener">
            Get Pre-Approved
          </a>
        </div>
      </section>
    </>
  );
}
