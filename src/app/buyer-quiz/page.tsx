"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";
import { logActivity } from "@/lib/activity";

const COMMUNITIES = [
  "Lake Charles", "Sulphur", "Moss Bluff", "Iowa", "Vinton", "Cameron",
  "Ragley", "DeQuincy", "DeRidder", "Jennings", "Welsh", "Carlyss", "Westlake",
];

const FEATURES = [
  { key: "pool", label: "Pool or outdoor structures", note: "Pool, shop, covered patio", filter: "pool" },
  { key: "acreage", label: "Acreage / large lot", note: "Room to spread out", filter: "acre_plus" },
  { key: "waterfront", label: "Waterfront", note: "Lake, bayou, or canal", filter: "waterfront" },
  { key: "newconstruction", label: "New construction", note: "Recently built or to-be-built", filter: "new_construction" },
];

const TIMELINES = [
  { key: "now", label: "Ready now", note: "Touring within weeks" },
  { key: "3mo", label: "1–3 months", note: "Getting organized" },
  { key: "6mo", label: "3–6 months", note: "Planning ahead" },
  { key: "browsing", label: "Just exploring", note: "No rush yet" },
];

const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: "Under $150k", max: 150000 },
  { label: "$150k–$250k", min: 150000, max: 250000 },
  { label: "$250k–$350k", min: 250000, max: 350000 },
  { label: "$350k–$500k", min: 350000, max: 500000 },
  { label: "$500k–$750k", min: 500000, max: 750000 },
  { label: "$750k+", min: 750000 },
];

const BEDS = ["1+", "2+", "3+", "4+", "5+"];
const BATHS = ["1+", "2+", "3+", "4+"];
const STEPS = ["intro", "communities", "price", "features", "beds", "baths", "timeline", "contact", "done"] as const;

interface Answers {
  communities: string[]; price: string; features: string[]; timeline: string;
  beds: string; baths: string; firstName: string; lastName: string; email: string; phone: string;
}

