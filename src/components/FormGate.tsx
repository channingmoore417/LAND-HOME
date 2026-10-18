"use client";

import { HoneypotField } from "@/components/FormGuard";
import { site } from "@/config/site";
import PropertyFields from "@/components/PropertyFields";
import HiddenField from "@/components/HiddenField";
import type { PropertyInfo } from "@/lib/propertyInfo";

interface Contact { email: string; firstName: string; lastName: string; phone: string }

// Standard two-step capture form (the default listing gate):
//   step 1  "Create your free account": Continue with Google / Facebook, or email
//   step 2  "Last step": first + last name and phone (phone is also the password)
// Presentational: CaptureGate owns the state, the lead POST and account creation.
// Official brand marks for the sign-in buttons (inline SVG so they never fail to load).
function GoogleLogo() {
  return (
    <svg className="qg__logo" width="22" height="22" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
function FacebookLogo() {
  // Facebook's standard white "f" (the glyph, not the circle) on the blue button.
  return (
    <svg className="qg__logo" width="22" height="22" viewBox="0 0 320 512" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <path fill="#fff" d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
    </svg>
  );
}

export default function FormGate({
  a, set, step, setStep, busy, err, hpRef, onSubmit, onOAuth, providers, property, variant,
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
  property: PropertyInfo | null;
  variant: "two" | "single";
}) {
  const emailOk = /\S+@\S+\.\S+/.test(a.email.trim());
  const single = variant === "single";
  const detailsOk = !!a.firstName.trim() && !!a.lastName.trim() && a.phone.replace(/\D/g, "").length >= 10;

  return (
    <div className="qg" role="dialog" aria-modal="true" aria-labelledby="capture-title">
      <form
        name="Property-Inquiry" id="Property-Inquiry"
        className="qg__sheet"
        onSubmit={(e) => {
          e.preventDefault();
          if (single) { if (emailOk && detailsOk && !busy) onSubmit(); }
          else if (step === 0) { if (emailOk) setStep(1); } else if (detailsOk && !busy) onSubmit();
        }}
        // Step 1 is a plain button, never a submit, so GoHighLevel's tracker sees
        // exactly ONE form submission per visitor (the last step), not two.
      >
        <header className="qg__top">
          {single ? <span className="qg__icon" /> : step > 0 ? <button type="button" className="qg__icon" onClick={() => setStep(0)} aria-label="Back">←</button> : <span className="qg__icon" />}
          <div className="qg__bar" aria-hidden="true" style={single ? { visibility: "hidden" } : undefined}><div style={{ width: step === 0 ? "50%" : "100%" }} /></div>
          <span className="qg__icon" />
        </header>

        <div className="qg__body" key={step}>
          <HoneypotField inputRef={hpRef} />
          {/* Named fields: GoHighLevel tracking reads these on submit. */}
          <PropertyFields p={property} inquiry="Property Inquiry" />

          {single && (<>
            <p className="qg__eyebrow">Unlock this home + every listing</p>
            <h2 id="capture-title" className="qg__q">Create your free account to see this home</h2>
            <p className="qg__hint">You&apos;ll also get an email the day new homes hit the market. Your phone number is also your password.</p>
            <label className="qg__sr" htmlFor="qg-first">First name</label>
            <input
              id="qg-first" name="first_name" className="qg__input" type="text" autoComplete="given-name" enterKeyHint="next"
              autoCapitalize="words" autoCorrect="off" spellCheck={false} placeholder="First name"
              value={a.firstName} onChange={(e) => set({ firstName: e.target.value })}
            />
            <label className="qg__sr" htmlFor="qg-last">Last name</label>
            <input
              id="qg-last" name="last_name" className="qg__input qg__input--2nd" type="text" autoComplete="family-name" enterKeyHint="next"
              autoCapitalize="words" autoCorrect="off" spellCheck={false} placeholder="Last name"
              value={a.lastName} onChange={(e) => set({ lastName: e.target.value })}
            />
            <label className="qg__sr" htmlFor="qg-email">Email address</label>
            <input
              id="qg-email" name="email" className="qg__input qg__input--2nd" type="email" autoComplete="email" inputMode="email"
              enterKeyHint="next" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="Email address" value={a.email} onChange={(e) => set({ email: e.target.value })}
            />
            <label className="qg__sr" htmlFor="qg-phone">Phone number</label>
            <input
              id="qg-phone" name="phone" className="qg__input qg__input--2nd" type="tel" autoComplete="tel" inputMode="tel" enterKeyHint="go"
              placeholder="Phone number" value={a.phone} onChange={(e) => set({ phone: e.target.value })}
            />
            {err && <p className="hv-err" style={{ marginTop: 10 }}>{err}</p>}
            <button type="submit" className="qg__cta" disabled={!emailOk || !detailsOk || busy}>{busy ? "One moment…" : "Show me this home →"}</button>
            <p className="qg__legal">
              Already signed up? Enter your email and phone and we&apos;ll log you in. By continuing you agree to be contacted by {site.name},
              including new-listing alerts, by call, text and email. Consent is not a condition of any purchase or sale.
            </p>
          </>)}

          {!single && step === 0 && (<>
            <p className="qg__eyebrow">Unlock this home + every listing</p>
            <h2 id="capture-title" className="qg__q">Create your free account to see this home</h2>
            <p className="qg__hint">You&apos;ll also get an email the day new homes hit the market.</p>

            {providers.google && (
              <button type="button" className="qg__oauth" onClick={() => onOAuth("google")}>
                <GoogleLogo /> <span>Continue with Google</span>
              </button>
            )}
            {providers.facebook && (
              <button type="button" className="qg__oauth qg__oauth--fb" onClick={() => onOAuth("facebook")}>
                <FacebookLogo /> <span>Continue with Facebook</span>
              </button>
            )}
            {(providers.google || providers.facebook) && <div className="qg__or"><span>or</span></div>}

            <label className="qg__sr" htmlFor="qg-email">Email address</label>
            <input
              id="qg-email" name="email" className="qg__input" type="email" autoComplete="email" inputMode="email"
              enterKeyHint="next" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="Email address" value={a.email} onChange={(e) => set({ email: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (emailOk) setStep(1); } }}
            />
            {err && <p className="hv-err" style={{ marginTop: 10 }}>{err}</p>}
            <button type="button" className="qg__cta" disabled={!emailOk} onClick={() => setStep(1)}>Continue with email →</button>
            <p className="qg__legal">Already signed up? Continue with your email and phone and we&apos;ll log you in.</p>
          </>)}

          {!single && step === 1 && (<>
            {/* The email input is unmounted on this step; keep it in the form so the submitted fields include it. */}
            <HiddenField name="email" value={a.email.trim()} />
            <h2 id="capture-title" className="qg__q">Last step: where can we reach you?</h2>
            <p className="qg__hint">Your phone number is also your password.</p>
            <label className="qg__sr" htmlFor="qg-first">First name</label>
            <input
              id="qg-first" name="first_name" className="qg__input" type="text" autoComplete="given-name" enterKeyHint="next"
              autoCapitalize="words" autoCorrect="off" spellCheck={false} autoFocus placeholder="First name"
              value={a.firstName} onChange={(e) => set({ firstName: e.target.value })}
            />
            <label className="qg__sr" htmlFor="qg-last">Last name</label>
            <input
              id="qg-last" name="last_name" className="qg__input qg__input--2nd" type="text" autoComplete="family-name" enterKeyHint="next"
              autoCapitalize="words" autoCorrect="off" spellCheck={false} placeholder="Last name"
              value={a.lastName} onChange={(e) => set({ lastName: e.target.value })}
            />
            <label className="qg__sr" htmlFor="qg-phone">Phone number</label>
            <input
              id="qg-phone" name="phone" className="qg__input qg__input--2nd" type="tel" autoComplete="tel" inputMode="tel" enterKeyHint="go"
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
