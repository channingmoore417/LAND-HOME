import type { Metadata } from "next";
import Link from "next/link";
import { getPublicClient } from "@/lib/supabase";
import { usd, int, titleCase } from "@/lib/format";
import ListingsControls, { type ListingFilters } from "@/components/ListingsControls";
import SortSelect from "@/components/SortSelect";
import FavButton from "@/components/FavButton";
import NotifyBand from "@/components/NotifyBand";

// IDX search page. ALL filtering/sorting/pagination happens server-side
// against Supabase so it scales to the full feed (3,000+ listings) — the
// client only composes the URL query string (see ListingsControls).
export const dynamic = "force-dynamic";

const PER = 9;
const PRICE_MAX = 1_000_000;
const SQFT_MAX = 5_000;

export const metadata: Metadata = {
  title: "Homes for Sale in Southwest Louisiana",
  description:
    "Browse homes for sale in Lake Charles, Sulphur and Southwest Louisiana with The Land & Home Group. Filter by price, beds, baths, type and more.",
};

// Feature filter key → Supabase boolean column.
const FEATURE_COLUMN: Record<string, string> = {
  pool: "has_pool",
  garage: "has_garage",
  waterfront: "is_waterfront",
  fireplace: "has_fireplace",
  new_construction: "is_new_construction",
  updated: "is_updated_remodeled",
  single_story: "is_single_story",
  acre_plus: "has_acre_plus",
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
    sort: one(sp.sort) || "new",
  };
}

const SELECT =
  "listing_key, listing_id, list_price, bedrooms_total, bathrooms_total, living_area, lot_size_sqft, property_type, property_sub_type, standard_status, unparsed_address, city, state_or_province, postal_code, photos_count, is_new_construction, is_lhg_listing, list_office_name, internet_address_yn, days_on_market";

interface Card {
  listing_key: string;
  listing_id: string | null;
  list_price: number | null;
  bedrooms_total: number | null;
  bathrooms_total: number | null;
  living_area: number | null;
  lot_size_sqft: number | null;
  property_type: string | null;
  property_sub_type: string | null;
  standard_status: string | null;
  unparsed_address: string | null;
  city: string | null;
  state_or_province: string | null;
  postal_code: string | null;
  photos_count: number | null;
  is_new_construction: boolean;
  is_lhg_listing: boolean;
  list_office_name: string | null;
  internet_address_yn: boolean;
  days_on_market: number | null;
}

async function queryListings(f: ListingFilters, page: number) {
  const supabase = getPublicClient();
  let q = supabase.from("listings").select(SELECT, { count: "exact" });

  // IDX compliance: never list a record flagged off the internet.
  q = q.neq("internet_display_yn", false);
  // Default browse = Active inventory; honor an explicit status filter.
  q = q.eq("standard_status", f.status || "Active");

  if (f.city) q = q.ilike("city", f.city);
  if (f.beds) q = q.gte("bedrooms_total", f.beds);
  if (f.baths) q = q.gte("bathrooms_total", f.baths);
  if (f.minPrice > 0) q = q.gte("list_price", f.minPrice);
  if (f.maxPrice < PRICE_MAX) q = q.lte("list_price", f.maxPrice);
  if (f.minSqft > 0) q = q.gte("living_area", f.minSqft);
  if (f.maxSqft < SQFT_MAX) q = q.lte("living_area", f.maxSqft);
  if (f.year) q = q.gte("year_built", f.year);

  if (f.type === "Single Family") q = q.ilike("property_sub_type", "%Single Family%");
  else if (f.type === "Multi-Family")
    q = q.or("property_sub_type.ilike.%Multi%,property_type.ilike.%Income%");
  else if (f.type === "New Construction") q = q.eq("is_new_construction", true);
  else if (f.type === "Land") q = q.ilike("property_type", "%Land%");

  for (const key of f.features) {
    const col = FEATURE_COLUMN[key];
    if (col) q = q.eq(col, true);
  }

  if (f.q) {
    // Strip characters that would break the PostgREST or() grammar.
    const term = f.q.replace(/[(),]/g, " ").trim();
    if (term) {
      q = q.or(
        `unparsed_address.ilike.%${term}%,city.ilike.%${term}%,postal_code.ilike.%${term}%,subdivision_name.ilike.%${term}%`,
      );
    }
  }

  switch (f.sort) {
    case "plow": q = q.order("list_price", { ascending: true, nullsFirst: false }); break;
    case "phigh": q = q.order("list_price", { ascending: false, nullsFirst: false }); break;
    case "beds": q = q.order("bedrooms_total", { ascending: false, nullsFirst: false }); break;
    case "sqft": q = q.order("living_area", { ascending: false, nullsFirst: false }); break;
    default: q = q.order("modification_timestamp", { ascending: false, nullsFirst: false });
  }

  const from = (page - 1) * PER;
  q = q.range(from, from + PER - 1);

  const { data, count, error } = await q;
  if (error) {
    console.error("[listings] query failed:", error.message);
    return { rows: [] as Card[], total: 0 };
  }
  return { rows: (data as Card[]) ?? [], total: count ?? 0 };
}

