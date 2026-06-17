import type { Metadata } from "next";
import Link from "next/link";
import ListingsControls, { type ListingFilters } from "@/components/ListingsControls";
import SortSelect from "@/components/SortSelect";
import NotifyBand from "@/components/NotifyBand";
import ListingCard from "@/components/ListingCard";
import {
  fetchCards, fetchFirstPhotos, PRICE_MAX, SQFT_MAX,
  type ListingCriteria, type SortKey,
} from "@/lib/listings";
import { neighborhoodsFor, zipAreasFor, findNeighborhood } from "@/lib/neighborhoods";

// IDX search page. ALL filtering/sorting/pagination happens server-side
// against Supabase so it scales to the full feed (3,000+ listings) — the
// client only composes the URL query string (see ListingsControls).
export const dynamic = "force-dynamic";

const PER = 9;

export const metadata: Metadata = {
  title: "Homes for Sale in Southwest Louisiana",
  description:
    "Browse homes for sale in Lake Charles, Sulphur and Southwest Louisiana with The Land & Home Group. Filter by price, beds, baths, type and more.",
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const arr = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

function parseFilters(sp: SP): ListingFilters {
  return {
    q: one(sp.q),
    city: one(sp.city),
    beds: Number(one(sp.beds)) || 0,
    baths: Number(one(sp.baths)) || 0,
    type: one(sp.type),
    status: one(sp.status),
    minPrice: Number(one(sp.minPrice)) || 0,
    maxPrice: Number(one(sp.maxPrice)) || PRICE_MAX,
    minSqft: Number(one(sp.minSqft)) || 0,
    maxSqft: Number(one(sp.maxSqft)) || SQFT_MAX,
    year: Number(one(sp.year)) || 0,
    features: arr(sp.feature),
    zip: one(sp.zip),
    neighborhood: one(sp.neighborhood),
    sort: one(sp.sort) || "new",
  };
}

function toCriteria(f: ListingFilters): ListingCriteria {
  const crit: ListingCriteria = {
    status: f.status || undefined,
    city: f.city || undefined,
    bedsMin: f.beds || undefined,
    bathsMin: f.baths || undefined,
    priceMin: f.minPrice || undefined,
    priceMax: f.maxPrice,
    sqftMin: f.minSqft || undefined,
    sqftMax: f.maxSqft,
    yearMin: f.year || undefined,
    type: f.type || undefined,
    features: f.features,
    q: f.q || undefined,
  };
  if (f.zip) crit.postalCode = f.zip;
  if (f.neighborhood && f.city) {
    const n = findNeighborhood(f.city, f.neighborhood);
    if (n?.keywords?.length) crit.subdivisionAny = n.keywords;
    if (n?.zip) crit.postalCode = n.zip;
  }
  return crit;
}

export default async function ListingsPage({ searchParams }: { searchParams: SP }) {
  const f = parseFilters(searchParams);
  const page = Math.max(1, Number(one(searchParams.page)) || 1);

  const { rows, total } = await fetchCards(toCriteria(f), {
    limit: PER,
    offset: (page - 1) * PER,
    sort: f.sort as SortKey,
  });
  const photos = await fetchFirstPhotos(rows.map((r) => r.listing_key));
  for (const r of rows) r.photo_url = photos.get(r.listing_key) ?? null;

  const pages = Math.max(1, Math.ceil(total / PER));
  const startIdx = (page - 1) * PER;

  // Base query (everything except sort/page) for the sort dropdown + pager.
  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === "sort" || k === "page") continue;
    for (const item of arr(v)) base.append(k, item);
  }
  const baseStr = base.toString();
  const pageHref = (n: number) => {
    const p = new URLSearchParams(baseStr);
    if (f.sort !== "new") p.set("sort", f.sort);
    if (n > 1) p.set("page", String(n));
    return `/listings${p.toString() ? `?${p}` : ""}`;
  };

  const areaName = f.city ? `${f.city}, Louisiana` : "Southwest Louisiana";

  return (
    <>
      <header className="hero hero--index">
        <div className="wrap">
          <div className="hero__crumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; <Link href="/listings">Listings</Link>
            &nbsp;/&nbsp; {f.city || "Southwest Louisiana"}
          </div>
          <span className="hero__script">homes for sale in</span>
          <h1>{areaName}</h1>
          <p className="hero__sub">
            Browse active listings across Lake Charles, Sulphur, and Southwest Louisiana —
            presented by The Land &amp; Home Group.
          </p>
          <div className="hero__meta">
            <div>
              <div className="n"><b>{total.toLocaleString()}</b></div>
              <div className="k">Matching Listings</div>
            </div>
            <div>
              <div className="n">13</div>
              <div className="k">SWLA Communities</div>
            </div>
            <div>
              <div className="n">SWLAR</div>
              <div className="k">MLS Feed</div>
            </div>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <div className="wrap">
        <ListingsControls
          filters={f}
          total={total}
          neighborhoods={neighborhoodsFor("Lake Charles").map((n) => ({ slug: n.slug, name: n.name }))}
          zips={zipAreasFor("Lake Charles").map((z) => ({ slug: z.slug, name: `${z.name} · ${z.zip}` }))}
        />
      </div>

      <main className="results">
        <div className="wrap">
          <div className="results__head">
            <div className="meta">
              {total > 0 ? (
                <>
                  Showing <b>{startIdx + 1}–{Math.min(startIdx + rows.length, total)}</b> of{" "}
                  <b>{total.toLocaleString()}</b> homes
                </>
              ) : (
                <>No homes match your filters</>
              )}
            </div>
            <SortSelect sort={f.sort} baseQuery={baseStr} />
          </div>

          <div className="listings__grid">
            {rows.length === 0 ? (
              <div className="empty">
                <span className="script">no matches</span>
                <h3>No homes fit those filters</h3>
                <p>Try widening your price range or clearing a filter or two.</p>
                <Link href="/listings">Reset all filters</Link>
              </div>
            ) : (
              rows.map((c, i) => (
                <Box key={c.listing_key} index={i} page={page} criteria={f}>
                  <ListingCard c={c} />
                </Box>
              ))
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

      <section className="area">
        <div className="wrap">
          <div className="area__grid">
            <div>
              <span className="script">welcome to</span>
              <h2>{areaName}</h2>
              <p>
                Southwest Louisiana pairs a lakefront lifestyle with a strong economy and
                established neighborhoods. Buyers come here for newer construction in the
                suburbs and solid homes — many in flood zone X — across thirteen SWLA
                communities from Lake Charles and Sulphur to Moss Bluff and DeRidder.
              </p>
              <p>
                The Land &amp; Home Group helps you find the right fit and move quickly when it
                counts. Every listing here is pulled live from the SWLAR MLS feed.
              </p>
            </div>
            <div className="area__stats">
              <div className="sh">{f.city || "Southwest Louisiana"} Snapshot</div>
              <div className="row"><span>Matching Listings</span><span>{total.toLocaleString()}</span></div>
              <div className="row"><span>Communities Served</span><span>13 SWLA Cities</span></div>
              <div className="row"><span>MLS Feed</span><span>SWLAR · Trestle</span></div>
              <div className="row"><span>Data Refresh</span><span>Continuous Sync</span></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// Inserts the saved-search lead band after the 6th card on page one,
// mirroring the template, without breaking the server-rendered grid.
function Box({
  children, index, page, criteria,
}: {
  children: React.ReactNode;
  index: number;
  page: number;
  criteria: ListingFilters;
}) {
  return (
    <>
      {children}
      {page === 1 && index === 5 && <NotifyBand criteria={criteria as unknown as Record<string, unknown>} />}
    </>
  );
}
