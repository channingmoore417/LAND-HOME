import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/config/site";
import { getAgent, firstName } from "@/lib/team";
import { fetchCards, fetchPhotosMap, type Card } from "@/lib/listings";
import ListingCard from "@/components/ListingCard";
import AwardList, { awardStrings } from "@/components/AwardList";
import AgentContactForm, { AgentIntentButton } from "@/components/AgentContactForm";
import JsonLd from "@/components/JsonLd";
import { napSchema } from "@/lib/nap";
import { breadcrumbSchema } from "@/lib/schema";
import { pageMetadata } from "@/lib/seoMeta";
import { SITE_URL as SITE } from "@/lib/seoConfig";

export const dynamic = "force-dynamic";

function telHref(phone: string) {
  return "tel:+1" + phone.replace(/[^0-9]/g, "");
}
function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await getAgent(params.slug);
  if (!a) return { title: "Agent not found" };
  const first = firstName(a);
  return pageMetadata({
    title: `${a.full_name} | Lake Charles Realtor`,
    description: `${a.full_name}, ${a.title ?? "REALTOR®"} with ${site.name} in Lake Charles, LA. See ${first}'s listings, reviews and how to reach ${first} directly.`,
    path: `/agents/${a.slug}`,
    image: a.photo_url ?? undefined,
    imageAlt: a.full_name,
  });
}

// Fallback "why work with me" points for agents who haven't written their own.
// Team-level facts only, so nothing here overstates one agent.
function defaultWhy(first: string) {
  return [
    { title: "Local To Southwest Louisiana", text: `${first} lives and works here, so you get real answers about neighborhoods, prices and what homes actually sell for.` },
    { title: "A Full Team Behind You", text: `You work with ${first}, backed by The Land & Home Group for showings, paperwork and deadlines.` },
    { title: "Call Or Text Direct", text: `You reach ${first}, not a call center. Questions get answered quickly.` },
    { title: "No Pressure", text: `Straight advice on what's right for you, whether you're buying your first home or selling your fifth.` },
  ];
}

