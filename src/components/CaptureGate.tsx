"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { site, getAdPage } from "@/config/site";
import { HoneypotField, useFormGuard } from "@/components/FormGuard";
import { A2P_REVIEW_MODE } from "@/config/a2p";

const KEY = "lhg_captured";
const AD_KEY = "lhg_ad_visit";
const PROPERTY = /^\/listings\/[^/]+/;

// Hard lead-capture gate for Google Ads visitors (/GA suffix or adPages in
// config/site.ts). The ad landing page itself is NOT gated: the visit is just
// flagged (sessionStorage), and the gate appears once they open a property
// (/listings/<key>). Renders nothing for everyone else.
// Same lead form as the listing page ("Get more details"): shared spam guard,
// form_id "listing_inquiry" + listing_key, so it flows through the normal pipeline.
export default function CaptureGate() {
  const pathname = usePathname();
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
    try { window.sessionStorage.setItem(AD_KEY, landing.current); } catch { /* ignore */ }
  }, [onAdPage]);

  // Gate only on a property page, for ad visitors (strip a trailing /GA first).
  const base = (pathname ?? "").replace(/\/ga\/?$/i, "");
  const enabled = (onAdPage || adVisit) && PROPERTY.test(base);
  const locked = enabled && !captured;

  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [locked]);

  if (!enabled || (checked && captured)) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const listingKey = base.split("/")[2];
      const ok = await guard.submit({
        form_id: "listing_inquiry",
        listing_key: listingKey,
        source_url: landing.current || window.location.pathname,
        name: f.get("name"),
        phone: f.get("phone"),
        email: f.get("email"),
        message: `Inquiry about listing ${listingKey} (Google Ads visitor)`,
      });
      if (!ok) throw new Error("bad");
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
        visibility: checked ? "visible" : "hidden",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={site.logoUrl} alt={site.name} style={{ height: 44, marginBottom: 14 }} />
        <h2 id="capture-title" style={{ margin: "0 0 6px" }}>View this home</h2>
        <p style={{ margin: "0 0 18px", color: "var(--ink-muted)" }}>
          Tell us where to reach you and we&apos;ll show you the full details.
        </p>
        <HoneypotField inputRef={guard.hpRef} />
        <input className="input" name="name" type="text" placeholder="Full name" required autoComplete="name" />
        {!A2P_REVIEW_MODE && (
          <input className="input" name="phone" type="tel" placeholder="Phone" required autoComplete="tel" />
        )}
        <input className="input" name="email" type="email" placeholder="Email" required autoComplete="email" />
        {err && <p className="hv-err">{err}</p>}
        <button className="btn btn--primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "One moment…" : "Continue"}
        </button>
        <p className="hv-fine">
          By continuing you agree to be contacted by The Land &amp; Home Group. Consent is not a
          condition of any purchase or sale.
        </p>
      </form>
    </div>
  );
}