async function firstPhotos(keys: string[]) {
  if (keys.length === 0) return new Map<string, string>();
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("listing_media")
    .select("listing_key, media_url, order")
    .in("listing_key", keys)
    .order("order", { ascending: true });
  const map = new Map<string, string>();
  for (const m of (data as { listing_key: string; media_url: string }[]) ?? []) {
    if (!map.has(m.listing_key)) map.set(m.listing_key, m.media_url);
  }
  return map;
}

function specs(c: Card) {
  if ((c.property_type ?? "").toLowerCase().includes("land")) {
    return (
      <span>
        <b>{c.lot_size_sqft ? int(c.lot_size_sqft) : "—"}</b>
        <i>lot sqft</i>
      </span>
    );
  }
  return (
    <>
      <span><b>{c.bedrooms_total ?? "—"}</b><i>bd</i></span>
      <span className="dot">&bull;</span>
      <span><b>{c.bathrooms_total ?? "—"}</b><i>ba</i></span>
      <span className="dot">&bull;</span>
      <span><b>{int(c.living_area)}</b><i>sqft</i></span>
    </>
  );
}

function statusBadge(c: Card) {
  const isNew = c.days_on_market != null && c.days_on_market <= 14;
  if (isNew) return { label: "New", cls: " is-new" };
  return { label: titleCase(c.standard_status) || "For Sale", cls: "" };
}

export default async function ListingsPage({ searchParams }: { searchParams: SP }) {
  const f = parseFilters(searchParams);
  const page = Math.max(1, Number(one(searchParams.page)) || 1);

  const { rows, total } = await queryListings(f, page);
  const photos = await firstPhotos(rows.map((r) => r.listing_key));

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
        <ListingsControls filters={f} total={total} />
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
              rows.map((c, i) => {
                const badge = statusBadge(c);
                const showAddr = c.internet_address_yn !== false;
                const photo = photos.get(c.listing_key);
                const cityState = `${titleCase(c.city)}, ${c.state_or_province ?? "LA"} ${c.postal_code ?? ""}`.trim();
                return (
                  <Box key={c.listing_key} index={i} page={page} criteria={f}>
                    <Link className="pcard" href={`/listings/${c.listing_key}`}>
                      <div className="pcard__media">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt={showAddr ? c.unparsed_address ?? "Listing" : "Listing"} loading="lazy" />
                        ) : (
                          <div style={{ width: "100%", height: "100%", background: "#cfe0e4" }} />
                        )}
                        <span className={`pcard__status${badge.cls}`}>{badge.label}</span>
                        <FavButton />
                        {c.photos_count ? <span className="pcard__photos">&#9634; {c.photos_count}</span> : null}
                      </div>
                      <div className="pcard__body">
                        <div className="pcard__price">{usd(c.list_price)}</div>
                        <div className="pcard__specs">{specs(c)}</div>
                        <div className="pcard__addr">
                          {showAddr ? c.unparsed_address ?? `${titleCase(c.city)} Area` : `${titleCase(c.city)} Area`}
                        </div>
                        <div className="pcard__sub">{cityState}</div>
                        <div className="pcard__foot">
                          <span className="pcard__mls">{c.listing_id ? `MLS# ${c.listing_id}` : ""}</span>
                          <span className="pcard__cta">View Home <span className="arr">&rarr;</span></span>
                        </div>
                        {!c.is_lhg_listing && c.list_office_name && (
                          <div className="pcard__courtesy">Courtesy of {titleCase(c.list_office_name)}</div>
                        )}
                      </div>
                    </Link>
                  </Box>
                );
              })
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
