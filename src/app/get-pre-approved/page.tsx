"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";

const BAYOU_APPLY = "https://bayou-mortgage.com";

const TIMEFRAMES = ["As soon as possible", "1–3 months", "3–6 months", "Just exploring"];
const PRICES = ["Under $150k", "$150k–$250k", "$250k–$350k", "$350k–$500k", "$500k+"];
const DOWN = ["$0 / not sure", "Less than 3%", "3–5%", "5–10%", "10–20%", "20%+"];
const CREDIT = ["Excellent (720+)", "Good (660–719)", "Fair (620–659)", "Below 620", "Not sure"];
const EMPLOY = ["Employed (W-2)", "Self-employed", "Retired", "Other"];
const STEPS = ["intro", "timeframe", "firsttime", "military", "price", "down", "credit", "employment", "contact", "done"] as const;

interface Answers {
  timeframe: string; firstTime: string; military: string; price: string; down: string;
  credit: string; employment: string; firstName: string; lastName: string; email: string; phone: string;
}

interface Program { name: string; status: "eligible" | "maybe" | "prep"; desc: string }

function evaluate(a: Answers): Program[] {
  const credit = a.credit;
  const lowCredit = credit === "Below 620";
  const fair = credit === "Fair (620–659)";
  const goodPlus = credit === "Excellent (720+)" || credit === "Good (660–719)";
  const programs: Program[] = [];

  if (a.military === "Yes") {
    programs.push({ name: "VA Loan", status: "eligible", desc: "$0 down payment and no monthly mortgage insurance — for eligible veterans and active military." });
  }
  programs.push({
    name: "USDA Loan",
    status: "maybe",
    desc: "Possible $0 down if the home is in a USDA-eligible (rural) area. Income limits apply by household size — a quick check confirms it.",
  });
  programs.push({
    name: "FHA Loan",
    status: lowCredit ? "maybe" : "eligible",
    desc: lowCredit
      ? "May be possible with a 10% down payment at your credit range — a loan officer can map out the path."
      : "As little as 3.5% down with flexible credit guidelines — a popular first-home option.",
  });
  programs.push({
    name: "Conventional Loan",
    status: goodPlus ? "eligible" : fair ? "maybe" : "prep",
    desc: goodPlus
      ? "As little as 3–5% down with strong rates at your credit range."
      : fair
        ? "Within reach — a small credit bump can unlock better terms."
        : "A little credit prep first will open this up; we'll show you exactly what to do.",
  });
  return programs;
}

