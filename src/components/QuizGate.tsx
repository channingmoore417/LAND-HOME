"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/config/site";
import {
  BATHS, BEDS, COMMUNITIES, EMPTY_ANSWERS, OWNERSHIP, PRICE_BANDS, STYLES, digits, submitQuiz, type QuizAnswers,
} from "@/lib/quizSubmit";

// Mobile-first lead-capture quiz shown when a signed-out visitor opens a
// listing. Questions first; contact details are always the last four screens,
// one field per screen. Full-screen sheet on phones, centered card on desktop.
const STEPS = ["communities", "price", "size", "style", "owns", "firstName", "lastName", "email", "phone"] as const;
type Step = (typeof STEPS)[number];
const DRAFT_KEY = "lhg_gate_draft";

const CONTACT: Record<string, { h: string; p: string; label: string; type: string; auto: string; mode: "text" | "email" | "tel" }> = {
  firstName: { h: "What's your first name?", p: "So we know who we're helping.", label: "First name", type: "text", auto: "given-name", mode: "text" },
  lastName: { h: "And your last name?", p: "Almost there.", label: "Last name", type: "text", auto: "family-name", mode: "text" },
  email: { h: "Where should we send your matches?", p: "We'll email homes that fit as soon as they hit the market.", label: "Email", type: "email", auto: "email", mode: "email" },
  phone: { h: "Last step: your phone number", p: "This is also your password. Use it with your email to log back in anytime.", label: "Phone number", type: "tel", auto: "tel", mode: "tel" },
};

