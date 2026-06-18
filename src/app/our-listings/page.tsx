import type { Metadata } from "next";
import Link from "next/link";
import SortSelect from "@/components/SortSelect";
import ListingCard from "@/components/ListingCard";
import LocalMap from "@/components/LocalMap";
import { fetchCards, fetchFirstPhotos, type ListingCriteria, type SortKey } from "@/lib/listings";
import { site } from "@/config/site";

// The team's OWN listings (is_lhg_listing = true). Live, server-rendered.
export const dynamic = "force-dynamic";

const PER = 12;

export const metadata: Metadata = {
  title: `Our Listings | ${site.name}`,
  description:
    "Homes for sale listed by The Land & Home Group across Lake Charles, Sulphur and Southwest Louisiana. Browse our current listings.",
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function OurListingsPage({ searchParams }: { searchParams: SP }) {
  const sort = (one(searchParams.sort) || "new") as SortKey;
  const page = Math.max(1, Number(one(searchParams.page)) || 1);

  const criteria: ListingCriteria = { lhgOnly: true };
  const { rows, total } = await fetchCards(criteria, {
    limit: PER,
    offset: (page - 1) * PER,
    sort,
  });
  const photos = await fetchFirstPhotos(rows.map((r) => r.listing_key));
  for (const r of rows) r.photo_url = photos.get(r.listing_key) ?? null;

  const pages = Math.max(1, Math.ceil(total / PER));
  const startIdx = (page - 1) * PER;

  const baseStr = ""; // no filters carried other than sort
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (sort !== "new") p.set("sort", sort);
    if (n > 1) p.set("page", String(n));
    return `/our-listings${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <>
      <header className="hero hero--index">
        <div className="wrap">
          <div className="hero__crumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; Our Listings
          </div>
          <span className="hero__script">listed by our team</span>
          <h1>Our Listings</h1>
          <p className="hero__sub">
            Homes listed by {site.name}, brokered by {site.brokerage}. These are our own
            listings across Lake Charles, Sulphur and Southwest Louisiana — updated live
            throughout the day.
          </p>
          <div className="hero__cta">
            <Link className="btn btn--aqua" href="/buyer-quiz">Take the Buyer Quiz</Link>
            <a className="btn btn--hollow" href={site.phoneHref}>Call Us Now</a>
          </div>
          <div className="hero__meta">
            <div>
              <div className="n"><b>{total.toLocaleString()}</b></div>
              <div className="k">Active Listings</div>
            </div>
            <div>
              <div className="n"><a href={site.phoneHref}>{site.phone}</a></div>
              <div className="k">Call Our Team</div>
            </div>
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
              {total > 0 ? (
                <>
                  Showing <b>{startIdx + 1}–{Math.min(startIdx + rows.length, total)}</b> of{" "}
                  <b>{total.toLocaleString()}</b> of our listings
                </>
              ) : (
                <>No active team listings right now</>
              )}
            </div>
            {total > 0 && <SortSelect sort={sort} baseQuery={baseStr} basePath="/our-listings" />}
          </div>

          <div className="listings__grid">
            {rows.length === 0 ? (
              <div className="empty">
                <span className="script">check back soon</span>
                <h3>No active listings at the moment</h3>
                <p>
                  Our team&apos;s next listings will appear here automatically. In the meantime,
                  browse every home for sale across Southwest Louisiana.
                </p>
                <Link href="/listings">Browse all listings</Link>
              </div>
            ) : (
              rows.map((c) => <ListingCard key={c.listing_key} c={c} />)
            )}
          </div>

          {pages > 1 && (
            <nav className="pager" aria-label="Pagination">
              {page > 1 ? <Link href={pageHref(page - 1)}>&lsaquo;</Link> : <span className="disabled">&lsaquo;</span>}
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2)
                .reduce<(number | "…")[]>((acc, n, idx, all) => {
                  if (idx > 0 && n - (all[idx - 1] as number) > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === "…" ? (
                    <span key={`g${i}`}>…</span>
                  ) : n === page ? (
                    <span key={n} className="current">{n}</span>
                  ) : (
                    <Link key={n} href={pageHref(n)}>{n}</Link>
                  ),
                )}
              {page < pages ? <Link href={pageHref(page + 1)}>&rsaquo;</Link> : <span className="disabled">&rsaquo;</span>}
            </nav>
          )}
        </div>
      </main>

      <section className="preapproval">
        <div className="wrap preapproval__inner">
          <div className="preapproval__txt">
            <span className="script">before you make an offer</span>
            <h2>Get pre-approved &amp; shop with confidence</h2>
            <p>
              Knowing your budget up front makes your search easier — and your offer stronger when you
              find the one. Get pre-approved with our trusted local lending partner in minutes.
            </p>
          </div>
          <a className="btn btn--aqua preapproval__btn" href={site.bayou.ctaHref} target="_blank" rel="noopener">
            Get Pre-Approved
          </a>
        </div>
      </section>

      <LocalMap cityLabel="Southwest Louisiana" href="/listings" ctaLabel="Browse all SWLA listings" />
    </>
  );
}
