"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Interactive filter UI for the IDX search page: the quick bar, the slide-in
// "All Filters" panel, and the active-filter chips. All state lives in the URL
// query string — this component just composes it and pushes. The server
// component (app/listings/page.tsx) does the actual Supabase filtering, so
// results stay correct across all 3,000+ listings (no client-side array).

export interface ListingFilters {
  q: string;
  city: string;
  beds: number;
  baths: number;
  type: string;
  status: string;
  minPrice: number;
  maxPrice: number;
  minSqft: number;
  maxSqft: number;
  year: number;
  features: string[];
  sort: string;
}

export const CITIES = [
  "Lake Charles", "Sulphur", "Moss Bluff", "Iowa", "Vinton", "Cameron",
  "Ragley", "DeQuincy", "DeRidder", "Jennings", "Welsh", "Carlyss", "Westlake",
];
export const TYPES = ["Single Family", "Multi-Family", "New Construction", "Land"];
export const STATUSES = ["Active", "Pending"];
// Feature keys map to indexed boolean columns in Supabase (see lib/types.ts).
export const FEATURES: { key: string; label: string }[] = [
  { key: "pool", label: "Pool" },
  { key: "garage", label: "Garage" },
  { key: "waterfront", label: "Waterfront" },
  { key: "fireplace", label: "Fireplace" },
  { key: "new_construction", label: "New Construction" },
  { key: "updated", label: "Updated / Remodeled" },
  { key: "single_story", label: "Single Story" },
  { key: "acre_plus", label: "Acre+ Lot" },
];

const PRICE_MAX = 1_000_000;
const SQFT_MAX = 5_000;

function priceLbl(n: number) {
  return n >= PRICE_MAX ? "$1,000,000+" : "$" + n.toLocaleString();
}
function sqftLbl(n: number) {
  return n >= SQFT_MAX ? "5,000+ sqft" : n.toLocaleString();
}

