"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";

const BAYOU_APPLY = "https://bayou-mortgage.com";

const TIMEFRAMES = ["As soon as possible", "1–3 months", "3–6 months", "Just exploring"];
const HOUSING = ["I rent", "I own my home", "Living with family", "Other"];
const PROPERTY = ["Single-family home", "Condo / townhome", "Multi-family (2–4 units)", "Manufactured home", "Land / new build"];
const CREDIT = ["Excellent (720+)", "Good (660–719)", "Fair (620–659)", "Below 620", "Not sure"];
const EMPLOY = ["Employed (W-2)", "Self-employed", "Retired", "Military", "Other"];
const STEPS = [
  "intro", "timeframe", "housing", "firsttime", "military", "property", "zip",
  "price", "down", "credit", "income", "debts", "employment", "contact", "done",
] as const;
const QCOUNT = STEPS.length - 2; // 13 questions

interface Answers {
  timeframe: string; housing: string; firstTime: string; military: string; property: string;
  zip: string; price: string; down: string; credit: string; income: string; debts: string; employment: string;
  firstName: string; lastName: string; email: string; phone: string;
}

const num = (s: string) => Number((s || "").replace(/[^0-9.]/g, "")) || 0;
const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

interface Result {
  loan: number; payment: number; dti: number; downPct: number;
  verdict: "strong" | "workable" | "stretch";
  programs: { name: string; status: "eligible" | "maybe" | "prep"; desc: string }[];
}

function evaluate(a: Answers): Result {
  const price = num(a.price);
  const down = num(a.down);
  const income = num(a.income);
  const debts = num(a.debts);
  const loan = Math.max(price - down, 0);
  // Rough PITI estimate (~30yr at current rates incl. taxes/insurance) for an estimate only.
  const payment = Math.round(loan * 0.008);
  const monthlyIncome = income / 12;
  const dti = monthlyIncome > 0 ? (payment + debts) / monthlyIncome : 0;
  const downPct = price > 0 ? down / price : 0;

  const verdict: Result["verdict"] = dti === 0 ? "workable" : dti <= 0.43 ? "strong" : dti <= 0.5 ? "workable" : "stretch";

  const credit = a.credit;
  const below620 = credit === "Below 620";
  const fair = credit === "Fair (620–659)";
  const goodPlus = credit === "Excellent (720+)" || credit === "Good (660–719)";
  const dtiOk = dti === 0 || dti <= 0.5;
  const dtiTight = dti > 0.5 && dti <= 0.57;

  const programs: Result["programs"] = [];
  if (a.military === "Yes" || a.employment === "Military") {
    programs.push({
      name: "VA Loan",
      status: dti <= 0.55 || dti === 0 ? "eligible" : "maybe",
      desc: "$0 down and no monthly mortgage insurance for eligible veterans and active military — often the strongest option when you qualify.",
    });
  }
  programs.push({
    name: "USDA Loan",
    status: a.zip ? "maybe" : "maybe",
    desc: "Possible $0 down if the property is in a USDA-eligible (rural) area and your household income is within county limits — quick to verify with your ZIP and income.",
  });
  programs.push({
    name: "FHA Loan",
    status: below620 ? "maybe" : dtiOk ? "eligible" : dtiTight ? "maybe" : "prep",
    desc: below620
      ? "FHA allows scores of 580+ at 3.5% down (500–579 with 10% down) — your range is on the edge, so a loan officer can confirm the path."
      : "As little as 3.5% down with flexible credit and higher debt-to-income allowances — a popular first-home choice.",
  });
  programs.push({
    name: "Conventional Loan",
    status: goodPlus && dti <= 0.45 ? "eligible" : (fair || dtiTight) ? "maybe" : "prep",
    desc: goodPlus
      ? "As little as 3–5% down with strong rates; PMI drops off once you reach 20% equity."
      : "Within reach with a little credit or debt cleanup — we'll show you exactly what moves the needle.",
  });
  return { loan, payment, dti, downPct, verdict, programs };
}

