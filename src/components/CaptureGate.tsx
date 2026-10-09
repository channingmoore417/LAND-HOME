"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { site, getAdPage } from "@/config/site";

const KEY = "lhg_captured";

// Hard lead-capture gate for opt-in Google Ads landing pages only
// (see adPages in config/site.ts). Renders nothing on every other page.
// Posts to the single /api/forms webhook with form_id "ad_capture".
export default function CaptureGate() {
  const pathname = usePathname();
  const enabled = !!getAdPage(pathname)?.capture;
  const [captured, setCaptured] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const loadedAt = useRef<number>(Date.now());

  useEffect(() => {
    try { setCaptured(window.localStorage.getItem(KEY) === "1"); } catch { /* private mode */ }
    setChecked(true);
  }, []);

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
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: "ad_capture",
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          company: f.get("company") || "",
          form_loaded_at: loadedAt.current,
          source_url: window.location.pathname + window.location.search,
        }),
      });
      if (!res.ok) throw new Error("bad");
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
        <h2 id="capture-title" style={{ margin: "0 0 6px" }}>See the homes &amp; get started</h2>
        <p style={{ margin: "0 0 18px", color: "var(--ink-muted)" }}>
          Tell us where to reach you and we&apos;ll unlock the page.
        </p>
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="cg-company">Company (leave blank)</label>
          <input type="text" id="cg-company" name="company" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="field"><label>Full Name</label><input className="input" name="name" required autoComplete="name" /></div>
        <div className="field"><label>Phone</label><input className="input" type="tel" name="phone" required autoComplete="tel" /></div>
        <div className="field"><label>Email</label><input className="input" type="email" name="email" required autoComplete="email" /></div>
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
