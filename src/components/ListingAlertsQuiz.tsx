"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";
import { A2P_REVIEW_MODE } from "@/config/a2p";
import { HoneypotField, useFormGuard } from "@/components/FormGuard";
import { COMMUNITIES, FEATURES, PRICE_BANDS, BEDS, BATHS, matchHref } from "@/lib/buyerMatch";

// "Be first in line for new homes" popup on blog posts. A short buyer-match
// quiz (area → price → beds → baths → must-haves → contact) that submits as a
// buyer_quiz lead flagged listing_alerts, so it lands in GHL with the same
// mapped fields as the /buyer-quiz page.
//
// Opens three ways: the hero button (OPEN_EVENT), once the reader is halfway
// down the post (desktop only), or after 45 seconds on the page — whichever
// comes first.
// A dismissal snoozes the automatic open for a week; a submission ends it.

export const OPEN_EVENT = "lhg:open-listing-alerts";

const SNOOZE_KEY = "lhg_alerts_snoozed_at";
const DONE_KEY = "lhg_alerts_done";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const AUTO_DELAY_MS = 45_000;
const AUTO_SCROLL = 0.5;
// Phones skip the scroll trigger; it interrupts reading on a small screen.
const MOBILE_QUERY = "(max-width: 768px)";

const STEPS = ["area", "price", "beds", "baths", "features", "contact", "done"] as const;

interface Answers {
  communities: string[]; price: string; beds: string; baths: string; features: string[];
  firstName: string; lastName: string; email: string; phone: string;
}

