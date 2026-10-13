"use client";

import { useMemo, useState } from "react";

// ============================================================
// Showings / Saved Searches / Saved Homes — one row per PERSON, not per click.
// Each row shows who they are (name, phone, email) and a summary of what they
// did (how many, price range, typical beds/baths, cities); click to expand the
// individual items. Filters and sort sit above, summary tiles above those.
// ============================================================

export interface ListingCtx {
  listing_key: string;
  unparsed_address: string | null;
  list_price: number | null;
  city: string | null;
  bedrooms_total: number | null;
  bathrooms_total: number | null;
  living_area: number | null;
  property_type: string | null;
}
export interface BAShowing {
  id: number; listing_key: string | null; full_name: string | null; email: string | null; phone: string | null;
  preferred_times: string | null; status: string | null; created_at: string; listing: ListingCtx | null;
}
export interface BASearch {
  id: number; email: string | null; name: string | null; criteria: Record<string, unknown>; active: boolean;
  alert_frequency: string | null; created_at: string; source?: string | null;
  norm?: {
    cities?: string[]; bedsMin?: number; bathsMin?: number; priceMin?: number; priceMax?: number;
    sqftMin?: number; type?: string; features?: string[]; postalCode?: string;
  };
}
export interface BAFavorite {
  id: number; email: string | null; listing_key: string; created_at: string; listing: ListingCtx | null;
}
export interface BAIdentity { email: string | null; full_name: string | null; phone: string | null }

export type BAMode = "showings" | "searches" | "favorites";

interface Props {
  mode: BAMode;
  showings: BAShowing[];
  searches: BASearch[];
  favorites: BAFavorite[];
  identities: BAIdentity[];
  onOpen: (c: { email: string; name?: string | null; phone?: string | null }, list: { email: string; name?: string | null; phone?: string | null }[]) => void;
}

const FEATURE_LABELS: Record<string, string> = {
  pool: "Pool", acreage: "Acreage", waterfront: "Waterfront", newconstruction: "New construction", singlestory: "Single story",
  shop: "Shop / workshop", remodeled: "Remodeled", newConstruction: "New construction",
};

const DAY = 86_400_000;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const nums = (xs: (number | null | undefined)[]) => xs.filter((x): x is number => typeof x === "number" && x > 0);

