"use client";

import { useRef, useState } from "react";
import Link from "next/link";

interface GeoResult { address: string; lat: number | null; lng: number | null; city: string; state: string; zip: string }
interface Estimate {
  comp_count: number;
  basis?: string;
  ppsf_median?: number;
  est_low?: number; est_median?: number; est_high?: number;
  median_sold_price?: number;
}

const usd = (n?: number) => (n || n === 0 ? "$" + Math.round(n).toLocaleString("en-US") : "—");

export default function HomeValuePage() {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeoResult[]>([]);
  const [picked, setPicked] = useState<GeoResult | null>(null);
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Estimate | null>(null);
  const [err, setErr] = useState("");
  const [leadSent, setLeadSent] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onAddressChange(v: string) {
    setQuery(v);
    setPicked(null);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 5) { setCandidates([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(v)}`);
        const data = await res.json();
        setCandidates(data.results ?? []);
      } catch { setCandidates([]); }
    }, 450);
  }

  function pick(c: GeoResult) {
    setPicked(c);
    setQuery(c.address);
    setCandidates([]);
  }

  async function getEstimate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setResult(null);
    const city = picked?.city || "";
    if (!city) { setErr("Please pick your address from the suggestions so we know the city."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          zip: picked?.zip || undefined,
          livingArea: sqft ? Number(sqft.replace(/[^0-9.]/g, "")) : undefined,
          beds: beds ? Number(beds) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Could not generate an estimate."); }
      else setResult(data);
    } catch { setErr("Something went wrong. Please try again."); }
    setLoading(false);
  }

  async function submitLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_id: "home_valuation",
        name: f.get("name"),
        email: f.get("email"),
        phone: f.get("phone"),
        message: `Home valuation request for ${picked?.address ?? query}`,
        criteria: {
          address: picked?.address ?? query,
          city: picked?.city, zip: picked?.zip,
          beds, baths, sqft, year,
          estimate: result ? { low: result.est_low, median: result.est_median, high: result.est_high } : null,
        },
        source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    });
    if (res.ok) setLeadSent(true);
  }

  const hasEstimate = result && result.comp_count > 0;

  return (
    <>
      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; Home Value
          </nav>
          <span className="hero__script">what&apos;s my home worth?</span>
          <h1>Free Home Value Estimate</h1>
          <p className="hero__sub">
            Get an instant estimate based on recent comparable sales across Southwest Louisiana —
            then talk to a local expert for a precise, professional valuation.
          </p>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="hv-card">
            <form onSubmit={getEstimate}>
              <div className="field" style={{ position: "relative" }}>
                <label>Property Address</label>
                <input
                  className="input" type="text" autoComplete="off"
                  placeholder="Start typing your address…"
                  value={query}
                  onChange={(e) => onAddressChange(e.target.value)}
                />
                {candidates.length > 0 && (
                  <div className="hv-suggest">
                    {candidates.map((c, i) => (
                      <button type="button" key={i} onClick={() => pick(c)}>{c.address}</button>
                    ))}
                  </div>
                )}
                {picked && <div className="hv-picked">✓ {picked.city}, {picked.state} {picked.zip}</div>}
              </div>

              <div className="hv-grid">
                <div className="field"><label>Bedrooms</label>
                  <input className="input" type="number" min={0} value={beds} onChange={(e) => setBeds(e.target.value)} placeholder="3" /></div>
                <div className="field"><label>Bathrooms</label>
                  <input className="input" type="number" min={0} value={baths} onChange={(e) => setBaths(e.target.value)} placeholder="2" /></div>
                <div className="field"><label>Living Area (sq ft)</label>
                  <input className="input" type="number" min={0} value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="2,000" /></div>
                <div className="field"><label>Year Built</label>
                  <input className="input" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2005" /></div>
              </div>

              {err && <p className="hv-err">{err}</p>}
              <button className="btn btn--primary" disabled={loading}>
                {loading ? "Calculating…" : "Get My Estimate"}
              </button>
              <p className="hv-fine">Tip: for the most accurate estimate, pick your address from the suggestions and enter your square footage.</p>
            </form>
          </div>

          {result && !hasEstimate && (
            <div className="hv-result">
              <h2 className="section__title">Not enough recent sales to estimate</h2>
              <p className="prose">We don&apos;t have enough comparable sales near that address to generate an
                automated estimate — but we can still help. Reach out for a personalized valuation.</p>
              <Link className="btn btn--aqua" href="/contact" style={{ maxWidth: 320 }}>Request a Valuation</Link>
            </div>
          )}

          {hasEstimate && (
            <div className="hv-result">
              <span className="script" style={{ fontSize: "1.6rem" }}>your estimated value</span>
              <div className="hv-range">{usd(result!.est_low)} – {usd(result!.est_high)}</div>
              <div className="hv-mid">Most likely around <strong>{usd(result!.est_median)}</strong></div>
              <div className="hv-stats">
                <div><b>{result!.comp_count.toLocaleString()}</b><span>comparable sales</span></div>
                {result!.ppsf_median ? <div><b>{usd(result!.ppsf_median)}</b><span>median $/sq ft</span></div> : null}
                {picked?.city ? <div><b>{picked.city}</b><span>market area</span></div> : null}
              </div>
              <p className="hv-disclaimer">
                This is an automated estimate based on recent comparable sales in the area — not an
                appraisal or a formal opinion of value. Your home&apos;s condition, upgrades, and lot can
                move the number meaningfully. For a precise figure, get a free professional valuation below.
              </p>
              {picked?.city && (
                <Link className="seo-seeall" href={`/listings?city=${encodeURIComponent(picked.city)}`}>
                  See what&apos;s for sale in {picked.city} &rarr;
                </Link>
              )}
            </div>
          )}

          {/* Soft CTA / lead capture */}
          <div className="hv-card hv-lead">
            <span className="script" style={{ fontSize: "1.5rem" }}>the real number</span>
            <h2 className="section__title" style={{ marginTop: 2 }}>Get a professional valuation</h2>
            <p className="prose" style={{ marginTop: 0 }}>
              An automated estimate is a starting point. For a true market value — factoring in your
              updates, condition, and current demand — The Land &amp; Home Group will prepare a free,
              no-obligation comparative market analysis.
            </p>
            {leadSent ? (
              <p className="form__ok">Thanks — we&apos;ll reach out shortly with your personalized valuation.</p>
            ) : (
              <form onSubmit={submitLead}>
                <input className="input" name="name" type="text" placeholder="Full name" required />
                <input className="input" name="phone" type="tel" placeholder="Phone" />
                <input className="input" name="email" type="email" placeholder="Email" required />
                <button className="btn btn--aqua">Request My Free Valuation</button>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