export default function ListingsControls({
  filters,
  total,
}: {
  filters: ListingFilters;
  total: number;
}) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [f, setF] = useState<ListingFilters>(filters);

  // Build the query string from a filter set and navigate. Always resets to
  // page 1 (filters changed → new result set).
  function apply(next: ListingFilters) {
    const p = new URLSearchParams();
    if (next.q) p.set("q", next.q);
    if (next.city) p.set("city", next.city);
    if (next.beds) p.set("beds", String(next.beds));
    if (next.baths) p.set("baths", String(next.baths));
    if (next.type) p.set("type", next.type);
    if (next.status) p.set("status", next.status);
    if (next.minPrice > 0) p.set("minPrice", String(next.minPrice));
    if (next.maxPrice < PRICE_MAX) p.set("maxPrice", String(next.maxPrice));
    if (next.minSqft > 0) p.set("minSqft", String(next.minSqft));
    if (next.maxSqft < SQFT_MAX) p.set("maxSqft", String(next.maxSqft));
    if (next.year) p.set("year", String(next.year));
    for (const ft of next.features) p.append("feature", ft);
    if (next.sort && next.sort !== "new") p.set("sort", next.sort);
    router.push(`/listings${p.toString() ? `?${p}` : ""}`);
  }

  function set<K extends keyof ListingFilters>(key: K, val: ListingFilters[K]) {
    setF((prev) => ({ ...prev, [key]: val }));
  }
  // Quick-bar controls apply immediately; panel controls wait for "Apply".
  function setAndApply<K extends keyof ListingFilters>(key: K, val: ListingFilters[K]) {
    const next = { ...f, [key]: val };
    setF(next);
    apply(next);
  }

  function toggleFeature(key: string) {
    set("features", f.features.includes(key) ? f.features.filter((x) => x !== key) : [...f.features, key]);
  }

  const empty: ListingFilters = {
    q: "", city: "", beds: 0, baths: 0, type: "", status: "",
    minPrice: 0, maxPrice: PRICE_MAX, minSqft: 0, maxSqft: SQFT_MAX,
    year: 0, features: [], sort: "new",
  };
  function resetAll() {
    setF(empty);
    apply(empty);
  }

  // Active-filter count for the "All Filters" badge.
  let badge = 0;
  if (f.city) badge++;
  if (f.year) badge++;
  if (f.status) badge++;
  if (f.type) badge++;
  if (f.minPrice > 0 || f.maxPrice < PRICE_MAX) badge++;
  if (f.minSqft > 0 || f.maxSqft < SQFT_MAX) badge++;
  badge += f.features.length;

  // Build chip list: [label, onRemove].
  const chips: [string, () => void][] = [];
  if (f.q) chips.push([`Search: "${f.q}"`, () => setAndApply("q", "")]);
  if (f.city) chips.push([f.city, () => setAndApply("city", "")]);
  if (f.beds) chips.push([`${f.beds}+ beds`, () => setAndApply("beds", 0)]);
  if (f.baths) chips.push([`${f.baths}+ baths`, () => setAndApply("baths", 0)]);
  if (f.type) chips.push([f.type, () => setAndApply("type", "")]);
  if (f.status) chips.push([f.status, () => setAndApply("status", "")]);
  if (f.year) chips.push([`${f.year}+ built`, () => setAndApply("year", 0)]);
  if (f.minPrice > 0 || f.maxPrice < PRICE_MAX)
    chips.push([`${priceLbl(f.minPrice)} – ${priceLbl(f.maxPrice)}`, () => {
      const next = { ...f, minPrice: 0, maxPrice: PRICE_MAX };
      setF(next); apply(next);
    }]);
  if (f.minSqft > 0 || f.maxSqft < SQFT_MAX)
    chips.push([`${sqftLbl(f.minSqft)} – ${sqftLbl(f.maxSqft)}`, () => {
      const next = { ...f, minSqft: 0, maxSqft: SQFT_MAX };
      setF(next); apply(next);
    }]);
  for (const ft of f.features) {
    const label = FEATURES.find((x) => x.key === ft)?.label ?? ft;
    chips.push([label, () => setAndApply("features", f.features.filter((x) => x !== ft))]);
  }

  const numOr = (v: string, fallback: number) => (v === "" ? fallback : Number(v));

  return (
    <>
      <div className="filterwrap">
        <div className="qbar">
          <div className="qbar__search">
            <input
              type="text"
              placeholder="Search by address, ZIP, or neighborhood…"
              defaultValue={f.q}
              onKeyDown={(e) => {
                if (e.key === "Enter") setAndApply("q", (e.target as HTMLInputElement).value);
              }}
              onBlur={(e) => {
                if (e.target.value !== f.q) setAndApply("q", e.target.value);
              }}
            />
          </div>
          <div className="qsel">
            <select value={f.beds} onChange={(e) => setAndApply("beds", Number(e.target.value))}>
              <option value={0}>Beds</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <div className="qsel">
            <select value={f.baths} onChange={(e) => setAndApply("baths", Number(e.target.value))}>
              <option value={0}>Baths</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <div className="qsel">
            <select value={f.type} onChange={(e) => setAndApply("type", e.target.value)}>
              <option value="">Any Type</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className={`qbar__more${badge ? " has" : ""}`} onClick={() => setPanelOpen(true)}>
            <span>&#9776;</span> All Filters <span className="badge">{badge}</span>
          </button>
        </div>

        {chips.length > 0 && (
          <div className="chips__row">
            {chips.map(([label, onRemove], i) => (
              <span className="chip" key={i}>
                {label}{" "}
                <button aria-label="Remove" onClick={onRemove}>&times;</button>
              </span>
            ))}
            <button className="chips__clear" onClick={resetAll}>Clear all</button>
          </div>
        )}
      </div>

      {/* Slide-in advanced panel */}
      <div className={`overlay${panelOpen ? " open" : ""}`} onClick={() => setPanelOpen(false)} />
      <aside className={`panel${panelOpen ? " open" : ""}`} aria-label="All filters">
        <div className="panel__head">
          <div>
            <span className="script">refine your</span>
            <h2>All Filters</h2>
          </div>
          <button className="panel__close" onClick={() => setPanelOpen(false)} aria-label="Close">&times;</button>
        </div>
        <div className="panel__body">
          <div className="fgroup">
            <span className="fgroup__label">Price Range</span>
            <div className="fnum">
              <input type="number" placeholder="No min" value={f.minPrice || ""} step={10000}
                onChange={(e) => set("minPrice", numOr(e.target.value, 0))} />
              <input type="number" placeholder="No max" value={f.maxPrice < PRICE_MAX ? f.maxPrice : ""} step={10000}
                onChange={(e) => set("maxPrice", numOr(e.target.value, PRICE_MAX))} />
            </div>
          </div>
          <div className="fgroup">
            <span className="fgroup__label">Square Feet</span>
            <div className="fnum">
              <input type="number" placeholder="No min" value={f.minSqft || ""} step={100}
                onChange={(e) => set("minSqft", numOr(e.target.value, 0))} />
              <input type="number" placeholder="No max" value={f.maxSqft < SQFT_MAX ? f.maxSqft : ""} step={100}
                onChange={(e) => set("maxSqft", numOr(e.target.value, SQFT_MAX))} />
            </div>
          </div>
          <div className="fgroup">
            <span className="fgroup__label">Bedrooms</span>
            <div className="pills">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={f.beds === n ? "on" : ""} onClick={() => set("beds", n)}>
                  {n === 0 ? "Any" : `${n}+`}
                </button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <span className="fgroup__label">Bathrooms</span>
            <div className="pills">
              {[0, 1, 2, 3, 4].map((n) => (
                <button key={n} className={f.baths === n ? "on" : ""} onClick={() => set("baths", n)}>
                  {n === 0 ? "Any" : `${n}+`}
                </button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <span className="fgroup__label">Property Type</span>
            <div className="pills">
              {TYPES.map((t) => (
                <button key={t} className={f.type === t ? "on" : ""}
                  onClick={() => set("type", f.type === t ? "" : t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <span className="fgroup__label">Status</span>
            <div className="pills">
              {STATUSES.map((s) => (
                <button key={s} className={f.status === s ? "on" : ""}
                  onClick={() => set("status", f.status === s ? "" : s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <span className="fgroup__label">Location</span>
            <div className="frow">
              <div className="qsel">
                <select value={f.city} onChange={(e) => set("city", e.target.value)}>
                  <option value="">Any City</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="fgroup">
            <span className="fgroup__label">Year Built (min)</span>
            <div className="qsel" style={{ width: "100%" }}>
              <select value={f.year} style={{ width: "100%" }} onChange={(e) => set("year", Number(e.target.value))}>
                <option value={0}>Any Year</option>
                {[1980, 2000, 2010, 2020].map((y) => <option key={y} value={y}>{y}+</option>)}
              </select>
            </div>
          </div>
          <div className="fgroup">
            <span className="fgroup__label">Must-Have Features</span>
            <div className="checks">
              {FEATURES.map((ft) => (
                <label key={ft.key}>
                  <input type="checkbox" checked={f.features.includes(ft.key)} onChange={() => toggleFeature(ft.key)} />
                  {ft.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="panel__foot">
          <button className="panel__reset" onClick={resetAll}>Reset all</button>
          <button className="panel__apply" onClick={() => { apply(f); setPanelOpen(false); }}>
            Show {total} homes
          </button>
        </div>
      </aside>
    </>
  );
}