function k(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace(/0$/, "")}M`;
  return `$${Math.round(n / 1000)}k`;
}
const usdFull = (n: number | null | undefined) => (n ? `$${Math.round(n).toLocaleString("en-US")}` : "—");
const one = (n: number | null) => (n === null ? "—" : String(Math.round(n * 10) / 10));
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function ago(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}
function range(lo: number | null, hi: number | null): string {
  if (lo === null && hi === null) return "—";
  if (lo === hi || hi === null) return k(lo ?? hi);
  if (lo === null) return `up to ${k(hi)}`;
  return `${k(lo)} – ${k(hi)}`;
}
function topCities(xs: (string | null | undefined)[], n = 2): string[] {
  const m = new Map<string, number>();
  for (const x of xs) if (x) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([c]) => c);
}
function searchWords(s: BASearch): string {
  const n = s.norm ?? {};
  const parts: string[] = [];
  if (n.cities?.length) parts.push(n.cities.join(", "));
  if (n.postalCode) parts.push(n.postalCode);
  if (n.type) parts.push(n.type);
  if (n.priceMin || n.priceMax) parts.push(range(n.priceMin ?? null, n.priceMax ?? null));
  if (n.bedsMin) parts.push(`${n.bedsMin}+ bd`);
  if (n.bathsMin) parts.push(`${n.bathsMin}+ ba`);
  if (n.sqftMin) parts.push(`${n.sqftMin.toLocaleString("en-US")}+ sqft`);
  if (n.features?.length) parts.push(n.features.map((f) => FEATURE_LABELS[f] ?? f).join(", "));
  return parts.join(" · ") || "Any home";
}

interface Row {
  email: string;
  name: string | null;
  phone: string | null;
  count: number;
  lastAt: string;
  priceLo: number | null;
  priceHi: number | null;
  priceAvg: number | null;
  beds: number | null;
  baths: number | null;
  cities: string[];
  allCities: string[];
  badge?: string;
  items: { key: string; title: string; href?: string; sub: string; when: string }[];
}

export default function BuyerActivity({ mode, showings, searches, favorites, identities, onOpen }: Props) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [minCount, setMinCount] = useState("");
  const [since, setSince] = useState("");
  const [sort, setSort] = useState("recent");
  const [open, setOpen] = useState<string | null>(null);

  const who = useMemo(() => {
    const m = new Map<string, { name: string | null; phone: string | null }>();
    for (const i of identities) {
      if (!i.email) continue;
      const key = i.email.toLowerCase();
      const cur = m.get(key) ?? { name: null, phone: null };
      m.set(key, { name: cur.name || i.full_name || null, phone: cur.phone || i.phone || null });
    }
    return m;
  }, [identities]);

  const rows: Row[] = useMemo(() => {
    const groups = new Map<string, { email: string; recs: unknown[] }>();
    const push = (email: string | null, rec: unknown) => {
      if (!email) return;
      const key = email.toLowerCase();
      const g = groups.get(key) ?? { email, recs: [] };
      g.recs.push(rec);
      groups.set(key, g);
    };
    if (mode === "favorites") favorites.forEach((f) => push(f.email, f));
    if (mode === "showings") showings.forEach((s) => push(s.email, s));
    if (mode === "searches") searches.forEach((s) => push(s.email, s));

    const out: Row[] = [];
    for (const [key, g] of groups) {
      const id = who.get(key);
      const base = { email: g.email, name: id?.name ?? null, phone: id?.phone ?? null };

      if (mode === "searches") {
        const recs = (g.recs as BASearch[]).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        const lows = nums(recs.map((r) => r.norm?.priceMin));
        const highs = nums(recs.map((r) => r.norm?.priceMax));
        const cities = recs.flatMap((r) => r.norm?.cities ?? []);
        const active = recs.filter((r) => r.active).length;
        out.push({
          ...base,
          count: recs.length,
          lastAt: recs[0].created_at,
          priceLo: lows.length ? Math.min(...lows) : null,
          priceHi: highs.length ? Math.max(...highs) : null,
          priceAvg: avg([...lows, ...highs]),
          beds: avg(nums(recs.map((r) => r.norm?.bedsMin))),
          baths: avg(nums(recs.map((r) => r.norm?.bathsMin))),
          cities: topCities(cities, 3),
          allCities: [...new Set(cities)],
          badge: active ? `${active} alert${active === 1 ? "" : "s"} on` : "alerts off",
          items: recs.map((r) => ({
            key: `s${r.id}`,
            title: r.name || "Saved search",
            sub: `${searchWords(r)} · alerts ${r.active ? r.alert_frequency ?? "on" : "off"}${r.source && r.source !== "site" ? ` · by ${r.source}` : ""}`,
            when: r.created_at,
          })),
        });
        continue;
      }

      // Homes: favorites or showing requests — both carry listing context.
      const recs = (g.recs as (BAFavorite | BAShowing)[]).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      const ls = recs.map((r) => r.listing).filter((l): l is ListingCtx => !!l);
      const prices = nums(ls.map((l) => l.list_price));
      const lone = mode === "showings" ? (recs[0] as BAShowing) : null;
      out.push({
        ...base,
        name: base.name || lone?.full_name || null,
        phone: base.phone || lone?.phone || null,
        count: recs.length,
        lastAt: recs[0].created_at,
        priceLo: prices.length ? Math.min(...prices) : null,
        priceHi: prices.length ? Math.max(...prices) : null,
        priceAvg: avg(prices),
        beds: avg(nums(ls.map((l) => l.bedrooms_total))),
        baths: avg(nums(ls.map((l) => l.bathrooms_total))),
        cities: topCities(ls.map((l) => l.city), 2),
        allCities: [...new Set(ls.map((l) => l.city).filter((c): c is string => !!c))],
        badge: mode === "showings" ? (recs as BAShowing[]).some((r) => (r.status || "new") === "new") ? "new request" : undefined : undefined,
        items: recs.map((r) => {
          const l = r.listing;
          const facts = l ? [usdFull(l.list_price), l.bedrooms_total ? `${l.bedrooms_total} bd` : "", l.bathrooms_total ? `${l.bathrooms_total} ba` : "", l.city ?? ""].filter(Boolean).join(" · ") : "";
          const extra = mode === "showings" ? ` · wants ${(r as BAShowing).preferred_times || "—"} · ${(r as BAShowing).status || "new"}` : "";
          return {
            key: `h${r.id}`,
            title: l?.unparsed_address || r.listing_key || "Home",
            href: r.listing_key ? `/listings/${r.listing_key}` : undefined,
            sub: facts + extra,
            when: r.created_at,
          };
        }),
      });
    }
    return out;
  }, [mode, favorites, showings, searches, who]);

  const allCities = useMemo(() => [...new Set(rows.flatMap((r) => r.allCities))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const lo = Number(minPrice) || 0;
    const hi = Number(maxPrice) || 0;
    const mb = Number(minBeds) || 0;
    const mc = Number(minCount) || 0;
    const cutoff = since ? Date.now() - Number(since) * DAY : 0;
    const list = rows.filter((r) => {
      if (needle && !`${r.name ?? ""} ${r.email} ${r.phone ?? ""}`.toLowerCase().includes(needle)) return false;
      if (city && !r.allCities.includes(city)) return false;
      // Price: overlap their range with the filter range.
      if (lo && (r.priceHi ?? r.priceAvg ?? 0) < lo) return false;
      if (hi && (r.priceLo ?? r.priceAvg ?? Infinity) > hi) return false;
      if (mb && (r.beds ?? 0) < mb) return false;
      if (mc && r.count < mc) return false;
      if (cutoff && new Date(r.lastAt).getTime() < cutoff) return false;
      return true;
    });
    const by: Record<string, (a: Row, b: Row) => number> = {
      recent: (a, b) => (a.lastAt < b.lastAt ? 1 : -1),
      count: (a, b) => b.count - a.count || (a.lastAt < b.lastAt ? 1 : -1),
      price: (a, b) => (b.priceAvg ?? 0) - (a.priceAvg ?? 0),
      name: (a, b) => (a.name || a.email).localeCompare(b.name || b.email),
    };
    return list.sort(by[sort] ?? by.recent);
  }, [rows, q, city, minPrice, maxPrice, minBeds, minCount, since, sort]);

  const noun = mode === "favorites" ? "homes saved" : mode === "showings" ? "showing requests" : "saved searches";
  const total = filtered.reduce((a, r) => a + r.count, 0);
  const priceAvgAll = avg(nums(filtered.map((r) => r.priceAvg)));
  const bedsAll = avg(nums(filtered.map((r) => r.beds)));
  const bathsAll = avg(nums(filtered.map((r) => r.baths)));
  const topCity = topCities(filtered.flatMap((r) => r.cities), 1)[0];
  const contacts = filtered.map((r) => ({ email: r.email, name: r.name, phone: r.phone }));
  const reset = () => { setQ(""); setCity(""); setMinPrice(""); setMaxPrice(""); setMinBeds(""); setMinCount(""); setSince(""); setSort("recent"); };
  const filtersOn = !!(q || city || minPrice || maxPrice || minBeds || minCount || since);

  return (
    <div className="ba">
      <div className="ba-tiles">
        <div className="ba-tile"><b>{filtered.length}</b><span>{filtered.length === 1 ? "person" : "people"}</span></div>
        <div className="ba-tile"><b>{total}</b><span>{noun}</span></div>
        <div className="ba-tile"><b>{one(filtered.length ? total / filtered.length : null)}</b><span>per person</span></div>
        <div className="ba-tile"><b>{k(priceAvgAll)}</b><span>{mode === "searches" ? "typical budget" : "avg price"}</span></div>
        <div className="ba-tile"><b>{one(bedsAll)} / {one(bathsAll)}</b><span>{mode === "searches" ? "beds / baths wanted" : "avg beds / baths"}</span></div>
        <div className="ba-tile"><b>{topCity ?? "—"}</b><span>top city</span></div>
      </div>

      <div className="ba-filters">
        <input className="ba-in ba-in--wide" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="ba-in" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {allCities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="ba-in ba-in--num" inputMode="numeric" placeholder="Min $" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))} />
        <input className="ba-in ba-in--num" inputMode="numeric" placeholder="Max $" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))} />
        <select className="ba-in" value={minBeds} onChange={(e) => setMinBeds(e.target.value)}>
          <option value="">Any beds</option>
          {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+ beds</option>)}
        </select>
        <select className="ba-in" value={minCount} onChange={(e) => setMinCount(e.target.value)}>
          <option value="">Any amount</option>
          {[2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}+ {mode === "favorites" ? "saved" : mode === "showings" ? "requests" : "searches"}</option>)}
        </select>
        <select className="ba-in" value={since} onChange={(e) => setSince(e.target.value)}>
          <option value="">Any time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <select className="ba-in" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Most recent</option>
          <option value="count">Most {mode === "favorites" ? "saved" : mode === "showings" ? "requests" : "searches"}</option>
          <option value="price">Highest price</option>
          <option value="name">Name A–Z</option>
        </select>
        {filtersOn && <button className="ba-clear" onClick={reset}>Clear</button>}
      </div>

      {filtered.length === 0 ? (
        <p className="admin__empty">{rows.length === 0 ? `No ${noun} yet.` : "No one matches those filters."}</p>
      ) : (
        <ul className="ba-list">
          {filtered.map((r) => {
            const isOpen = open === r.email.toLowerCase();
            return (
              <li key={r.email} className={`ba-card${isOpen ? " is-open" : ""}`}>
                <button className="ba-head" onClick={() => setOpen(isOpen ? null : r.email.toLowerCase())}>
                  <div className="ba-who">
                    <strong>{r.name || r.email}</strong>
                    <span>{r.phone ? `${r.phone} · ` : ""}{r.email}</span>
                  </div>
                  <div className="ba-stats">
                    <div><b>{r.count}</b><span>{mode === "favorites" ? "saved" : mode === "showings" ? "requests" : "searches"}</span></div>
                    <div><b>{mode === "searches" || r.priceLo === r.priceHi ? range(r.priceLo, r.priceHi) : range(r.priceLo, r.priceHi)}</b><span>{mode === "searches" ? "budget" : r.count > 1 ? `avg ${k(r.priceAvg)}` : "price"}</span></div>
                    <div><b>{one(r.beds)} bd · {one(r.baths)} ba</b><span>{mode === "searches" ? "wanted" : "avg"}</span></div>
                    <div><b>{r.cities.length ? r.cities.join(", ") : "—"}</b><span>{r.cities.length > 1 ? "cities" : "city"}</span></div>
                  </div>
                  <div className="ba-when">
                    {r.badge && <span className="adm-chip adm-chip--gold">{r.badge}</span>}
                    <span>{ago(r.lastAt)}</span>
                    <i aria-hidden="true">{isOpen ? "▾" : "▸"}</i>
                  </div>
                </button>
                {isOpen && (
                  <div className="ba-body">
                    <ul>
                      {r.items.map((it) => (
                        <li key={it.key}>
                          <div>
                            {it.href ? <a href={it.href} target="_blank" rel="noreferrer">{it.title}</a> : <strong>{it.title}</strong>}
                            <span>{it.sub}</span>
                          </div>
                          <time>{fmtDate(it.when)}</time>
                        </li>
                      ))}
                    </ul>
                    <button className="btn btn--primary ba-open" onClick={() => onOpen({ email: r.email, name: r.name, phone: r.phone }, contacts)}>
                      Open contact record
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