function readStore(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writeStore(key: string, val: string) {
  try { window.localStorage.setItem(key, val); } catch { /* private mode */ }
}

function autoOpenAllowed(): boolean {
  if (readStore(DONE_KEY)) return false;
  const snoozed = Number(readStore(SNOOZE_KEY) || 0);
  return !snoozed || Date.now() - snoozed > SNOOZE_MS;
}

export default function ListingAlertsQuiz({ city, source }: { city?: string | null; source: string }) {
  const startCity = city && COMMUNITIES.includes(city) ? [city] : [];
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    communities: startCity, price: "", beds: "", baths: "", features: [],
    firstName: "", lastName: "", email: "", phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const guard = useFormGuard();
  const boxRef = useRef<HTMLDivElement | null>(null);

  const name = STEPS[step];
  const questions = STEPS.length - 1;
  const fillPct = name === "done" ? 100 : Math.max(8, (step / questions) * 100);

  const set = (patch: Partial<Answers>) => setA((p) => ({ ...p, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const pick = (patch: Partial<Answers>) => {
    set(patch);
    setTimeout(next, 240);
  };
  const toggle = (field: "communities" | "features", val: string) =>
    setA((p) => {
      const arr = p[field];
      return { ...p, [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });

  const show = useCallback(() => setOpen(true), []);

  const close = useCallback(() => {
    setOpen(false);
    if (!readStore(DONE_KEY)) writeStore(SNOOZE_KEY, String(Date.now()));
  }, []);

  // Hero button (and anything else) can open it.
  useEffect(() => {
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, [show]);

  // Automatic open: halfway down the post (desktop) or after a delay.
  useEffect(() => {
    if (!autoOpenAllowed()) return;
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      cleanup();
      if (autoOpenAllowed()) setOpen(true);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= AUTO_SCROLL) fire();
    };
    const timer = window.setTimeout(fire, AUTO_DELAY_MS);
    const useScroll = !window.matchMedia(MOBILE_QUERY).matches;
    if (useScroll) window.addEventListener("scroll", onScroll, { passive: true });
    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, []);

  // Esc to close, lock page scroll, focus the dialog while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    boxRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const contactOk = !!a.firstName.trim() && !!a.lastName.trim() && /\S+@\S+\.\S+/.test(a.email);

  async function finish() {
    if (!contactOk || submitting) return;
    setSubmitting(true);
    try {
      await guard.submit({
        form_id: "buyer_quiz",
        name: `${a.firstName.trim()} ${a.lastName.trim()}`.trim(),
        first_name: a.firstName, last_name: a.lastName, email: a.email, phone: a.phone,
        message: `New-listing alerts (blog: ${source}) · ${a.communities.join(", ") || "any area"} · ${a.price || "any price"} · ${a.beds || "any"} bed / ${a.baths || "any"} bath`,
        criteria: {
          communities: a.communities, price: a.price, features: a.features,
          beds: a.beds, baths: a.baths, listing_alerts: true, quiz_source: "blog_popup",
        },
      });
    } catch { /* still thank them */ }
    writeStore(DONE_KEY, "1");
    setSubmitting(false);
    next();
  }

  if (!open) return null;

  const firstName = a.firstName.trim();
  const areas = a.communities.length ? a.communities.slice(0, 3).join(", ") + (a.communities.length > 3 ? " and more" : "") : "Southwest Louisiana";

  return (
    <div className="lqz" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="lqz__box" role="dialog" aria-modal="true" aria-labelledby="lqz-title" tabIndex={-1} ref={boxRef}>
        <button className="lqz__x" onClick={close} aria-label="Close">×</button>

        {name !== "done" && (
          <div className="lqz__head">
            <span className="script">new homes, first</span>
            <h2 id="lqz-title">Be first in line for new homes</h2>
            <p>Answer a few quick questions and we&apos;ll send you new listings that fit, as soon as they hit the market.</p>
            <div className="wiz__bar"><div className="wiz__fill" style={{ width: `${fillPct}%` }} /></div>
          </div>
        )}

        <div className="lqz__body" key={step}>
          {name === "area" && (
            <>
              <h3 className="wiz__q">Where are you looking?</h3>
              <p className="lqz__hint">Pick as many as you like.</p>
              <div className="quiz-grid lqz__grid">
                {COMMUNITIES.map((c) => (
                  <button key={c} className={`quiz-chip${a.communities.includes(c) ? " is-on" : ""}`} onClick={() => toggle("communities", c)}>{c}</button>
                ))}
              </div>
              <Nav onNext={next} canNext={a.communities.length > 0} />
            </>
          )}

          {name === "price" && (
            <>
              <h3 className="wiz__q">What&apos;s your price range?</h3>
              <div className="quiz-grid lqz__grid">
                {PRICE_BANDS.map((p) => (
                  <button key={p.label} className={`quiz-chip${a.price === p.label ? " is-on" : ""}`} onClick={() => pick({ price: p.label })}>{p.label}</button>
                ))}
              </div>
              <Nav onBack={back} hideNext />
            </>
          )}

          {name === "beds" && (
            <>
              <h3 className="wiz__q">How many bedrooms?</h3>
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
              <h3 className="wiz__q">How many bathrooms?</h3>
              <div className="quiz-grid quiz-grid--compact">
                {BATHS.map((b) => (
                  <button key={b} className={`quiz-chip${a.baths === b ? " is-on" : ""}`} onClick={() => pick({ baths: b })}>{b}</button>
                ))}
              </div>
              <Nav onBack={back} hideNext />
            </>
          )}

          {name === "features" && (
            <>
              <h3 className="wiz__q">Any must-haves?</h3>
              <p className="lqz__hint">Pick any that matter, or skip if you&apos;re flexible.</p>
              <div className="quiz-rows lqz__rows">
                {FEATURES.map((f) => (
                  <button key={f.key} className={`quiz-row${a.features.includes(f.key) ? " is-on" : ""}`} onClick={() => toggle("features", f.key)} aria-pressed={a.features.includes(f.key)}>
                    <span className="quiz-row__box">{a.features.includes(f.key) ? "✓" : ""}</span>
                    <span>
                      <span className="quiz-row__label">{f.label}</span>
                      <span className="quiz-row__note">{f.note}</span>
                    </span>
                  </button>
                ))}
              </div>
              <Nav onBack={back} onNext={next} canNext nextLabel={a.features.length ? "Continue" : "Skip"} />
            </>
          )}

          {name === "contact" && (
            <>
              <h3 className="wiz__q">Where should we send them?</h3>
              <HoneypotField inputRef={guard.hpRef} />
              <div className="hv-grid hv-grid--2">
                <div className="field"><label htmlFor="lqz-fn">First Name</label>
                  <input id="lqz-fn" className="input" type="text" autoComplete="given-name" value={a.firstName} onChange={(e) => set({ firstName: e.target.value })} /></div>
                <div className="field"><label htmlFor="lqz-ln">Last Name</label>
                  <input id="lqz-ln" className="input" type="text" autoComplete="family-name" value={a.lastName} onChange={(e) => set({ lastName: e.target.value })} /></div>
              </div>
              <div className="hv-grid hv-grid--2">
                <div className="field"><label htmlFor="lqz-em">Email</label>
                  <input id="lqz-em" className="input" type="email" autoComplete="email" value={a.email} onChange={(e) => set({ email: e.target.value })} /></div>
                {!A2P_REVIEW_MODE && (
                  <div className="field"><label htmlFor="lqz-ph">Phone</label>
                    <input id="lqz-ph" className="input" type="tel" autoComplete="tel" value={a.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
                )}
              </div>
              <Nav onBack={back} onNext={finish} canNext={contactOk && !submitting} nextLabel={submitting ? "Saving…" : "Send Me New Listings"} />
              <p className="hv-fine">By submitting you agree to be contacted by {site.name} about homes that fit your search. Opt out anytime.</p>
            </>
          )}

          {name === "done" && (
            <div className="lqz__done">
              <div className="quiz-check">✓</div>
              <h2 id="lqz-title" className="wiz__q">You&apos;re on the list{firstName ? `, ${firstName}` : ""}.</h2>
              <p>
                We&apos;ll send new homes in <strong>{areas}</strong> that fit what you told us as soon as they&apos;re listed.
                Want a head start?
              </p>
              <Link className="btn btn--primary" href={matchHref(a)} onClick={() => setOpen(false)}>See Homes That Match Now</Link>
              <a className="lqz__call" href={site.phoneHref}>Or call us at {site.phone}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Nav({ onBack, onNext, canNext, nextLabel = "Continue", hideNext }: { onBack?: () => void; onNext?: () => void; canNext?: boolean; nextLabel?: string; hideNext?: boolean }) {
  return (
    <div className="quiz-nav">
      {onBack ? <button className="quiz-back" onClick={onBack}>← Back</button> : <span />}
      {hideNext ? (
        <span className="quiz-autohint">Tap an option to continue</span>
      ) : (
        <button className="btn btn--primary" style={{ width: "auto", padding: "13px 26px" }} onClick={canNext ? onNext : undefined} disabled={!canNext}>{nextLabel}</button>
      )}
    </div>
  );
}

/** Any button that should open the popup (e.g. the post hero). */
export function OpenListingAlertsButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {children}
    </button>
  );
}