export default function GetPreApprovedPage() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    timeframe: "", housing: "", firstTime: "", military: "", property: "", zip: "",
    price: "", down: "", credit: "", income: "", debts: "", employment: "",
    firstName: "", lastName: "", email: "", phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const name = STEPS[step];
  const fillPct = step === 0 ? 5 : step >= STEPS.length - 1 ? 100 : (Math.min(step, QCOUNT) / QCOUNT) * 100;

  const set = (patch: Partial<Answers>) => setA((p) => ({ ...p, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => { setErr(""); setStep((s) => Math.max(s - 1, 0)); };
  const pick = (patch: Partial<Answers>) => { set(patch); setErr(""); setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 200); };

  const requireNum = (v: string, label: string) => {
    if (num(v) <= 0) { setErr(`Please enter ${label}.`); return false; }
    setErr(""); return true;
  };

  function nextFromInput() {
    if (name === "zip") { if (!/^\d{5}$/.test(a.zip.trim())) { setErr("Enter a 5-digit ZIP code."); return; } }
    if (name === "price" && !requireNum(a.price, "your target purchase price")) return;
    if (name === "down" && num(a.down) < 0) { return; }
    if (name === "income" && !requireNum(a.income, "your gross annual income")) return;
    setErr(""); next();
  }

  const canContact = () => !!a.firstName.trim() && !!a.lastName.trim() && /\S+@\S+\.\S+/.test(a.email) && a.phone.replace(/\D/g, "").length >= 7;

  async function finish() {
    if (!canContact()) { setErr("Please add your name, email, and phone so a loan officer can send your results."); return; }
    setSubmitting(true);
    const r = evaluate(a);
    try {
      await fetch("/api/forms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: "mortgage_preapproval",
          name: `${a.firstName.trim()} ${a.lastName.trim()}`.trim(),
          first_name: a.firstName, last_name: a.lastName, email: a.email, phone: a.phone,
          message: `Pre-approval check · ${a.timeframe} · price ${a.price} · down ${a.down} · income ${a.income} · debts ${a.debts} · credit ${a.credit} · DTI ~${Math.round(r.dti * 100)}% · ${a.military === "Yes" ? "veteran/military" : "civilian"}`,
          criteria: {
            timeframe: a.timeframe, housing: a.housing, firstTime: a.firstTime, military: a.military,
            property: a.property, zip: a.zip, price: a.price, down: a.down, credit: a.credit,
            income: a.income, monthlyDebts: a.debts, employment: a.employment,
            estDTI: Math.round(r.dti * 100), estPayment: r.payment,
            eligible: r.programs.filter((p) => p.status === "eligible").map((p) => p.name),
          },
          source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
    } catch { /* still show results */ }
    setSubmitting(false);
    next();
  }

  const r = evaluate(a);
  const firstName = a.firstName.trim();
  const verdictText = { strong: "looks comfortable", workable: "looks workable", stretch: "may be a stretch" }[r.verdict];

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
                Answer a few questions about your goals and finances and we&apos;ll estimate your buying
                power, debt-to-income, and which loan programs fit — including $0-down options. About two
                minutes, free, and no impact on your credit.
              </p>
              <button className="btn btn--primary quiz__start" onClick={next}>Start my eligibility check →</button>
              <p className="hv-fine">No obligation. No hard credit pull.</p>
            </>
          )}

          {name === "timeframe" && <SelStep n={1} q="How soon are you looking to buy?" opts={TIMEFRAMES} val={a.timeframe} onPick={(v) => pick({ timeframe: v })} onBack={back} />}
          {name === "housing" && <SelStep n={2} q="What&apos;s your current housing situation?" opts={HOUSING} val={a.housing} onPick={(v) => pick({ housing: v })} onBack={back} />}
          {name === "firsttime" && <SelStep n={3} q="Are you a first-time homebuyer?" opts={["Yes", "No"]} val={a.firstTime} onPick={(v) => pick({ firstTime: v })} onBack={back} />}
          {name === "military" && <SelStep n={4} q="Are you a veteran or active military?" note="This can unlock a $0-down VA loan." opts={["Yes", "No"]} val={a.military} onPick={(v) => pick({ military: v })} onBack={back} />}
          {name === "property" && <SelStep n={5} q="What type of property are you buying?" opts={PROPERTY} val={a.property} onPick={(v) => pick({ property: v })} onBack={back} />}

          {name === "zip" && (
            <InpStep n={6} q="What ZIP code are you buying in?" note="Used to check USDA $0-down eligibility.">
              <input className="input" type="text" inputMode="numeric" maxLength={5} placeholder="e.g. 70605" value={a.zip} onChange={(e) => set({ zip: e.target.value })} />
              <NavNext err={err} onBack={back} onNext={nextFromInput} />
            </InpStep>
          )}
          {name === "price" && (
            <InpStep n={7} q="What price range are you targeting?" note="A ballpark is fine — you can refine later.">
              <div className="quiz-money"><span>$</span><input className="input" type="text" inputMode="numeric" placeholder="250,000" value={a.price} onChange={(e) => set({ price: e.target.value })} /></div>
              <NavNext err={err} onBack={back} onNext={nextFromInput} />
            </InpStep>
          )}
          {name === "down" && (
            <InpStep n={8} q="How much cash do you have for a down payment?" note="Many buyers qualify for low- and no-down options. Enter 0 if you're not sure.">
              <div className="quiz-money"><span>$</span><input className="input" type="text" inputMode="numeric" placeholder="10,000" value={a.down} onChange={(e) => set({ down: e.target.value })} /></div>
              <NavNext err={err} onBack={back} onNext={nextFromInput} />
            </InpStep>
          )}
          {name === "credit" && <SelStep n={9} q="What&apos;s your estimated credit score?" note="A ballpark is fine — this is just an estimate." opts={CREDIT} val={a.credit} onPick={(v) => pick({ credit: v })} onBack={back} />}
          {name === "income" && (
            <InpStep n={10} q="What&apos;s your gross annual household income?" note="Before taxes — include any co-borrower.">
              <div className="quiz-money"><span>$</span><input className="input" type="text" inputMode="numeric" placeholder="75,000" value={a.income} onChange={(e) => set({ income: e.target.value })} /></div>
              <NavNext err={err} onBack={back} onNext={nextFromInput} />
            </InpStep>
          )}
          {name === "debts" && (
            <InpStep n={11} q="What are your total monthly debt payments?" note="Car loans, credit cards, student loans, etc. — not rent. Enter 0 if none.">
              <div className="quiz-money"><span>$</span><input className="input" type="text" inputMode="numeric" placeholder="450" value={a.debts} onChange={(e) => set({ debts: e.target.value })} /></div>
              <NavNext err={err} onBack={back} onNext={nextFromInput} />
            </InpStep>
          )}
          {name === "employment" && <SelStep n={12} q="What&apos;s your employment status?" opts={EMPLOY} val={a.employment} onPick={(v) => pick({ employment: v })} onBack={back} />}

          {name === "contact" && (
            <div className="wiz__step">
              <div className="quiz-eyebrow">Step 13 of {QCOUNT}</div>
              <h2 className="wiz__q">Where should we send your results?</h2>
              <p className="prose" style={{ color: "var(--ink-muted)", marginTop: 0 }}>A Bayou Mortgage loan officer will follow up with your options — no pressure.</p>
              <div className="hv-grid hv-grid--2" style={{ marginTop: 18 }}>
                <div className="field"><label>First Name</label><input className="input" type="text" autoComplete="given-name" value={a.firstName} onChange={(e) => set({ firstName: e.target.value })} /></div>
                <div className="field"><label>Last Name</label><input className="input" type="text" autoComplete="family-name" value={a.lastName} onChange={(e) => set({ lastName: e.target.value })} /></div>
              </div>
              <div className="hv-grid hv-grid--2">
                <div className="field"><label>Email</label><input className="input" type="email" autoComplete="email" value={a.email} onChange={(e) => set({ email: e.target.value })} /></div>
                <div className="field"><label>Phone</label><input className="input" type="tel" autoComplete="tel" value={a.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
              </div>
              {err && <p className="hv-err">{err}</p>}
              <div className="quiz-nav">
                <button className="quiz-back" onClick={back}>← Back</button>
                <button className="btn btn--primary" style={{ width: "auto", padding: "13px 26px" }} onClick={finish} disabled={submitting}>{submitting ? "Checking…" : "See my eligibility →"}</button>
              </div>
            </div>
          )}

          {name === "done" && (
            <div>
              <div style={{ textAlign: "center" }}>
                <div className="quiz-check">✓</div>
                <span className="script" style={{ fontSize: "1.6rem" }}>your eligibility snapshot</span>
                <h2 className="wiz__q" style={{ marginTop: 4 }}>Nice work{firstName ? `, ${firstName}` : ""} — here&apos;s where you stand.</h2>
              </div>
              <div className="elig-stats">
                <div><b>{r.payment > 0 ? usd(r.payment) : "—"}</b><span>est. monthly payment</span></div>
                <div><b>{r.dti > 0 ? `${Math.round(r.dti * 100)}%` : "—"}</b><span>est. debt-to-income</span></div>
                <div><b>{r.downPct > 0 ? `${Math.round(r.downPct * 100)}%` : "0%"}</b><span>down payment</span></div>
              </div>
              <p className="prose" style={{ color: "var(--ink-muted)", textAlign: "center" }}>
                At {a.price ? usd(num(a.price)) : "your target price"}, your debt-to-income {verdictText}. Here are the
                loan programs that look like a fit — a Bayou Mortgage loan officer will confirm and get you a real pre-approval.
              </p>
              <div className="elig">
                {r.programs.map((p) => (
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
                This snapshot is an estimate based on the information you provided — not a commitment to lend, a pre-approval,
                or an offer of credit. Actual terms depend on full underwriting. {site.bayou.disclosure}
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

function SelStep({ n, q, note, opts, val, onPick, onBack }: { n: number; q: string; note?: string; opts: string[]; val: string; onPick: (v: string) => void; onBack: () => void }) {
  return (
    <div className="wiz__step">
      <div className="quiz-eyebrow">Step {n} of 13</div>
      <h2 className="wiz__q" dangerouslySetInnerHTML={{ __html: q }} />
      {note && <p className="prose" style={{ color: "var(--ink-muted)", marginTop: 0 }}>{note}</p>}
      <div className="quiz-grid">{opts.map((o) => <button key={o} className={`quiz-chip${val === o ? " is-on" : ""}`} onClick={() => onPick(o)}>{o}</button>)}</div>
      <div className="quiz-nav"><button className="quiz-back" onClick={onBack}>← Back</button><span className="quiz-autohint">Tap an option to continue</span></div>
    </div>
  );
}
function InpStep({ n, q, note, children }: { n: number; q: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="wiz__step">
      <div className="quiz-eyebrow">Step {n} of 13</div>
      <h2 className="wiz__q" dangerouslySetInnerHTML={{ __html: q }} />
      {note && <p className="prose" style={{ color: "var(--ink-muted)", marginTop: 0 }}>{note}</p>}
      <div className="field" style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}
function NavNext({ err, onBack, onNext }: { err: string; onBack: () => void; onNext: () => void }) {
  return (
    <>
      {err && <p className="hv-err">{err}</p>}
      <div className="quiz-nav">
        <button className="quiz-back" onClick={onBack}>← Back</button>
        <button className="btn btn--primary" style={{ width: "auto", padding: "13px 26px" }} onClick={onNext}>Continue</button>
      </div>
    </>
  );
}
