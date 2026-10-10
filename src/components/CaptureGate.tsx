"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { site, getAdPage, leadGate, AD_VISIT_KEY as AD_KEY, AD_VISIT_COOKIE as AD_COOKIE } from "@/config/site";
import { HoneypotField, useFormGuard } from "@/components/FormGuard";
import { A2P_REVIEW_MODE } from "@/config/a2p";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { BATHS, BEDS, COMMUNITIES, FEATURES, PRICE_BANDS, matchHref } from "@/lib/buyerMatch";

const KEY = "lhg_captured";
const DRAFT_KEY = "lhg_gate_draft";
const PROPERTY = /^\/listings\/[^/]+/;

const SHORT: Record<string, string> = {
  pool: "Pool", acreage: "Acreage", waterfront: "Waterfront", newconstruction: "New construction", singlestory: "Single story",
};
const OWNERSHIP = [
  { key: "rent", label: "No, I don't own a home" },
  { key: "own", label: "Yes, I own a home" },
  { key: "own_selling", label: "Yes, and I may sell it" },
];

// Easy single-tap questions first; the 13-town list comes after they are invested.
const QUESTIONS = ["price", "size", "communities", "style", "owns"] as const;
const CONTACT = A2P_REVIEW_MODE ? (["firstName", "lastName", "email"] as const) : (["firstName", "lastName", "email", "phone"] as const);
const STEPS = [...QUESTIONS, ...CONTACT] as const;
type Step = (typeof STEPS)[number];

const COPY = {
  firstName: { h: "What's your first name?", p: "", label: "First name", type: "text", auto: "given-name", mode: "text" },
  lastName: { h: "And your last name?", p: "", label: "Last name", type: "text", auto: "family-name", mode: "text" },
  email: { h: "Where should we send your matches?", p: "We'll email you homes that match.", label: "Email", type: "email", auto: "email", mode: "email" },
  phone: { h: "Last step: your phone number", p: "This is also your password to log back in.", label: "Phone number", type: "tel", auto: "tel", mode: "tel" },
} as const;

interface Answers {
  communities: string[]; price: string; beds: string; baths: string; features: string[]; owns: string;
  firstName: string; lastName: string; email: string; phone: string;
}
const EMPTY: Answers = {
  communities: [], price: "", beds: "3+", baths: "2+", features: [], owns: "",
  firstName: "", lastName: "", email: "", phone: "",
};
const digits = (v: string) => v.replace(/\D/g, "");

