"use client";

import { HoneypotField } from "@/components/FormGuard";
import { site } from "@/config/site";

interface Contact { email: string; firstName: string; lastName: string; phone: string }

// Standard two-step capture form (the default listing gate):
//   step 1  "Create your free account": Continue with Google / Facebook, or email
//   step 2  "Last step": first + last name and phone (phone is also the password)
// Presentational: CaptureGate owns the state, the lead POST and account creation.
export default function FormGate({
  a, set, step, setStep, busy, err, hpRef, onSubmit, onOAuth, providers,
}: {
  a: Contact;
  set: (p: Partial<Contact>) => void;
  step: number;
  setStep: (n: number) => void;
  busy: boolean;
  err: string;
  hpRef: React.MutableRefObject<HTMLInputElement | null>;
  onSubmit: () => void;
  onOAuth: (provider: "google" | "facebook") => void;
  providers: { google: boolean; facebook: boolean };
}) {
  const emailOk = /\S+@\S+\.\S+/.test(a.email.trim());
  const detailsOk = !!a.firstName.trim() && !!a.lastName.trim() && a.phone.replace(/\D/g, "").length >= 10;

  return (
    <div className="qg" role="dialog" aria-modal="true" aria-labelledby="capture-title">
      <form
        className="qg__sheet"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 0) { if (emailOk) setStep(1); } else if (detailsOk && !busy) onSubmit();
        }}
      >
        <header className="qg__top">
          {step > 0 ? <button type="button" className="qg__icon" onClick={() => setStep(0)} aria-label="Back">←</button> : <span className="qg__icon" />}
          <div className="qg__bar" aria-hidden="true"><div style={{ width: step === 0 ? "50%" : "100%" }} /></div>
          <span className="qg__icon" />
        </header>

        <div className="qg__body" key={step}>
          <HoneypotField inputRef={hpRef} />

          {step === 0 && (<>
            <p className="qg__eyebrow">Unlock this home + every listing</p>
            <h2 id="capture-title" className="qg__q">Create your free account to see this home</h2>
            <p className="qg__hint">You&apos;ll also get an email the day new homes hit the market.</p>

            {providers.google && (
              <button type="button" className="qg__oauth" onClick={() => onOAuth("google")}>
                <span className="qg__oauth-g" aria-hidden="true">G</span> Continue with Google
              </button>
            )}
            {providers.facebook && (
              <button type="button" className="qg__oauth qg__oauth--fb" onClick={() => onOAuth("facebook")}>
                <span className="qg__oauth-f" aria-hidden="true">f</span> Continue with Facebook
              </button>
            )}
            {(providers.google || providers.facebook) && <div className="qg__or"><span>or</span></div>}

            <label className="qg__sr" htmlFor="qg-email">Email address</label>
            <input
              id="qg-email" className="qg__input" type="email" autoComplete="email" inputMode="email"
              enterKeyHint="next" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="Email address" value={a.email} onChange={(e) => set({ email: e.target.value })}
            />
            {err && <p className="hv-err" style={{ marginTop: 10 }}>{err}</p>}
            <button type="submit" className="qg__cta" disabled={!emailOk}>Continue with email →</button>
            <p className="qg__legal">Already signed up? Continue with your email and phone and we&apos;ll log you in.</p>
          </>)}

          {step === 1 && (<>
            <h2 id="capture-title" className="qg__q">Last step: where can we reach you?</h2>
            <p className="qg__hint">Your phone number is also your password.</p>
            <label className="qg__sr" htmlFor="qg-first">First name</label>
            <input
              id="qg-first" className="qg__input" type="text" autoComplete="given-name" enterKeyHint="next"
              autoCapitalize="words" autoCorrect="off" spellCheck={false} autoFocus placeholder="First name"
              value={a.firstName} onChange={(e) => set({ firstName: e.target.value })}
            />
            <label className="qg__sr" htmlFor="qg-last">Last name</label>
            <input
              id="qg-last" className="qg__input qg__input--2nd" type="text" autoComplete="family-name" enterKeyHint="next"
              autoCapitalize="words" autoCorrect="off" spellCheck={false} placeholder="Last name"
              value={a.lastName} onChange={(e) => set({ lastName: e.target.value })}
            />
            <label className="qg__sr" htmlFor="qg-phone">Phone number</label>
            <input
              id="qg-phone" className="qg__input qg__input--2nd" type="tel" autoComplete="tel" inputMode="tel" enterKeyHint="go"
              placeholder="Phone number" value={a.phone} onChange={(e) => set({ phone: e.target.value })}
            />
            {err && <p className="hv-err" style={{ marginTop: 10 }}>{err}</p>}
            <button type="submit" className="qg__cta" disabled={!detailsOk || busy}>{busy ? "One moment…" : "Show me this home →"}</button>
            <p className="qg__legal">
              By continuing you agree to be contacted by {site.name}, including new-listing alerts, by call, text and email.
              Consent is not a condition of any purchase or sale.
            </p>
          </>)}
        </div>
      </form>
    </div>
  );
}