export default function QuizGate({ listingKey, onDone, onLogin }: {
  listingKey?: string;
  onDone: () => void; // visitor completed the quiz: let them through
  onLogin: () => void; // returning user: switch to the login form
}) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<QuizAnswers>(EMPTY_ANSWERS);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const name: Step = STEPS[step];

  // Restore answers (never contact details) and lock background scroll.
  useEffect(() => {
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (d?.a) { setA((p) => ({ ...p, ...d.a })); if (d.step > 0) setStep(Math.min(d.step, STEPS.indexOf("owns"))); }
    } catch { /* ignore */ }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    try {
      const { firstName: _f, lastName: _l, email: _e, phone: _p, ...answers } = a;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step: Math.min(step, STEPS.indexOf("owns")), a: answers }));
    } catch { /* ignore */ }
  }, [a, step]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [step]);

  const set = (p: Partial<QuizAnswers>) => setA((s) => ({ ...s, ...p }));
  const toggle = (f: "communities" | "styles", v: string) =>
    setA((s) => ({ ...s, [f]: s[f].includes(v) ? s[f].filter((x) => x !== v) : [...s[f], v] }));
  const advance = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const pick = (p: Partial<QuizAnswers>) => { set(p); setTimeout(advance, 150); };

  const canNext =
    name === "communities" ? a.communities.length > 0
    : name === "price" ? !!a.price
    : name === "owns" ? !!a.owns
    : name === "firstName" ? !!a.firstName.trim()
    : name === "lastName" ? !!a.lastName.trim()
    : name === "email" ? /\S+@\S+\.\S+/.test(a.email.trim())
    : name === "phone" ? digits(a.phone).length >= 10
    : true;

  async function go() {
    if (!canNext || busy) return;
    if (name !== "phone") { advance(); return; }
    setBusy(true);
    await submitQuiz(a, { listingKey });
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setBusy(false);
    onDone();
  }

  const isContact = name in CONTACT;
  const c = CONTACT[name];
  const autoAdvance = name === "price" || name === "owns";
  const btnLabel = name === "phone" ? (busy ? "One moment…" : "Show me the home →")
    : name === "style" && a.styles.length === 0 ? "Skip" : "Continue";
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  const cta = (
    <button type="submit" className="qg__cta" disabled={!canNext || busy}>{btnLabel}</button>
  );

  return (
    <div className="qg" role="dialog" aria-modal="true" aria-label="Find your match">
      <form className="qg__sheet" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <header className="qg__top">
          {step > 0 ? <button type="button" className="qg__icon" onClick={() => setStep(step - 1)} aria-label="Back">←</button> : <span className="qg__icon" />}
          <div className="qg__bar" aria-hidden="true"><div style={{ width: `${pct}%` }} /></div>
          <span className="qg__icon" />
        </header>

        <div className="qg__body" ref={bodyRef} key={step}>
          {name === "communities" && (<>
            <p className="qg__eyebrow">Unlock this home + every listing</p>
            <h2 className="qg__q">Where are you looking?</h2>
            <p className="qg__hint">Pick every area you&apos;d consider.</p>
            <div className="qg__grid">
              {COMMUNITIES.map((x) => (
                <button type="button" key={x} className={`qg__chip${a.communities.includes(x) ? " is-on" : ""}`} aria-pressed={a.communities.includes(x)} onClick={() => toggle("communities", x)}>{x}</button>
              ))}
            </div>
          </>)}

          {name === "price" && (<>
            <h2 className="qg__q">What&apos;s your price range?</h2>
            <p className="qg__hint">A rough band is fine.</p>
            <div className="qg__grid qg__grid--1">
              {PRICE_BANDS.map((p) => (
                <button type="button" key={p.label} className={`qg__chip${a.price === p.label ? " is-on" : ""}`} onClick={() => pick({ price: p.label })}>{p.label}</button>
              ))}
            </div>
          </>)}

          {name === "size" && (<>
            <h2 className="qg__q">How much space?</h2>
            <p className="qg__label">Bedrooms</p>
            <div className="qg__row">
              {BEDS.map((b) => <button type="button" key={b} className={`qg__chip${a.beds === b ? " is-on" : ""}`} onClick={() => set({ beds: b })}>{b}</button>)}
            </div>
            <p className="qg__label">Bathrooms</p>
            <div className="qg__row">
              {BATHS.map((b) => <button type="button" key={b} className={`qg__chip${a.baths === b ? " is-on" : ""}`} onClick={() => set({ baths: b })}>{b}</button>)}
            </div>
          </>)}

          {name === "style" && (<>
            <h2 className="qg__q">Any must-haves?</h2>
            <p className="qg__hint">Pick any that matter, or skip.</p>
            <div className="qg__grid">
              {STYLES.map((s) => (
                <button type="button" key={s.key} className={`qg__chip${a.styles.includes(s.key) ? " is-on" : ""}`} aria-pressed={a.styles.includes(s.key)} onClick={() => toggle("styles", s.key)}>{s.label}</button>
              ))}
            </div>
          </>)}

          {name === "owns" && (<>
            <h2 className="qg__q">Do you currently own a home?</h2>
            <div className="qg__grid qg__grid--1">
              {OWNERSHIP.map((o) => (
                <button type="button" key={o.key} className={`qg__chip${a.owns === o.key ? " is-on" : ""}`} onClick={() => pick({ owns: o.key })}>{o.label}</button>
              ))}
            </div>
          </>)}

          {isContact && (<>
            <p className="qg__eyebrow">Almost there · {STEPS.indexOf(name) - 4} of 4</p>
            <h2 className="qg__q">{c.h}</h2>
            <p className="qg__hint">{c.p}</p>
            <label className="qg__sr" htmlFor="qg-in">{c.label}</label>
            <input
              id="qg-in" className="qg__input" type={c.type} autoComplete={c.auto} inputMode={c.mode}
              enterKeyHint={name === "phone" ? "go" : "next"} autoCapitalize={name === "email" ? "none" : "words"}
              autoCorrect="off" spellCheck={false} autoFocus placeholder={c.label}
              value={a[name as "firstName" | "lastName" | "email" | "phone"]}
              onChange={(e) => set({ [name]: e.target.value } as Partial<QuizAnswers>)}
            />
            {/* Button sits under the field (not pinned) so the phone keyboard never covers it. */}
            {cta}
            {name === "phone" && (
              <p className="qg__legal">
                By continuing you consent to calls, texts, and emails from {site.name}, brokered by {site.brokerage}, about your
                search and real estate matters, per TCPA and Do Not Call guidelines. Consent is not a condition of purchase; opt
                out anytime.
              </p>
            )}
          </>)}
        </div>

        {!isContact && (
          <footer className="qg__foot">
            {!autoAdvance && cta}
            {step === 0 && <p className="qg__login">Already registered? <button type="button" onClick={onLogin}>Log in</button></p>}
          </footer>
        )}
      </form>
    </div>
  );
}