// Lead-capture quiz for listing pages. Signed-out visitors can't dismiss it:
// questions first (locations, price, beds/baths, must-haves, own a home), then
// first name, last name, email and phone, one per screen. Mobile: full-screen
// sheet. Completing it saves the lead (form_id "ad_capture", same pipeline and
// spam guard as before), creates the free account (phone = password) and
// saves their answers as a search. Gates every visitor unless
// leadGate.adsOnly is true (then only Google Ads visitors: /GA, gclid, UTMs).
export default function CaptureGate() {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const onAdPage = !!getAdPage(pathname)?.capture;
  const [adVisit, setAdVisit] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(EMPTY);
  const guard = useFormGuard();
  const landing = useRef<string>("");
  const bodyRef = useRef<HTMLDivElement>(null);

  // Test hook: open any page with ?gate=reset to forget "already completed",
  // the ad-visit flag, saved quiz answers and the customer login on THIS
  // browser, then reload as a brand-new visitor.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("gate") !== "reset") return;
    try {
      window.localStorage.removeItem(KEY);
      window.sessionStorage.removeItem(AD_KEY);
      window.sessionStorage.removeItem(DRAFT_KEY);
      document.cookie = `${AD_COOKIE}=; path=/; max-age=0`;
    } catch { /* storage blocked */ }
    const done = () => window.location.replace(window.location.pathname);
    getBrowserClient().auth.signOut().then(done, done);
  }, []);

  useEffect(() => {
    try {
      setCaptured(window.localStorage.getItem(KEY) === "1");
      const v = window.sessionStorage.getItem(AD_KEY);
      setAdVisit(!!v);
      if (v) landing.current = v;
      const d = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || "null");
      if (d?.a) { setA((p) => ({ ...p, ...d.a })); if (d.step > 0) setStep(Math.min(d.step, QUESTIONS.length - 1)); }
    } catch { /* private mode */ }
    setChecked(true);
  }, []);

  // Landing on any ad page flags the whole visit (survives client navigation).
  useEffect(() => {
    if (!onAdPage) return;
    setAdVisit(true);
    landing.current = window.location.pathname + window.location.search;
    document.documentElement.dataset.ad = "1";
    try { window.sessionStorage.setItem(AD_KEY, landing.current); } catch { /* ignore */ }
  }, [onAdPage]);

  // Keep quiz answers (never contact details) across a refresh.
  useEffect(() => {
    try {
      const { firstName: _f, lastName: _l, email: _e, phone: _p, ...answers } = a;
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step: Math.min(step, QUESTIONS.length - 1), a: answers }));
    } catch { /* ignore */ }
  }, [a, step]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [step]);

  // Gate only on a property page (strip a trailing /GA first).
  const base = (pathname ?? "").replace(/\/ga\/?$/i, "");
  const enabled = PROPERTY.test(base) && (!leadGate.adsOnly || onAdPage || adVisit);
  const locked = enabled && !captured && !user;

  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [locked]);

  if (!enabled || (checked && ready && (captured || user))) return null;

  const name: Step = STEPS[step];
  const set = (p: Partial<Answers>) => setA((s) => ({ ...s, ...p }));
  const toggle = (f: "communities" | "features", v: string) =>
    setA((s) => ({ ...s, [f]: s[f].includes(v) ? s[f].filter((x) => x !== v) : [...s[f], v] }));
  const advance = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const pick = (p: Partial<Answers>) => { set(p); setTimeout(advance, 150); };
  const isLast = step === STEPS.length - 1;

  const canNext =
    name === "communities" ? a.communities.length > 0
    : name === "price" ? !!a.price
    : name === "owns" ? !!a.owns
    : name === "firstName" ? !!a.firstName.trim()
    : name === "lastName" ? !!a.lastName.trim()
    : name === "email" ? /\S+@\S+\.\S+/.test(a.email.trim())
    : name === "phone" ? digits(a.phone).length >= 10
    : true;

  async function createAccount() {
    const email = a.email.trim();
    const password = digits(a.phone);
    if (A2P_REVIEW_MODE || !email || password.length < 6) return;
    const full_name = `${a.firstName.trim()} ${a.lastName.trim()}`.trim();
    try {
      const supabase = getBrowserClient();
      let { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name, phone: a.phone } } });
      if (error || !data.session) {
        // Already registered: sign them in with their phone (if it matches).
        const r = await supabase.auth.signInWithPassword({ email, password });
        if (r.error) return;
        data = { user: r.data.user, session: r.data.session };
      }
      const uid = data.user?.id;
      if (!uid) return;
      await supabase.from("profiles").update({ full_name, phone: a.phone }).eq("id", uid);
      await supabase.from("saved_searches").insert({
        user_id: uid, email, name: `My search · ${a.communities.slice(0, 2).join(", ")}${a.communities.length > 2 ? " +" : ""}`,
        criteria: {
          city: a.communities.length === 1 ? a.communities[0] : undefined,
          communities: a.communities, price: a.price, beds: parseInt(a.beds) || undefined,
          baths: parseInt(a.baths) || undefined, features: a.features,
          query: matchHref(a).split("?")[1] ?? "",
        },
        alert_frequency: "instant", active: true,
      });
    } catch { /* lead already saved */ }
  }

  async function go() {
    if (!canNext || busy) return;
    if (!isLast) { advance(); return; }
    setErr("");
    setBusy(true);
    try {
      const listingKey = base.split("/")[2];
      const first = a.firstName.trim(), last = a.lastName.trim();
      const owns = OWNERSHIP.find((o) => o.key === a.owns)?.label ?? "—";
      const feats = a.features.map((k) => SHORT[k]).filter(Boolean).join(", ") || "no must-haves";
      const ok = await guard.submit({
        form_id: "ad_capture",
        listing_key: listingKey,
        source_url: landing.current || window.location.pathname,
        name: `${first} ${last}`.trim(), first_name: first, last_name: last,
        phone: a.phone, email: a.email.trim(),
        message: `Inquiry about listing ${listingKey} (listing gate quiz) · ${a.communities.join(", ")} · ${a.price || "any price"} · ${a.beds} bd / ${a.baths} ba · ${feats} · Owns home: ${owns} · wants new-listing alerts`,
        criteria: {
          communities: a.communities, price: a.price, beds: a.beds, baths: a.baths,
          features: a.features, owns_home: a.owns, quiz_source: "listing_gate", listing_alerts: true,
        },
      });
      if (!ok) throw new Error("bad");
      // Lead is captured; now create the account. Best effort: a failure here
      // (e.g. email already registered with a different phone) never blocks them.
      await createAccount();
      try { window.localStorage.setItem(KEY, "1"); window.sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setCaptured(true);
    } catch {
      setErr(`Something went wrong. Please call us at ${site.phone}.`);
    }
    setBusy(false);
  }

  const isContact = (CONTACT as readonly string[]).includes(name);
  const c = isContact ? COPY[name as keyof typeof COPY] : null;
  const autoAdvance = name === "price" || name === "owns";
  const btnLabel = isLast ? (busy ? "One moment…" : "Show me the home →")
    : name === "style" && a.features.length === 0 ? "Skip" : "Continue";
  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  const cta = <button type="submit" className="qg__cta" disabled={!canNext || busy}>{btnLabel}</button>;

  return (
    <div
      className="qg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-title" // the exit-intent popup watches for this id and stays hidden while the gate is up
      // Hidden until we know the visitor hasn't already submitted (no flash).
      style={{ visibility: checked && ready ? "visible" : "hidden" }}
    >
      <form className="qg__sheet" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <span id="capture-title" className="qg__sr">Find your match</span>
        <header className="qg__top">
          {step > 0 ? <button type="button" className="qg__icon" onClick={() => setStep(step - 1)} aria-label="Back">←</button> : <span className="qg__icon" />}
          <div className="qg__bar" aria-hidden="true"><div style={{ width: `${pct}%` }} /></div>
          <span className="qg__icon" />
        </header>

        <div className="qg__body" ref={bodyRef} key={step}>
          <HoneypotField inputRef={guard.hpRef} />

          {name === "communities" && (<>
            <h2 className="qg__q">Where are you looking?</h2>
            <p className="qg__hint">Select all that apply.</p>
            <div className="qg__grid">
              {COMMUNITIES.map((x) => (
                <button type="button" key={x} className={`qg__chip${a.communities.includes(x) ? " is-on" : ""}`} aria-pressed={a.communities.includes(x)} onClick={() => toggle("communities", x)}>{x}</button>
              ))}
            </div>
          </>)}

          {name === "price" && (<>
            <p className="qg__eyebrow">Unlock this home + every listing</p>
            <h2 className="qg__q">What&apos;s your price range?</h2>
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
            <p className="qg__hint">Select all that apply, or skip.</p>
            <div className="qg__grid">
              {FEATURES.map((f) => (
                <button type="button" key={f.key} className={`qg__chip${a.features.includes(f.key) ? " is-on" : ""}`} aria-pressed={a.features.includes(f.key)} onClick={() => toggle("features", f.key)}>{SHORT[f.key] ?? f.label}</button>
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

          {isContact && c && (<>
            <p className="qg__eyebrow">{CONTACT.indexOf(name as never) + 1} of {CONTACT.length}</p>
            <h2 className="qg__q">{c.h}</h2>
            {c.p && <p className="qg__hint">{c.p}</p>}
            <label className="qg__sr" htmlFor="qg-in">{c.label}</label>
            <input
              id="qg-in" className="qg__input" type={c.type} autoComplete={c.auto} inputMode={c.mode}
              enterKeyHint={isLast ? "go" : "next"} autoCapitalize={name === "email" ? "none" : "words"}
              autoCorrect="off" spellCheck={false} autoFocus placeholder={c.label}
              value={a[name as "firstName" | "lastName" | "email" | "phone"]}
              onChange={(e) => set({ [name]: e.target.value } as Partial<Answers>)}
            />
            {err && <p className="hv-err" style={{ marginTop: 10 }}>{err}</p>}
            {/* Button sits under the field (not pinned) so the phone keyboard never covers it. */}
            {cta}
            {isLast && (
              <p className="qg__legal">
                By continuing you agree to be contacted by {site.name}, including new-listing alerts, by call, text and email.
                Consent is not a condition of any purchase or sale. Already have an account? Enter the same email and phone and we&apos;ll log you in.
              </p>
            )}
          </>)}
        </div>

        {!isContact && (
          <footer className="qg__foot">
            {!autoAdvance && cta}
          </footer>
        )}
      </form>
    </div>
  );
}
