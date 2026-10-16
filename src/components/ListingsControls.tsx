"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Persistent filter sidebar for the IDX search page. Always visible on
// desktop; collapses behind a "Filters" toggle on mobile. All state lives in
// the URL query string — this composes it and navigates; the server component
// does the actual filtering.

export interface ListingFilters {
  q: string;
  city: string; // the single selected city ("" when none or several) — kept for pages that expect one
  cities: string[]; // every selected city (multi-select)
  beds: number;
  baths: number;
  type: string;
  builder: string;
  status: string;
  minPrice: number;
  maxPrice: number;
  minSqft: number;
  maxSqft: number;
  year: number;
  features: string[];
  zip: string;
  neighborhood: string;
  sort: string;
}

export interface AreaOption {
  slug: string;
  name: string;
}

export const CITIES = [
  "Lake Charles", "Sulphur", "Moss Bluff", "Iowa", "Vinton", "Cameron",
  "Ragley", "DeQuincy", "DeRidder", "Jennings", "Welsh", "Carlyss", "Westlake",
];
export const TYPES = ["Single Family", "Multi-Family", "New Construction", "Land", "Mobile / Manufactured"];
export const BUILDER_OPTIONS = ["DSLD Homes", "D.R. Horton"];
export const STATUSES = ["Active", "Pending"];
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