export default async function AgentPage({ params }: { params: { slug: string } }) {
  const a = await getAgent(params.slug);
  if (!a) notFound();
  const first = firstName(a);
  const isLauren = a.full_name === site.blogAuthor.name;
  const phone = a.phone || site.phone;
  const sms = telHref(phone).replace("tel:", "sms:");

  // The agent's own listings: active first, then under contract.
  let active: Card[] = [];
  let pending: Card[] = [];
  let activeTotal = 0;
  let pendingTotal = 0;
  if (a.mls_id) {
    const [act, pen] = await Promise.all([
      fetchCards({ listAgentMlsId: a.mls_id }, { limit: 12, sort: "new" }),
      fetchCards({ listAgentMlsId: a.mls_id, status: "Pending" }, { limit: 6, sort: "new" }),
    ]);
    active = act.rows; activeTotal = act.total;
    pending = pen.rows; pendingTotal = pen.total;
    const photos = await fetchPhotosMap([...active, ...pending].map((r) => r.listing_key));
    for (const r of [...active, ...pending]) r.photos = photos.get(r.listing_key) ?? [];
  }

  const bio = (a.bio || `${a.full_name} is a ${a.title ?? "REALTOR®"} with ${site.name}, brokered by ${site.brokerage}, helping buyers and sellers across Lake Charles, Sulphur, Moss Bluff and the rest of Southwest Louisiana.`)
    .split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  const why = a.why_me?.length ? a.why_me : defaultWhy(first);
  const reviews = a.reviews ?? [];
  const pageUrl = `${SITE}/agents/${a.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": ["Person", "RealEstateAgent"],
      name: a.full_name,
      jobTitle: a.title ?? "REALTOR®",
      url: pageUrl,
      telephone: phone,
      ...(a.email ? { email: a.email } : {}),
      ...(a.photo_url ? { image: a.photo_url } : {}),
      worksFor: { "@type": "RealEstateAgent", name: site.name, url: SITE, telephone: site.phone, ...napSchema() },
      areaServed: { "@type": "AdministrativeArea", name: "Southwest Louisiana" },
      ...(isLauren ? { award: awardStrings() } : {}),
    },
    breadcrumbSchema([["Home", "/"], ["About", "/about"], [a.full_name, `/agents/${a.slug}`]]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />

      <header className="hero hero--index agent-hero">
        <div className="wrap agent-hero__grid">
          <div className="agent-hero__photo">
            {a.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.photo_url} alt={a.full_name} />
            ) : (
              <span aria-hidden>{initials(a.full_name)}</span>
            )}
          </div>
          <div>
            <nav className="hero__crumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link> &nbsp;/&nbsp; <Link href="/about">About</Link> &nbsp;/&nbsp; {a.full_name}
            </nav>
            <span className="hero__script">lake charles realtor</span>
            <h1>{a.full_name}</h1>
            <p className="hero__sub">{a.title ?? "REALTOR®"} · {site.name}, brokered by {site.brokerage}</p>
            <div className="agent-hero__contact">
              <a href={telHref(phone)}>📞 {phone}</a>
              <a href={sms}>💬 Text {first}</a>
              {a.email && <a href={`mailto:${a.email}`}>✉️ {a.email}</a>}
            </div>
            <div className="hero__cta">
              <Link className="btn btn--aqua" href="/homes-for-sale">Search Homes</Link>
              <AgentIntentButton intent="Selling" className="btn btn--hollow">List My Home With {first}</AgentIntentButton>
            </div>
            {a.mls_id && (
              <div className="hero__meta">
                <div><div className="n"><b>{activeTotal}</b></div><div className="k">Active Listings</div></div>
                <div><div className="n"><b>{pendingTotal}</b></div><div className="k">Under Contract</div></div>
                <div><div className="n">{site.nap.rating} ★</div><div className="k">Team Google Rating</div></div>
              </div>
            )}
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      {/* About */}
      <section className="seo-body">
        <div className="wrap agent-about">
          <div>
            <span className="script">get to know {first.toLowerCase()}</span>
            <h2 className="section__title">About {first}</h2>
            <div className="prose">{bio.map((p, i) => <p key={i}>{p}</p>)}</div>
          </div>
          {isLauren && (
            <div>
              <h3 className="seo-h3">Awards</h3>
              <AwardList />
            </div>
          )}
        </div>
      </section>

      {/* Why me */}
      <section className="agent-why">
        <div className="wrap">
          <span className="script">why work with {first.toLowerCase()}</span>
          <h2 className="section__title">Why Clients Choose {first}</h2>
          <div className="agent-why__grid">
            {why.map((w) => (
              <div className="agent-why__card" key={w.title}>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-step plan */}
      <section className="agent-plan">
        <div className="wrap">
          <span className="script">it&apos;s simple</span>
          <h2 className="section__title">Your Move In 3 Simple Steps</h2>
          <p className="agent-plan__sub">
            Buying or selling a home shouldn&apos;t mean guessing, pressure or getting lost in paperwork. Here&apos;s how {first} gets you there.
          </p>
          <ol className="agent-plan__steps">
            <li>
              <span className="agent-plan__n">1</span>
              <h3>Talk With {first}</h3>
              <p>Call, text or send a message. Tell {first} what you&apos;re looking for, your timeline and your budget.</p>
            </li>
            <li>
              <span className="agent-plan__n">2</span>
              <h3>Get Your Game Plan</h3>
              <p>Buying: a search built around what matters to you and a lender lined up. Selling: a price based on real local sales and a plan to market your home.</p>
            </li>
            <li>
              <span className="agent-plan__n">3</span>
              <h3>Close With Confidence</h3>
              <p>{first} handles the offers, inspections, negotiating and deadlines, all the way to the closing table and the keys.</p>
            </li>
          </ol>
          <div className="agent-plan__cta">
            <AgentIntentButton intent="Buying" className="btn btn--primary">Start My Home Search</AgentIntentButton>
            <AgentIntentButton intent="Selling" className="btn btn--ghost">List My Home</AgentIntentButton>
          </div>
        </div>
      </section>

      {/* Listings */}
      {a.mls_id && (
        <section className="results">
          <div className="wrap">
            <span className="script">listed by {first.toLowerCase()}</span>
            <h2 className="section__title">{first}&apos;s Listings</h2>
            {active.length > 0 ? (
              <div className="listings__grid">{active.map((c) => <ListingCard key={c.listing_key} c={c} />)}</div>
            ) : (
              <p className="agent-empty">
                {first} doesn&apos;t have an active listing right now. <Link href="/our-listings">See all of our team&apos;s listings</Link>.
              </p>
            )}
            {pending.length > 0 && (
              <>
                <h3 className="seo-h3" style={{ marginTop: 32 }}>Under Contract</h3>
                <div className="listings__grid">{pending.map((c) => <ListingCard key={c.listing_key} c={c} />)}</div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="tw">
        <div className="wrap">
          <div className="tw__head">
            <span className="script" style={{ fontSize: "1.7rem" }}>what clients say</span>
            <h2 className="section__title" style={{ marginTop: 0 }}>
              {reviews.length ? `Reviews For ${first}` : "Reviews For Our Team"}
            </h2>
            <p className="tw__sub">
              <span className="tw-stars">★★★★★</span> &nbsp;{site.name} is rated {site.nap.rating} on Google from {site.nap.reviewCount} reviews ·{" "}
              <a href={site.blogAuthor.gbpUrl} target="_blank" rel="noopener">Read them on Google</a>
            </p>
          </div>
          {reviews.length > 0 && (
            <div className="tw__grid">
              {reviews.map((r) => (
                <figure className="tw__card" key={r.name}>
                  <span className="tw-stars" aria-label="5 out of 5 stars">★★★★★</span>
                  <blockquote>{r.text}</blockquote>
                  <figcaption>
                    <span className="tw__avatar" aria-hidden>{initials(r.name)}</span>
                    <span><span className="tw__name">{r.name}</span>{r.when && <span className="tw__when">{r.when}</span>}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact */}
      <section className="agent-contact" id="contact">
        <div className="wrap agent-contact__grid">
          <div>
            <span className="script">let&apos;s talk</span>
            <h2 className="section__title">Reach {first} Directly</h2>
            <p>Whether you&apos;re ready to move or just have a question, {first} is happy to help. No pressure, just straight answers.</p>
            <ul className="agent-contact__list">
              <li><a href={telHref(phone)}>📞 Call {phone}</a></li>
              <li><a href={sms}>💬 Text {first}</a></li>
              {a.email && <li><a href={`mailto:${a.email}`}>✉️ {a.email}</a></li>}
            </ul>
            <div className="agent-contact__links">
              <Link className="btn btn--ghost" href="/homes-for-sale">Search Homes</Link>
              <Link className="btn btn--ghost" href="/home-value">What&apos;s My Home Worth?</Link>
            </div>
          </div>
          <AgentContactForm agentName={a.full_name} agentSlug={a.slug} />
        </div>
      </section>
    </>
  );
}
