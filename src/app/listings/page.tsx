import type { Metadata } from "next";
import Link from "next/link";
import ListingsControls from "@/components/ListingsControls";
import SortSelect from "@/components/SortSelect";
import NotifyBand from "@/components/NotifyBand";
import ListingCard from "@/components/ListingCard";
import MapSearch from "@/components/MapSearch";
import TrackSearch from "@/components/TrackSearch";
import { fetchCards, fetchFirstPhotos, fetchMapPins, PRICE_MAX, type SortKey } from "@/lib/listings";
import { parseFilters, toCriteria, one, arr, type SP } from "@/lib/listingQuery";
import { neighborhoodsFor, zipAreasFor } from "@/lib/neighborhoods";
import type { ListingFilters } from "@/components/ListingsControls";

// IDX search page. ALL filtering/sorting/pagination happens server-side
// against Supabase so it scales to the full feed (3,000+ listings).
export const dynamic = "force-dynamic";

const PER = 9;

export const metadata: Metadata = {
  title: "Homes for Sale in Southwest Louisiana",
  description:
    "Browse homes for sale in Lake Charles, Sulphur and Southwest Louisiana with The Land & Home Group. Search on the map, filter by price, beds, baths, type and more.",
};

export default async function ListingsPage({ searchParams }: { searchParams: SP }) {
  const f = parseFilters(searchParams);
  const page = Math.max(1, Number(one(searchParams.page)) || 1);
  const view = one(searchParams.view) === "split" ? "split" : "list";
  const criteria = toCriteria(f);

  // Compact set of active filters for the per-user search activity log.
  const searchMeta: Record<string, unknown> = {};
  if (f.city) searchMeta.city = f.city;
  if (f.beds) searchMeta.beds = f.beds;
  if (f.baths) searchMeta.baths = f.baths;
  if (f.minPrice) searchMeta.minPrice = f.minPrice;
  if (f.maxPrice && f.maxPrice < PRICE_MAX) searchMeta.maxPrice = f.maxPrice;
  if (f.type) searchMeta.type = f.type;
  if (f.features.length) searchMeta.features = f.features;
  if (f.zip) searchMeta.zip = f.zip;
  if (f.neighborhood) searchMeta.neighborhood = f.neighborhood;
  if (f.q) searchMeta.q = f.q;

  const areaName = f.city ? `${f.city}, Louisiana` : "Southwest Louisiana";

  // Toggle links (preserve filters + sort; drop page/view).
  const keep = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === "view" || k === "page") continue;
    for (const item of arr(v)) keep.append(k, item);
  }
  const keepStr = keep.toString();
  const viewHref = (v: "split" | "list") => {
    const p = new URLSearchParams(keepStr);
    if (v === "split") p.set("view", "split"); // list is the default
    return `/listings${p.toString() ? `?${p}` : ""}`;
  };

  // Filter-only query for the live map API (exclude view & page; sort kept).
  const apiQuery = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === "view" || k === "page") continue;
    for (const item of arr(v)) apiQuery.append(k, item);
  }

  const controls = (
    <ListingsControls
      filters={f}
      total={0}
      neighborhoods={neighborhoodsFor("Lake Charles").map((n) => ({ slug: n.slug, name: n.name }))}
      zips={zipAreasFor("Lake Charles").map((z) => ({ slug: z.slug, name: `${z.name} · ${z.zip}` }))}
    />
  );

  // ---- SPLIT (map + list) ----
  if (view === "split") {
    const [{ rows, total }, pins] = await Promise.all([
      fetchCards(criteria, { limit: 60, sort: f.sort as SortKey }),
      fetchMapPins(criteria),
    ]);
    const photos = await fetchFirstPhotos(rows.map((r) => r.listing_key));
    for (const r of rows) r.photo_url = photos.get(r.listing_key) ?? null;

    return (
      <>
        <Hero areaName={areaName} city={f.city} />
        <ListBar view={view} query={f.q} viewHref={viewHref} />
        <TrackSearch criteria={searchMeta} />
        <main className="results">
          <div className="wrapwide">
            <div className="results__head">
              <div className="meta">
                {f.city || f.q ? <><b>{total.toLocaleString()}</b> {total === 1 ? "home" : "homes"}{f.city ? ` in ${f.city}` : ""}</> : "Drag or zoom the map to search an area"}
              </div>
            </div>
            <MapSearch
              initialCards={rows}
              initialPins={pins}
              initialTotal={total}
              query={apiQuery.toString()}
            />
          </div>
        </main>
        <AreaBlurb areaName={areaName} city={f.city} total={total} />
      </>
    );
  }

  // ---- LIST (classic grid + pager) ----
  const { rows, total } = await fetchCards(criteria, {
    limit: PER,
    offset: (page - 1) * PER,
    sort: f.sort as SortKey,
  });
  const photos = await fetchFirstPhotos(rows.map((r) => r.listing_key));
  for (const r of rows) r.photo_url = photos.get(r.listing_key) ?? null;

  const pages = Math.max(1, Math.ceil(total / PER));
  const startIdx = (page - 1) * PER;
  const baseStr = keepStr; // includes view=... ? no; keep excludes page only when... keep excludes view+page
  const pageHref = (n: number) => {
    const p = new URLSearchParams(keepStr);
    if (f.sort !== "new") p.set("sort", f.sort);
    if (n > 1) p.set("page", String(n));
    return `/listings${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <>
      <Hero areaName={areaName} city={f.city} />
      <ListBar view={view} query={f.q} viewHref={viewHref} />
      <TrackSearch criteria={searchMeta} />
      <main className="results">
        <div className="wrap">
          <div className="searchgrid">
            {controls}
            <div className="searchgrid__main">
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
                <div className="results__tools">
                  <SortSelect sort={f.sort} baseQuery={baseStr} />
                </div>
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
          </div>
        </div>
      </main>
      <AreaBlurb areaName={areaName} city={f.city} total={total} />
    </>
  );
}

function Hero({ areaName, city }: { areaName: string; city: string }) {
  return (
    <header className="hero hero--index hero--listings" style={{ paddingBottom: 52 }}>
      <div className="wrap">
        <div className="hero__crumb">
          <Link href="/">Home</Link> &nbsp;/&nbsp; <Link href="/listings">Listings</Link>
          &nbsp;/&nbsp; {city || "Southwest Louisiana"}
        </div>
        <span className="hero__script">homes for sale in</span>
        <h1>{areaName}</h1>
      </div>
      <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
      </svg>
    </header>
  );
}

// Sticky search + view toggle that stays pinned above the results on scroll.
function ListBar({ view, query, viewHref }: { view: "split" | "list"; query: string; viewHref: (v: "split" | "list") => string }) {
  return (
    <div className="listbar">
      <div className="listbar__inner">
        <form className="hsearch hsearch--bar" action="/listings" method="get">
          <input type="hidden" name="view" value={view} />
          <input className="hsearch__input" type="text" name="q" defaultValue={query}
            placeholder="Search by city, address, or ZIP…" aria-label="Search properties" />
          <button className="hsearch__btn" type="submit">Search</button>
        </form>
        <div className="viewtoggle">
          <Link className={view === "split" ? "is-on" : ""} href={viewHref("split")}>Map</Link>
          <Link className={view === "list" ? "is-on" : ""} href={viewHref("list")}>List</Link>
        </div>
      </div>
    </div>
  );
}

function AreaBlurb({ areaName, city, total }: { areaName: string; city: string; total: number }) {
  return (
    <section className="area">
      <div className="wrap">
        <div className="area__grid">
          <div>
            <span className="script">welcome to</span>
            <h2>{areaName}</h2>
            <p>
              Southwest Louisiana pairs a lakefront lifestyle with a strong economy and
              established neighborhoods. Buyers come here for newer construction in the
              suburbs and solid homes across thirteen SWLA communities from Lake Charles
              and Sulphur to Moss Bluff and DeRidder.
            </p>
            <p>
              The Land &amp; Home Group helps you find the right fit and move quickly when it
              counts. Every listing here is updated live throughout the day.
            </p>
          </div>
          <div className="area__stats">
            <div className="sh">{city || "Southwest Louisiana"} Snapshot</div>
            <div className="row"><span>Matching Listings</span><span>{total.toLocaleString()}</span></div>
            <div className="row"><span>Communities Served</span><span>13 SWLA Cities</span></div>
            <div className="row"><span>Data Refresh</span><span>Continuous</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Inserts the saved-search lead band after the 6th card on page one.
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