export default function ListingsControls({
  filters,
  total,
  neighborhoods = [],
  zips = [],
}: {
  filters: ListingFilters;
  total: number;
  neighborhoods?: AreaOption[];
  zips?: AreaOption[];
}) {
  const router = useRouter();
  const [f, setF] = useState<ListingFilters>(filters);
  const [open, setOpen] = useState(false); // mobile show/hide

  function apply(next: ListingFilters) {
    const p = new URLSearchParams();
    if (next.q) p.set("q", next.q);
    for (const c of next.cities) p.append("city", c);
    if (next.beds) p.set("beds", String(next.beds));
    if (next.baths) p.set("baths", String(next.baths));
    if (next.type) p.set("type", next.type);
    if (next.builder) p.set("builder", next.builder);
    if (next.status) p.set("status", next.status);
    if (next.minPrice > 0) p.set("minPrice", String(next.minPrice));
    if (next.maxPrice < PRICE_MAX) p.set("maxPrice", String(next.maxPrice));
    if (next.minSqft > 0) p.set("minSqft", String(next.minSqft));
    if (next.maxSqft < SQFT_MAX) p.set("maxSqft", String(next.maxSqft));
    if (next.year) p.set("year", String(next.year));
    for (const ft of next.features) p.append("feature", ft);
    if (next.zip) p.set("zip", next.zip);
    if (next.neighborhood) p.set("neighborhood", next.neighborhood);
    if (next.sort && next.sort !== "new") p.set("sort", next.sort);
    router.push(`/homes-for-sale${p.toString() ? `?${p}` : ""}`, { scroll: false });
  }

  // Update + navigate immediately (used by selects, pills, checkboxes).
  function setApply<K extends keyof ListingFilters>(key: K, val: ListingFilters[K]) {
    const next = { ...f, [key]: val };
    setF(next);
    apply(next);
  }
  function toggleCity(c: string) {
    const cities = f.cities.includes(c) ? f.cities.filter((x) => x !== c) : [...f.cities, c];
    const next = { ...f, cities, city: cities.length === 1 ? cities[0] : "" };
    setF(next);
    apply(next);
  }
  function toggleFeature(key: string) {
    const features = f.features.includes(key)
      ? f.features.filter((x) => x !== key)
      : [...f.features, key];
    setApply("features", features);
  }

  const empty: ListingFilters = {
    q: "", city: "", cities: [], beds: 0, baths: 0, type: "", builder: "", status: "",
    minPrice: 0, maxPrice: PRICE_MAX, minSqft: 0, maxSqft: SQFT_MAX,
    year: 0, features: [], zip: "", neighborhood: "", sort: f.sort,
  };
  function resetAll() {
    setF(empty);
    apply(empty);
  }

  let active = 0;
  if (f.q) active++;
  active += f.cities.length;
  if (f.neighborhood) active++;
  if (f.zip) active++;
  if (f.beds) active++;
  if (f.baths) active++;
  if (f.type) active++;
  if (f.builder) active++;
  if (f.status) active++;
  if (f.year) active++;
  if (f.minPrice > 0 || f.maxPrice < PRICE_MAX) active++;
  if (f.minSqft > 0 || f.maxSqft < SQFT_MAX) active++;
  active += f.features.length;

  const numOr = (v: string, fb: number) => (v === "" ? fb : Number(v));

  return (
    <>
      <button className="filters__toggle" onClick={() => setOpen((o) => !o)}>
        &#9776; Filters{active ? ` (${active})` : ""}
      </button>

      <aside className={`filters${open ? " open" : ""}`} aria-label="Filters">
        <div className="filters__head">
          <span>Filters</span>
          {active > 0 && <button className="filters__reset" onClick={resetAll}>Reset all</button>}
        </div>

        <div className="fgroup">
          <span className="fgroup__label">Price Range</span>
          <div className="fnum">
            <input type="number" placeholder="No min" step={10000} defaultValue={f.minPrice || ""}
              onBlur={(e) => setApply("minPrice", numOr(e.target.value, 0))} />
            <input type="number" placeholder="No max" step={10000} defaultValue={f.maxPrice < PRICE_MAX ? f.maxPrice : ""}
              onBlur={(e) => setApply("maxPrice", numOr(e.target.value, PRICE_MAX))} />
          </div>
        </div>

        <div className="fgroup">
          <span className="fgroup__label">Square Feet</span>
          <div className="fnum">
            <input type="number" placeholder="No min" step={100} defaultValue={f.minSqft || ""}
              onBlur={(e) => setApply("minSqft", numOr(e.target.value, 0))} />
            <input type="number" placeholder="No max" step={100} defaultValue={f.maxSqft < SQFT_MAX ? f.maxSqft : ""}
              onBlur={(e) => setApply("maxSqft", numOr(e.target.value, SQFT_MAX))} />
          </div>
        </div>

        <div className="fgroup">
          <span className="fgroup__label">Bedrooms</span>
          <div className="pills">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={f.beds === n ? "on" : ""} onClick={() => setApply("beds", n)}>
                {n === 0 ? "Any" : `${n}+`}
              </button>
            ))}
          </div>
        </div>

        <div className="fgroup">
          <span className="fgroup__label">Bathrooms</span>
          <div className="pills">
            {[0, 1, 2, 3, 4].map((n) => (
              <button key={n} className={f.baths === n ? "on" : ""} onClick={() => setApply("baths", n)}>
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
                onClick={() => setApply("type", f.type === t ? "" : t)}>{t}</button>
            ))}
          </div>
        </div>

        <div className="fgroup">
          <span className="fgroup__label">Builder</span>
          <div className="pills">
            {BUILDER_OPTIONS.map((b) => (
              <button key={b} className={f.builder === b ? "on" : ""}
                onClick={() => setApply("builder", f.builder === b ? "" : b)}>{b}</button>
            ))}
          </div>
        </div>

        <div className="fgroup">
          <span className="fgroup__label">Status</span>
          <div className="pills">
            {STATUSES.map((s) => (
              <button key={s} className={f.status === s ? "on" : ""}
                onClick={() => setApply("status", f.status === s ? "" : s)}>{s}</button>
            ))}
          </div>
        </div>

        <div className="fgroup">
          <span className="fgroup__label">City <em className="fgroup__hint">(pick one or more)</em></span>
          <div className="pills">
            {CITIES.map((c) => (
              <button key={c} type="button" aria-pressed={f.cities.includes(c)} className={f.cities.includes(c) ? "on" : ""}
                onClick={() => toggleCity(c)}>{c}</button>
            ))}
          </div>
        </div>

        {neighborhoods.length > 0 && (
          <div className="fgroup">
            <span className="fgroup__label">Neighborhood</span>
            <div className="qsel" style={{ width: "100%" }}>
              <select value={f.neighborhood} style={{ width: "100%" }} onChange={(e) => setApply("neighborhood", e.target.value)}>
                <option value="">Any Neighborhood</option>
                {neighborhoods.map((n) => <option key={n.slug} value={n.slug}>{n.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {zips.length > 0 && (
          <div className="fgroup">
            <span className="fgroup__label">ZIP Code</span>
            <div className="qsel" style={{ width: "100%" }}>
              <select value={f.zip} style={{ width: "100%" }} onChange={(e) => setApply("zip", e.target.value)}>
                <option value="">Any ZIP</option>
                {zips.map((z) => <option key={z.slug} value={z.slug}>{z.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="fgroup">
          <span className="fgroup__label">Year Built (min)</span>
          <div className="qsel" style={{ width: "100%" }}>
            <select value={f.year} style={{ width: "100%" }} onChange={(e) => setApply("year", Number(e.target.value))}>
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

        <button className="btn btn--primary filters__apply" onClick={() => { apply(f); setOpen(false); }}>
          Show {total.toLocaleString()} homes
        </button>
      </aside>
    </>
  );
}
