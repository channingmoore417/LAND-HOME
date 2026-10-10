"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { site, getAdPage, AD_VISIT_KEY as AD_KEY } from "@/config/site";
import { HoneypotField, useFormGuard } from "@/components/FormGuard";
import { A2P_REVIEW_MODE } from "@/config/a2p";
import { namePayload } from "@/lib/formName";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";

const KEY = "lhg_captured";
const PROPERTY = /^\/listings\/[^/]+/;

// Hard lead-capture gate for Google Ads visitors (/GA suffix or adPages in
// config/site.ts). The ad landing page itself is NOT gated: the visit is just
// flagged (sessionStorage), and the gate appears once they open a property
// (/listings/<key>). Renders nothing for everyone else.
// Submitting also creates the visitor's free account (same scheme as the
// Register modal: the phone number is the password), which unlocks saved
// homes and alerts. A visitor who is already signed in never sees the gate.
// Same lead form as the listing page ("Get more details"): shared spam guard,
// form_id "ad_capture" + listing_key, so it flows through the normal pipeline.
export default function CaptureGate() {
  const pathname = usePathname();
  const { user, ready } = useAuth();
  const onAdPage = !!getAdPage(pathname)?.capture;
  const [adVisit, setAdVisit] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const guard = useFormGuard();
  const landing = useRef<string>("");

  useEffect(() => {
    try {
      setCaptured(window.localStorage.getItem(KEY) === "1");
      const v = window.sessionStorage.getItem(AD_KEY);
      setAdVisit(!!v);
      if (v) landing.current = v;
    } catch { /* private mode */ }
    setChecked(true);
  }, []);

  // Landing on any ad page flags the whole visit (survives client navigation).
  useEffect(() => {
    if (!onAdPage) return;
    setAdVisit(true);
    // Remember the ad landing URL (incl. /GA, gclid/UTMs) for lead attribution.
    landing.current = window.location.pathname + window.location.search;
    document.documentElement.dataset.ad = "1";
    try { window.sessionStorage.setItem(AD_KEY, landing.current); } catch { /* ignore */ }
  }, [onAdPage]);

  // Gate only on a property page, for ad visitors (strip a trailing /GA first).
  const base = (pathname ?? "").replace(/\/ga\/?$/i, "");
  const enabled = (onAdPage || adVisit) && PROPERTY.test(base);
  const locked = enabled && !captured && !user;

  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [locked]);

  if (!enabled || (checked && ready && (captured || user))) return null;

  async function createAccount(f: FormData) {
    const email = String(f.get("email") ?? "").trim();
    const phone = String(f.get("phone") ?? "");
    const password = phone.replace(/\D/g, "");
    if (!email || password.length < 6) return;
    const { name: full_name } = namePayload(f);
    try {
      const supabase = getBrowserClient();
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } });
      if (error) {
        // Already registered: sign them in with their phone (if it matches).
        await supabase.auth.signInWithPassword({ email, password });
        return;
      }
      if (!data.session) await supabase.auth.signInWithPassword({ email, password });
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (uid) await supabase.from("profiles").update({ full_name, phone }).eq("id", uid);
    } catch { /* lead already saved */ }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const listingKey = base.split("/")[2];
      const ok = await guard.submit({
        form_id: "ad_capture",
        listing_key: listingKey,
        source_url: landing.current || window.location.pathname,
        ...namePayload(f),
        phone: f.get("phone"),
        email: f.get("email"),
        message: `Inquiry about listing ${listingKey} (Google Ads visitor) · wants new-listing alerts`,
      });
      if (!ok) throw new Error("bad");
      // Lead is captured; now create the account. Best effort — a failure here
      // (e.g. email already registered with a different phone) never blocks them.
      await createAccount(f);
      try { window.localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
      setCaptured(true);
    } catch {
      setErr(`Something went wrong. Please call us at ${site.phone}.`);
    }
    setBusy(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="capture-title"
      style={{
        position: "fixed", inset: 0, zIndex: 1000, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
        background: "rgba(22,56,72,.82)", backdropFilter: "blur(8px)",
        // Hidden until we know the visitor hasn't already submitted (no flash).
        visibility: checked && ready ? "visible" : "hidden",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* The logo is white, so it sits on the brand teal. */}
        <div style={{ background: "var(--teal)", borderRadius: 12, padding: "10px 16px", display: "inline-block", marginBottom: 14 }}>
          <img src={site.logoUrl} alt={site.name} style={{ height: 36, display: "block" }} />
        </div>
        <h2 id="capture-title" style={{ margin: "0 0 6px" }}>Sign In To Get All The Details On This Home</h2>
        <p style={{ margin: "0 0 18px", color: "var(--ink-muted)" }}>
          Create your free account to see everything and get alerted when new homes hit the market.
        </p>
        <HoneypotField inputRef={guard.hpRef} />
        <div className="namerow">
          <input className="input" name="first_name" type="text" placeholder="First name" required autoComplete="given-name" />
          <input className="input" name="last_name" type="text" placeholder="Last name" required autoComplete="family-name" />
        </div>
        {!A2P_REVIEW_MODE && (
          <input className="input" name="phone" type="tel" placeholder="Enter your phone for your password" required autoComplete="tel" />
        )}
        <input className="input" name="email" type="email" placeholder="Email" required autoComplete="email" />
        {err && <p className="hv-err">{err}</p>}
        <button className="btn btn--primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "One moment…" : "Create Free Account"}
        </button>
        <p className="hv-fine">
          By creating an account you agree to be contacted by The Land &amp; Home Group, including new-listing alerts. Consent is not a
          condition of any purchase or sale.
        </p>
      </form>
    </div>
  );
}
