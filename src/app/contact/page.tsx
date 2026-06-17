import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import ContactForm from "@/components/ContactForm";
import JsonLd from "@/components/JsonLd";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://landhomegroup.com").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with The Land & Home Group, brokered by EXIT Realty Southern. Call (337) 245-0909 or send a message — local, no-pressure real estate help across Lake Charles, Sulphur and Southwest Louisiana.",
  alternates: { canonical: `${SITE}/contact` },
};

export default function ContactPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Contact", item: `${SITE}/contact` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      name: site.name,
      description: `${site.name}, brokered by ${site.brokerage} — local real estate help across Southwest Louisiana.`,
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
            <Link href="/">Home</Link> &nbsp;/&nbsp; Contact
          </nav>
          <span className="hero__script">let&apos;s talk</span>
          <h1>Contact The Land &amp; Home Group</h1>
          <p className="hero__sub">
            Buying, selling, or just exploring? We&apos;re local, we&apos;re responsive, and
            there&apos;s never any pressure. Reach out and we&apos;ll get right back to you.
          </p>
          <div className="hero__cta">
            <a className="btn btn--aqua" href={site.phoneHref}>Call {site.phone}</a>
            <a className="btn btn--hollow" href="sms:+13372450909">Text Us</a>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap">
          <div className="contact-grid">
            {/* Left: ways to reach us */}
            <div className="contact-info">
              <span className="script" style={{ fontSize: "1.7rem" }}>get in touch</span>
              <h2 className="section__title" style={{ marginTop: 2 }}>Ways to reach us</h2>

              <a className="contact-row" href={site.phoneHref}>
                <span className="contact-row__ic" aria-hidden>📞</span>
                <span>
                  <b>Call or Text</b>
                  <em>{site.phone}</em>
                </span>
              </a>
              <a className="contact-row" href="https://instagram.com/thelandhomegroup" target="_blank" rel="noopener">
                <span className="contact-row__ic" aria-hidden>📸</span>
                <span>
                  <b>Instagram</b>
                  <em>@thelandhomegroup</em>
                </span>
              </a>
              <div className="contact-row contact-row--static">
                <span className="contact-row__ic" aria-hidden>📍</span>
                <span>
                  <b>Service Area</b>
                  <em>{site.serviceArea} &amp; all of SWLA</em>
                </span>
              </div>
              <div className="contact-row contact-row--static">
                <span className="contact-row__ic" aria-hidden>🏢</span>
                <span>
                  <b>Brokered By</b>
                  <em>{site.brokerage}</em>
                </span>
              </div>

              <p className="prose" style={{ marginTop: 22 }}>
                Prefer to talk it through? Call or text{" "}
                <a href={site.phoneHref}><strong>{site.phone}</strong></a>. We answer real estate
                questions every day across Lake Charles, Sulphur and the surrounding parishes — no
                obligation.
              </p>
            </div>

            {/* Right: the form */}
            <div className="contact-card">
              <span className="script" style={{ fontSize: "1.5rem" }}>send a message</span>
              <h2 className="section__title" style={{ marginTop: 2, marginBottom: 18 }}>
                Tell us how we can help
              </h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </main>

      {/* Google Business Profile map */}
      <section className="contact-map">
        <iframe
          title={`Map — ${site.localSeo.gbpName}`}
          src={site.localSeo.mapEmbedUrl}
          className="contact-map__frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </section>

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