export default function BuyerQuizPage() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    communities: [], price: "", features: [], timeline: "",
    beds: "3+", baths: "2+", firstName: "", lastName: "", email: "", phone: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const name = STEPS[step];
  const total = STEPS.length - 2; // question steps only
  const fillPct = step === 0 ? 6 : step >= STEPS.length - 1 ? 100 : (Math.min(step, total) / total) * 100;

  const set = (patch: Partial<Answers>) => setA((p) => ({ ...p, ...patch }));
  const toggle = (field: "communities" | "features", val: string) =>
    setA((p) => {
      const arr = p[field];
      return { ...p, [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Single-choice steps auto-advance (brief delay so the highlight registers).
  const pick = (patch: Partial<Answers>) => {
    set(patch);
    setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 240);
  };

  const canAdvance = () => {
    if (name === "communities") return a.communities.length > 0;
    if (name === "price") return !!a.price;
    if (name === "timeline") return !!a.timeline;
    if (name === "contact") return !!a.firstName.trim() && !!a.lastName.trim() && /\S+@\S+\.\S+/.test(a.email);
    return true;
  };

  function matchHref(): string {
    const p = new URLSearchParams();
    if (a.communities.length === 1) p.set("city", a.communities[0]);
    const b = parseInt(a.beds); if (b) p.set("beds", String(b));
    const ba = parseInt(a.baths); if (ba) p.set("baths", String(ba));
    const band = PRICE_BANDS.find((x) => x.label === a.price);
    if (band?.min) p.set("minPrice", String(band.min));
    if (band?.max) p.set("maxPrice", String(band.max));
    for (const f of a.features) {
      const k = FEATURES.find((x) => x.key === f)?.filter;
      if (k) p.append("feature", k);
    }
    return `/listings${p.toString() ? `?${p}` : ""}`;
  }

  async function finish() {
    if (!canAdvance()) return;
    setSubmitting(true);
    try {
      await fetch("/api/forms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: "buyer_quiz",
          name: `${a.firstName.trim()} ${a.lastName.trim()}`.trim(),
          first_name: a.firstName, last_name: a.lastName, email: a.email, phone: a.phone,
          message: `Buyer Match quiz · ${a.communities.join(", ")} · ${a.price || "any price"} · ${a.beds} bed / ${a.baths} bath · ${TIMELINES.find((t) => t.key === a.timeline)?.label || "—"}`,
          criteria: {
            communities: a.communities, price: a.price, features: a.features,
            beds: a.beds, baths: a.baths, timeline: a.timeline,
          },
          source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
    } catch { /* still show matches */ }
    logActivity("quiz", { meta: { communities: a.communities, price: a.price, features: a.features, beds: a.beds, baths: a.baths, timeline: a.timeline } });
    setSubmitting(false);
    next();
  }

  const firstName = a.firstName.trim();

  return (
    <main className="results quiz">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="wiz__bar" style={{ marginBottom: 22 }}><div className="wiz__fill" style={{ width: `${fillPct}%` }} /></div>

        <div className="hv-card quiz__card" key={step}>
          {name === "intro" && (
            <>
              <span className="script" style={{ fontSize: "1.7rem" }}>your journey home starts here</span>
              <h1 className="wiz__q" style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", marginTop: 4 }}>Find your Southwest Louisiana match</h1>
              <p className="prose" style={{ color: "var(--ink-muted)" }}>
                Answer six quick questions and we&apos;ll hand-match you to homes that actually fit — the
                right communities, features, and price. Takes about a minute.
              </p>
              <button className="btn btn--primary quiz__start" onClick={next}>Start the quiz →</button>
              <p className="hv-fine">No account needed. We&apos;ll only reach out with your matches.</p>
            </>
          )}

          {name === "communities" && (
            <>
              <div className="quiz-eyebrow">Question 1 of 7</div>
              <h2 className="wiz__q">Where are you looking?</h2>
              <p className="prose" style={{ color: "var(--ink-muted)" }}>Pick every community you&apos;d consider — choose as many as you like.</p>
              <div className="quiz-grid">
                {COMMUNITIES.map((c) => (
                  <button key={c} className={`quiz-chip${a.communities.includes(c) ? " is-on" : ""}`} onClick={() => toggle("communities", c)}>{c}</button>
                ))}
              </div>
              <Nav onBack={back} onNext={next} canNext={canAdvance()} />
            </>
          )}

          {name === "price" && (
            <>
              <div className="quiz-eyebrow">Question 2 of 7</div>
              <h2 className="wiz__q">What&apos;s your price range?</h2>
              <p className="prose" style={{ color: "var(--ink-muted)" }}>A rough band is fine — it just helps us match the right listings.</p>
              <div className="quiz-grid">
                {PRICE_BANDS.map((p) => (
                  <button key={p.label} className={`quiz-chip${a.price === p.label ? " is-on" : ""}`} onClick={() => pick({ price: p.label })}>{p.label}</button>
                ))}
              </div>
              <Nav onBack={back} hideNext />
            </>
          )}

          {name === "features" && (
            <>
              <div className="quiz-eyebrow">Question 3 of 7</div>
              <h2 className="wiz__q">What matters most?</h2>
              <p className="prose" style={{ color: "var(--ink-muted)" }}>Select any must-haves, or skip if you&apos;re flexible.</p>
              <div className="quiz-rows">
                {FEATURES.map((f) => (
                  <Row key={f.key} active={a.features.includes(f.key)} onClick={() => toggle("features", f.key)} label={f.label} note={f.note} />
                ))}
              </div>
              <Nav onBack={back} onNext={next} canNext nextLabel={a.features.length ? "Continue" : "Skip for now"} />
            </>
          )}

          {name === "beds" && (
            <>
              <div className="quiz-eyebrow">Question 4 of 7</div>
              <h2 className="wiz__q">How many bedrooms?</h2>
              <p className="prose" style={{ color: "var(--ink-muted)" }}>Pick the minimum you need.</p>
              <div className="quiz-grid quiz-grid--compact">
                {BEDS.map((b) => (
                  <button key={b} className={`quiz-chip${a.beds === b ? " is-on" : ""}`} onClick={() => pick({ beds: b })}>{b}</button>
                ))}
              </div>
              <Nav onBack={back} hideNext />
            </>
          )}

          {name === "baths" && (
            <>
              <div className="quiz-eyebrow">Question 5 of 7</div>
              <h2 className="wiz__q">How many bathrooms?</h2>
              <p className="prose" style={{ color: "var(--ink-muted)" }}>Pick the minimum you need.</p>
              <div className="quiz-grid quiz-grid--compact">
                {BATHS.map((b) => (
                  <button key={b} className={`quiz-chip${a.baths === b ? " is-on" : ""}`} onClick={() => pick({ baths: b })}>{b}</button>
                ))}
              </div>
              <Nav onBack={back} hideNext />
            </>
          )}

          {name === "timeline" && (
            <>
              <div className="quiz-eyebrow">Question 6 of 7</div>
              <h2 className="wiz__q">When do you hope to move?</h2>
              <p className="prose" style={{ color: "var(--ink-muted)" }}>No wrong answer — it just tells us how to help.</p>
              <div className="quiz-rows">
                {TIMELINES.map((t) => (
                  <Row key={t.key} radio active={a.timeline === t.key} onClick={() => pick({ timeline: t.key })} label={t.label} note={t.note} />
                ))}
              </div>
              <Nav onBack={back} hideNext />
            </>
          )}

          {name === "contact" && (
            <>
              <div className="quiz-eyebrow">Question 7 of 7</div>
              <h2 className="wiz__q">Where should we send your matches?</h2>
              <p className="prose" style={{ color: "var(--ink-muted)" }}>We&apos;ll put together a personalized list and reach out — no spam, no pressure.</p>
              <div className="hv-grid hv-grid--2" style={{ marginTop: 18 }}>
                <div className="field"><label>First Name</label>
                  <input className="input" type="text" autoComplete="given-name" value={a.firstName} onChange={(e) => set({ firstName: e.target.value })} /></div>
                <div className="field"><label>Last Name</label>
                  <input className="input" type="text" autoComplete="family-name" value={a.lastName} onChange={(e) => set({ lastName: e.target.value })} /></div>
              </div>
              <div className="hv-grid hv-grid--2">
                <div className="field"><label>Email</label>
                  <input className="input" type="email" autoComplete="email" value={a.email} onChange={(e) => set({ email: e.target.value })} /></div>
                <div className="field"><label>Phone</label>
                  <input className="input" type="tel" autoComplete="tel" value={a.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
              </div>
              <Nav onBack={back} onNext={finish} canNext={canAdvance() && !submitting} nextLabel={submitting ? "Matching…" : "See my matches →"} />
              <p className="hv-fine">By submitting you agree to be contacted by {site.name} about your search. Opt out anytime.</p>
            </>
          )}

          {name === "done" && (
            <div style={{ textAlign: "center" }}>
              <div className="quiz-check">✓</div>
              <span className="script" style={{ fontSize: "1.6rem" }}>matched &amp; on the way</span>
              <h2 className="wiz__q" style={{ marginTop: 4 }}>You&apos;re all set{firstName ? `, ${firstName}` : ""}.</h2>
              <p className="prose" style={{ color: "var(--ink-muted)" }}>
                We&apos;re pulling together homes in{" "}
                <strong style={{ color: "var(--teal)" }}>
                  {a.communities.slice(0, 3).join(", ")}{a.communities.length > 3 ? ` +${a.communities.length - 3} more` : ""}
                </strong>{" "}
                that fit {a.price || "your range"}. A member of our team will reach out shortly.
              </p>
              <Summary a={a} />
              <div className="home-cta" style={{ marginTop: 22 }}>
                <Link className="btn btn--primary" href={matchHref()}>See My Matches</Link>
                <Link className="btn btn--ghost" href="/home-buying-guide">Get the Buyer&apos;s Guide</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Nav({ onBack, onNext, canNext, nextLabel = "Continue", hideNext }: { onBack: () => void; onNext?: () => void; canNext?: boolean; nextLabel?: string; hideNext?: boolean }) {
  return (
    <div className="quiz-nav">
      <button className="quiz-back" onClick={onBack}>← Back</button>
      {hideNext ? (
        <span className="quiz-autohint">Tap an option to continue</span>
      ) : (
        <button className="btn btn--primary" style={{ width: "auto", padding: "13px 26px" }} onClick={canNext ? onNext : undefined} disabled={!canNext}>{nextLabel}</button>
      )}
    </div>
  );
}

function Row({ label, note, active, onClick, radio }: { label: string; note: string; active: boolean; onClick: () => void; radio?: boolean }) {
  return (
    <button className={`quiz-row${radio ? " quiz-row--radio" : ""}${active ? " is-on" : ""}`} onClick={onClick} aria-pressed={active}>
      <span className="quiz-row__box">{active ? "✓" : ""}</span>
      <span>
        <span className="quiz-row__label">{label}</span>
        <span className="quiz-row__note">{note}</span>
      </span>
    </button>
  );
}

function Summary({ a }: { a: Answers }) {
  const rows: [string, string][] = [
    ["Communities", a.communities.join(", ") || "—"],
    ["Price range", a.price || "—"],
    ["Must-haves", a.features.map((f) => FEATURES.find((x) => x.key === f)?.label).join(", ") || "Flexible"],
    ["Size", `${a.beds} bed · ${a.baths} bath`],
    ["Timeline", TIMELINES.find((t) => t.key === a.timeline)?.label || "—"],
  ];
  return (
    <div className="quiz-summary">
      {rows.map(([k, v]) => (
        <div className="quiz-summary__row" key={k}>
          <span className="quiz-summary__k">{k}</span>
          <span className="quiz-summary__v">{v}</span>
        </div>
      ))}
    </div>
  );
}