export default function GetPreApprovedPage() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    timeframe: "", firstTime: "", military: "", price: "", down: "",
    credit: "", employment: "", firstName: "", lastName: "", email: "", phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const name = STEPS[step];
  const total = STEPS.length - 2;
  const fillPct = step === 0 ? 6 : step >= STEPS.length - 1 ? 100 : (Math.min(step, total) / total) * 100;

  const set = (patch: Partial<Answers>) => setA((p) => ({ ...p, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const pick = (patch: Partial<Answers>) => { set(patch); setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 220); };

  const canContact = () => !!a.firstName.trim() && !!a.lastName.trim() && /\S+@\S+\.\S+/.test(a.email) && a.phone.replace(/\D/g, "").length >= 7;

  async function finish() {
    if (!canContact()) { setErr("Please add your name, email, and phone so a loan officer can send your results."); return; }
    setSubmitting(true);
    const programs = evaluate(a);
    try {
      await fetch("/api/forms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: "mortgage_preapproval",
          name: `${a.firstName.trim()} ${a.lastName.trim()}`.trim(),
          first_name: a.firstName, last_name: a.lastName, email: a.email, phone: a.phone,
          message: `Pre-approval eligibility check · ${a.timeframe} · price ${a.price} · down ${a.down} · credit ${a.credit} · ${a.military === "Yes" ? "veteran/military" : "civilian"}`,
          criteria: {
            timeframe: a.timeframe, firstTime: a.firstTime, military: a.military, price: a.price,
            down: a.down, credit: a.credit, employment: a.employment,
            eligible: programs.filter((p) => p.status === "eligible").map((p) => p.name),
          },
          source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
    } catch { /* still show results */ }
    setSubmitting(false);
    next();
  }

  const programs = evaluate(a);
  const firstName = a.firstName.trim();

  return (
    <main className="results quiz">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="quiz-powered">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={site.bayou.logoUrl} alt="Bayou Mortgage" />
          <span>Pre-approval powered by <strong>Bayou Mortgage</strong></span>
        </div>

        <div className="wiz__bar" style={{ marginBottom: 22 }}><div className="wiz__fill" style={{ width: `${fillPct}%` }} /></div>

        <div className="hv-card quiz__card" key={step}>
          {name === "intro" && (
            <>
              <span className="script" style={{ fontSize: "1.7rem" }}>let&apos;s get you pre-approved</span>
              <h1 className="wiz__q" style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", marginTop: 4 }}>Check your home loan eligibility</h1>
              <p className="prose" style={{ color: "var(--ink-muted)" }}>
                Answer a few quick questions and see which loan programs you likely qualify for — including
                $0-down options. It takes about a minute, it&apos;s free, and it won&apos;t affect your credit.
              </p>
              <button className="btn btn--primary quiz__start" onClick={next}>Start my eligibility check →</button>
              <p className="hv-fine">No obligation. No hard credit pull.</p>
            </>
          )}

          {name === "timeframe" && (
            <Step n={1} q="How soon are you looking to buy?">
              <Grid>{TIMEFRAMES.map((t) => <Chip key={t} on={a.timeframe === t} onClick={() => pick({ timeframe: t })}>{t}</Chip>)}</Grid>
              <BackOnly onBack={back} />
            </Step>
          )}
          {name === "firsttime" && (
            <Step n={2} q="Are you a first-time homebuyer?">
              <Grid>{["Yes", "No"].map((t) => <Chip key={t} on={a.firstTime === t} onClick={() => pick({ firstTime: t })}>{t}</Chip>)}</Grid>
              <BackOnly onBack={back} />
            </Step>
          )}
          {name === "military" && (
            <Step n={3} q="Are you a veteran or active military?">
              <p className="prose" style={{ color: "var(--ink-muted)", marginTop: 0 }}>This can unlock a $0-down VA loan.</p>
              <Grid>{["Yes", "No"].map((t) => <Chip key={t} on={a.military === t} onClick={() => pick({ military: t })}>{t}</Chip>)}</Grid>
              <BackOnly onBack={back} />
            </Step>
          )}
          {name === "price" && (
            <Step n={4} q="What price range are you targeting?">
              <Grid>{PRICES.map((t) => <Chip key={t} on={a.price === t} onClick={() => pick({ price: t })}>{t}</Chip>)}</Grid>
              <BackOnly onBack={back} />
            </Step>
          )}
          {name === "down" && (
            <Step n={5} q="How much do you have for a down payment?">
              <p className="prose" style={{ color: "var(--ink-muted)", marginTop: 0 }}>Many buyers qualify for low- and no-down-payment loans.</p>
              <Grid>{DOWN.map((t) => <Chip key={t} on={a.down === t} onClick={() => pick({ down: t })}>{t}</Chip>)}</Grid>
              <BackOnly onBack={back} />
            </Step>
          )}
          {name === "credit" && (
            <Step n={6} q="What&apos;s your estimated credit score?">
              <p className="prose" style={{ color: "var(--ink-muted)", marginTop: 0 }}>A ballpark is fine — this is just an estimate.</p>
              <Grid>{CREDIT.map((t) => <Chip key={t} on={a.credit === t} onClick={() => pick({ credit: t })}>{t}</Chip>)}</Grid>
              <BackOnly onBack={back} />
            </Step>
          )}
          {name === "employment" && (
            <Step n={7} q="What&apos;s your employment status?">
              <Grid>{EMPLOY.map((t) => <Chip key={t} on={a.employment === t} onClick={() => pick({ employment: t })}>{t}</Chip>)}</Grid>
              <BackOnly onBack={back} />
            </Step>
          )}

          {name === "contact" && (
            <Step n={8} q="Where should we send your results?">
              <p className="prose" style={{ color: "var(--ink-muted)", marginTop: 0 }}>A Bayou Mortgage loan officer will follow up with your options — no pressure.</p>
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
              {err && <p className="hv-err">{err}</p>}
              <div className="quiz-nav">
                <button className="quiz-back" onClick={back}>← Back</button>
                <button className="btn btn--primary" style={{ width: "auto", padding: "13px 26px" }} onClick={finish} disabled={submitting}>
                  {submitting ? "Checking…" : "See my eligibility →"}
                </button>
              </div>
            </Step>
          )}

          {name === "done" && (
            <div>
              <div style={{ textAlign: "center" }}>
                <div className="quiz-check">✓</div>
                <span className="script" style={{ fontSize: "1.6rem" }}>your eligibility snapshot</span>
                <h2 className="wiz__q" style={{ marginTop: 4 }}>Nice work{firstName ? `, ${firstName}` : ""} — here&apos;s where you stand.</h2>
                <p className="prose" style={{ color: "var(--ink-muted)" }}>
                  Based on your answers, these loan programs look like a fit. A Bayou Mortgage loan officer will
                  reach out to confirm and get you a real pre-approval.
                </p>
              </div>
              <div className="elig">
                {programs.map((p) => (
                  <div className={`elig__row elig__row--${p.status}`} key={p.name}>
                    <span className="elig__badge">{p.status === "eligible" ? "✓" : p.status === "maybe" ? "?" : "•"}</span>
                    <div>
                      <div className="elig__name">{p.name} <em>{p.status === "eligible" ? "Likely eligible" : p.status === "maybe" ? "May qualify" : "Prep needed"}</em></div>
                      <div className="elig__desc">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="home-cta" style={{ marginTop: 22 }}>
                <a className="btn btn--primary" href={BAYOU_APPLY} target="_blank" rel="noopener">Start My Pre-Approval</a>
                <a className="btn btn--ghost" href={site.phoneHref}>Call {site.phone}</a>
              </div>
              <p className="quiz-disclosure">
                This eligibility snapshot is an estimate based on the information you provided and is not a
                commitment to lend or a pre-approval. {site.bayou.disclosure}
              </p>
            </div>
          )}

          {name !== "done" && name !== "intro" && (
            <p className="quiz-disclosure quiz-disclosure--mini">Pre-approval powered by Bayou Mortgage. {site.bayou.disclosure}</p>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 16 }}>
          <Link className="seo-seeall" href="/listings">Or browse homes for sale &rarr;</Link>
        </p>
      </div>
    </main>
  );
}

function Step({ n, q, children }: { n: number; q: string; children: React.ReactNode }) {
  return (
    <div className="wiz__step">
      <div className="quiz-eyebrow">Step {n} of 8</div>
      <h2 className="wiz__q" dangerouslySetInnerHTML={{ __html: q }} />
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="quiz-grid">{children}</div>; }
function Chip({ children, on, onClick }: { children: React.ReactNode; on: boolean; onClick: () => void }) {
  return <button className={`quiz-chip${on ? " is-on" : ""}`} onClick={onClick}>{children}</button>;
}
function BackOnly({ onBack }: { onBack: () => void }) {
  return <div className="quiz-nav"><button className="quiz-back" onClick={onBack}>← Back</button><span className="quiz-autohint">Tap an option to continue</span></div>;
}
