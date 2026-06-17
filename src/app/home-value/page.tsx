"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";

interface GeoResult { address: string; street?: string; lat: number | null; lng: number | null; city: string; state: string; zip: string }
interface Estimate {
  comp_count: number; basis?: string; ppsf_median?: number;
  est_low?: number; est_median?: number; est_high?: number; median_sold_price?: number;
}

const usd = (n?: number) => (n || n === 0 ? "$" + Math.round(n).toLocaleString("en-US") : "—");
const STEP_LABELS = ["Your address", "About your home", "A few details", "Where to send it"];

export default function HomeValuePage() {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeoResult[]>([]);
  const [picked, setPicked] = useState<GeoResult | null>(null);
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [year, setYear] = useState("");
  const [condition, setCondition] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [notes, setNotes] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Estimate | null>(null);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onAddressChange(v: string) {
    setQuery(v); setPicked(null); setErr("");
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 3) { setCandidates([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(v)}`);
        const data = await res.json();
        setCandidates(data.results ?? []);
      } catch { setCandidates([]); }
    }, 400);
  }

  // Prepend the house number the user typed (the geocoder label never has one),
  // so both the suggestions and the saved address always show the full street.
  function composeAddress(c: GeoResult) {
    const m = query.trim().match(/^\s*(\d+[A-Za-z-]*)\b/);
    return m && !/^\d/.test(c.address) ? `${m[1]} ${c.address}` : c.address;
  }

  function pick(c: GeoResult) {
    const addr = composeAddress(c);
    setPicked({ ...c, address: addr });
    setQuery(addr);
    setCandidates([]);
    setErr("");
    // Selecting an address moves them straight into the next step.
    setStep(2);
  }

  function next() {
    setErr("");
    if (step === 1) {
      if (!picked?.city) { setErr("Pick your address from the suggestions so we know the city."); return; }
      setStep(2); return;
    }
    if (step === 4) { submit(); return; }
    setStep((s) => s + 1);
  }
  function back() { setErr(""); setStep((s) => Math.max(1, s - 1)); }

  async function submit() {
    if (!firstName || !lastName || !email || !phone) { setErr("Please add your name, email, and phone to get your report."); return; }
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    setLoading(true);
    let est: Estimate | null = null;
    try {
      const res = await fetch("/api/valuation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: picked!.city, zip: picked!.zip || undefined,
          livingArea: sqft ? Number(sqft.replace(/[^0-9.]/g, "")) : undefined,
          beds: beds ? Number(beds) : undefined,
          baths: baths ? Number(baths) : undefined,
          lat: typeof picked!.lat === "number" ? picked!.lat : undefined,
          lng: typeof picked!.lng === "number" ? picked!.lng : undefined,
        }),
      });
      if (res.ok) est = await res.json();
    } catch { /* still capture the lead */ }
    try {
      await fetch("/api/forms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: "home_valuation", name, first_name: firstName, last_name: lastName, email, phone,
          message: `Home valuation request for ${picked!.address}`,
          criteria: {
            first_name: firstName, last_name: lastName,
            address: picked!.address, city: picked!.city, zip: picked!.zip,
            beds, baths, sqft, year, condition, timeframe, notes,
            estimate: est && est.comp_count > 0
              ? { low: est.est_low, median: est.est_median, high: est.est_high, comps: est.comp_count } : null,
          },
          source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
    } catch { /* non-fatal */ }
    setResult(est); setDone(true); setLoading(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = 612;
    const teal: [number, number, number] = [32, 72, 96];
    const aqua: [number, number, number] = [97, 193, 204];
    const ink: [number, number, number] = [50, 60, 67];
    doc.setFillColor(...teal); doc.rect(0, 0, W, 92, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text(site.name, 40, 44);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...aqua);
    doc.text("Home Value Estimate", 40, 66);
    doc.setTextColor(210, 230, 235); doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 40, 82);
    let y = 130;
    doc.setTextColor(...ink); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(picked?.address ?? query, 40, y); y += 30;
    if (result && result.comp_count > 0) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(110, 120, 127);
      doc.text("Estimated value range", 40, y); y += 26;
      doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(...teal);
      doc.text(`${usd(result.est_low)}  -  ${usd(result.est_high)}`, 40, y); y += 26;
      doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(...ink);
      doc.text(`Most likely around ${usd(result.est_median)}`, 40, y); y += 30;
      doc.setFontSize(10); doc.setTextColor(110, 120, 127);
      doc.text(
        `Based on the ${result.comp_count} most comparable sales in ${picked?.city} over the last 6 months` +
        (result.ppsf_median ? ` (median ${usd(result.ppsf_median)}/sq ft).` : "."),
        40, y, { maxWidth: W - 80 }); y += 30;
    }
    doc.setDrawColor(225, 233, 237); doc.line(40, y, W - 40, y); y += 22;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...teal);
    doc.text("Home details you provided", 40, y); y += 18;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...ink);
    for (const [k, v] of [
      ["Bedrooms", beds || "—"], ["Bathrooms", baths || "—"],
      ["Living area", sqft ? `${sqft} sq ft` : "—"], ["Year built", year || "—"],
      ["Condition", condition || "—"], ["Timeframe to sell", timeframe || "—"],
    ]) { doc.text(`${k}: ${v}`, 40, y); y += 16; }
    y += 12; doc.setFillColor(244, 247, 250); doc.rect(40, y, W - 80, 72, "F");
    doc.setFontSize(8.5); doc.setTextColor(110, 120, 127);
    doc.text(
      "This is an automated estimate based on recent comparable sales and is NOT an appraisal or a formal " +
      "opinion of value. Your home's condition, upgrades, location, and current demand can move the figure " +
      "meaningfully. For your home's exact value, schedule a free, no-obligation consultation with " +
      "The Land & Home Group.", 48, y + 18, { maxWidth: W - 96 }); y += 92;
    doc.setTextColor(...teal); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(`Schedule your free consultation:  ${site.phone}`, 40, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(110, 120, 127);
    doc.text(`${site.name} · ${site.brokerage} · ${site.serviceArea}`, 40, y + 16);
    const safe = (picked?.address ?? "home").replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
    doc.save(`Home-Value-Estimate-${safe}.pdf`);
  }

  const hasEstimate = result && result.comp_count > 0;
  const greetName = firstName.trim();

  return (
    <>
      <header className="hero hero--index hvhero">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; Home Value
          </nav>
          {!done ? (
            <>
              <span className="hero__script">what&apos;s my home worth?</span>
              <h1>Find Out What Your Home Is Worth — Free</h1>
              <p className="hero__sub">
                Get a data-driven value range in seconds, built from the most comparable homes that have
                actually sold near you in the last six months. No pressure, no obligation — just real numbers
                from real Southwest Louisiana sales.
              </p>
            </>
          ) : (
            <>
              <span className="hero__script">your report is ready</span>
              <h1>Home Value Estimate</h1>
              <p className="hero__sub">{picked?.address}</p>
            </>
          )}
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap" style={{ maxWidth: 760 }}>
          {/* ---- one unified wizard card ---- */}
          {!done && (
            <div className="hv-card">
              <div className="wiz__head">
                <div className="wiz__bar"><div className="wiz__fill" style={{ width: `${(step / 4) * 100}%` }} /></div>
                <div className="wiz__label">Step {step} of 4 · {STEP_LABELS[step - 1]}</div>
              </div>

              {step >= 2 && picked && (
                <div className="hv-confirm">
                  <span className="hv-confirm__addr">📍 {picked.address}</span>
                  <button type="button" className="hv-confirm__change" onClick={() => setStep(1)}>Change</button>
                </div>
              )}

              {step === 1 && (
                <div className="wiz__step">
                  <h2 className="wiz__q">Let&apos;s start with your address</h2>
                  <div className="field" style={{ position: "relative", marginBottom: 8 }}>
                    <div className="hv-addr">
                      <svg className="hv-addr__pin" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                        <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
                      </svg>
                      <input className="hv-addr__input" type="text" autoComplete="off" placeholder="Start typing your home address…"
                        value={query} onChange={(e) => onAddressChange(e.target.value)} autoFocus />
                    </div>
                    {candidates.length > 0 && (
                      <div className="hv-suggest">
                        {candidates.map((c, i) => (<button type="button" key={i} onClick={() => pick(c)}>{composeAddress(c)}</button>))}
                      </div>
                    )}
                  </div>
                  <p className="hv-fine">Choose your home from the list and we&apos;ll jump to the next step. 100% free · no obligation · about a minute.</p>
                </div>
              )}

              {step === 2 && (
                <div className="wiz__step">
                  <h2 className="wiz__q">Tell us about your home</h2>
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
                  <p className="hv-fine">Square footage gives the most accurate estimate, but you can skip what you don&apos;t know.</p>
                </div>
              )}

              {step === 3 && (
                <div className="wiz__step">
                  <h2 className="wiz__q">A few more details</h2>
                  <div className="hv-grid hv-grid--2">
                    <div className="field"><label>Condition</label>
                      <div className="qsel" style={{ width: "100%" }}>
                        <select value={condition} style={{ width: "100%" }} onChange={(e) => setCondition(e.target.value)}>
                          <option value="">Select…</option>
                          <option>Excellent / updated</option><option>Good</option><option>Average</option><option>Needs work</option>
                        </select></div></div>
                    <div className="field"><label>When are you thinking of selling?</label>
                      <div className="qsel" style={{ width: "100%" }}>
                        <select value={timeframe} style={{ width: "100%" }} onChange={(e) => setTimeframe(e.target.value)}>
                          <option value="">Select…</option>
                          <option>Just curious</option><option>0–3 months</option><option>3–6 months</option>
                          <option>6–12 months</option><option>Already listed</option>
                        </select></div></div>
                  </div>
                  <div className="field"><label>Anything we should know? (optional)</label>
                    <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Recent renovations, lot size, condition notes…" /></div>
                </div>
              )}

              {step === 4 && (
                <div className="wiz__step">
                  <h2 className="wiz__q">Where should we send your report?</h2>
                  <div className="hv-grid hv-grid--2">
                    <div className="field"><label>First Name</label>
                      <input className="input" type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                    <div className="field"><label>Last Name</label>
                      <input className="input" type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
                  </div>
                  <div className="hv-grid hv-grid--2">
                    <div className="field"><label>Email</label>
                      <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    <div className="field"><label>Phone</label>
                      <input className="input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
                  </div>
                  <p className="hv-fine">By submitting you agree to be contacted by The Land &amp; Home Group about your home. Consent is not a condition of any purchase or sale.</p>
                </div>
              )}

              {err && <p className="hv-err">{err}</p>}
              <div className="wiz__nav">
                {step > 1 ? <button type="button" className="btn btn--ghost" onClick={back}>Back</button> : <span />}
                {step === 1 ? (
                  <button type="button" className="btn btn--primary" onClick={next} disabled={!picked}>Continue</button>
                ) : (
                  <button type="button" className="btn btn--primary" onClick={next} disabled={loading}>
                    {step === 4 ? (loading ? "Building your report…" : "Get My Home Value Report") : "Next"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ---- result ---- */}
          {done && (
            <div className="hv-thanks">
              <div className="hv-result">
                <span className="script" style={{ fontSize: "1.6rem" }}>thank you{greetName ? `, ${greetName}` : ""}!</span>
                {hasEstimate ? (
                  <>
                    <div className="hv-mid" style={{ marginTop: 8 }}>Your estimated value range</div>
                    <div className="hv-range">{usd(result!.est_low)} – {usd(result!.est_high)}</div>
                    <div className="hv-mid">Most likely around <strong>{usd(result!.est_median)}</strong></div>
                    <div className="hv-stats">
                      <div><b>{result!.comp_count}</b><span>comparable sales</span></div>
                      {result!.ppsf_median ? <div><b>{usd(result!.ppsf_median)}</b><span>median $/sq ft</span></div> : null}
                      <div><b>6 mo</b><span>recent sales</span></div>
                    </div>
                  </>
                ) : (
                  <p className="prose" style={{ marginTop: 10 }}>
                    We&apos;ve got your details. There aren&apos;t enough recent comparable sales near your
                    address for an automated range, so we&apos;ll prepare a personalized valuation by hand.
                  </p>
                )}
                <p className="hv-disclaimer">
                  Remember: this is an <strong>automated estimate only</strong> — not an appraisal or a formal
                  opinion of value. Your home&apos;s condition, upgrades, and current demand can change the
                  number significantly. <strong>To get your exact numbers, schedule an appointment</strong> for
                  a free, no-obligation consultation.
                </p>
                <div className="hv-cta-row">
                  <a className="btn btn--aqua" href={site.phoneHref}>Schedule an Appointment · {site.phone}</a>
                  {hasEstimate && <button className="btn btn--hollow-teal" onClick={downloadPdf}>Download PDF Report</button>}
                </div>
              </div>
              {picked?.city && (
                <p style={{ textAlign: "center", marginTop: 18 }}>
                  <Link className="seo-seeall" href={`/listings?city=${encodeURIComponent(picked.city)}`}>
                    See what&apos;s for sale in {picked.city} &rarr;
                  </Link>
                </p>
              )}
            </div>
          )}

          {/* ---- marketing copy (always under the card until they finish) ---- */}
          {!done && (
            <>
              <section className="hv-how">
                <span className="section__script script">how it works</span>
                <h2 className="section__title">Your home value in three quick steps</h2>
                <div className="hv-steps">
                  <div className="hv-step">
                    <div className="hv-step__n">1</div>
                    <h3>Enter your address</h3>
                    <p>Type it in above and pick your home from the list. That tells us exactly which neighborhood and market to analyze.</p>
                  </div>
                  <div className="hv-step">
                    <div className="hv-step__n">2</div>
                    <h3>Tell us about your home</h3>
                    <p>A few quick details — beds, baths, square footage, and condition — sharpen the estimate so it reflects <em>your</em> home.</p>
                  </div>
                  <div className="hv-step">
                    <div className="hv-step__n">3</div>
                    <h3>Get your value range</h3>
                    <p>We instantly compare the most similar recent sales near you and hand you a value range plus a downloadable report.</p>
                  </div>
                </div>
              </section>

              <section className="hv-why">
                <div className="hv-why__copy">
                  <span className="section__script script">why it matters</span>
                  <h2 className="section__title">Real local sales — not a national guess</h2>
                  <p className="prose">
                    Most online estimators run your address through a one-size-fits-all national model. Ours is
                    different. We pull from homes that have <strong>actually closed in Southwest Louisiana over
                    the last six months</strong> and weight the ones most like yours — similar size, bedroom
                    count, and ZIP code — so the range reflects what buyers here are truly paying right now.
                  </p>
                  <p className="prose">
                    Whether you&apos;re thinking about selling this year, refinancing, or just curious how much
                    equity you&apos;ve built, it&apos;s a smart, no-pressure first step. And when you&apos;re
                    ready for an exact figure, we&apos;ll walk your home in person — free.
                  </p>
                </div>
                <ul className="hv-why__list">
                  <li><b>Built on recent SWLA sales</b><span>The last 6 months, filtered to homes like yours.</span></li>
                  <li><b>Instant &amp; private</b><span>Your range in seconds, your details kept confidential.</span></li>
                  <li><b>Downloadable report</b><span>A clean PDF you can save, print, or share.</span></li>
                  <li><b>A real human follow-up</b><span>Want exact numbers? We&apos;ll do a free in-home valuation.</span></li>
                </ul>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
