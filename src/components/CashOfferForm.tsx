"use client";

import { useRef, useState } from "react";
import { site } from "@/config/site";

// Cash-offer request form for /sell-my-house-fast. Posts to the single
// /api/forms endpoint with the stable `cash_offer` form_id.
// Same spam protection as ContactForm: honeypot + minimum submit time,
// both enforced server-side in /api/forms.

const CITIES = [
  "Lake Charles", "Sulphur", "Moss Bluff", "Westlake", "Carlyss", "Iowa",
  "Vinton", "DeQuincy", "Ragley", "DeRidder", "Jennings", "Welsh", "Cameron",
];

export default function CashOfferForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const loadedAt = useRef<number>(Date.now());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const address = String(f.get("address") || "");
    const city = String(f.get("city") || "");
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: "cash_offer",
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          message: `Cash offer request for ${address}${city ? `, ${city}` : ""}. Condition: ${f.get("condition") || "—"}. Timeframe: ${f.get("timeframe") || "—"}. ${f.get("notes") || ""}`,
          criteria: {
            address, city,
            condition: f.get("condition"),
            timeframe: f.get("timeframe"),
            notes: f.get("notes"),
          },
          // Spam signals:
          company: f.get("company") || "", // honeypot — should be empty
          form_loaded_at: loadedAt.current,
          source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      if (res.ok) setSent(true);
      else setErr(`Something went wrong. Please call us at ${site.phone}.`);
    } catch {
      setErr(`Something went wrong. Please call us at ${site.phone}.`);
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="contact-sent">
        <span className="script" style={{ fontSize: "1.7rem" }}>request received!</span>
        <h3>We&apos;re on it — expect a fast offer.</h3>
        <p>
          We&apos;ll review your property and reach out with a no-obligation cash offer, plus what it
          could sell for on the open market. Need us sooner? Call or text{" "}
          <a href={site.phoneHref}><strong>{site.phone}</strong></a>.
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      {/* Honeypot — hidden from real users; bots tend to fill every field. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="co-company">Company (leave this blank)</label>
        <input type="text" id="co-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="field">
        <label>Property Address</label>
        <input className="input" type="text" name="address" autoComplete="street-address" placeholder="123 Main St" required />
      </div>
      <div className="hv-grid hv-grid--2">
        <div className="field">
          <label>City</label>
          <div className="qsel" style={{ width: "100%" }}>
            <select name="city" style={{ width: "100%" }} defaultValue="" required>
              <option value="" disabled>Select…</option>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
              <option>Other (SWLA)</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Condition</label>
          <div className="qsel" style={{ width: "100%" }}>
            <select name="condition" style={{ width: "100%" }} defaultValue="">
              <option value="" disabled>Select…</option>
              <option>Move-in ready</option>
              <option>Needs some work</option>
              <option>Needs major repairs</option>
              <option>Storm / water damage</option>
              <option>Fire damage</option>
              <option>Not sure</option>
            </select>
          </div>
        </div>
      </div>
      <div className="field">
        <label>How soon do you want to sell?</label>
        <div className="qsel" style={{ width: "100%" }}>
          <select name="timeframe" style={{ width: "100%" }} defaultValue="">
            <option value="" disabled>Select…</option>
            <option>ASAP — as fast as possible</option>
            <option>Within 30 days</option>
            <option>1–3 months</option>
            <option>Just exploring my options</option>
          </select>
        </div>
      </div>
      <div className="hv-grid hv-grid--2">
        <div className="field">
          <label>Full Name</label>
          <input className="input" type="text" name="name" autoComplete="name" required />
        </div>
        <div className="field">
          <label>Phone</label>
          <input className="input" type="tel" name="phone" autoComplete="tel" required />
        </div>
      </div>
      <div className="field">
        <label>Email</label>
        <input className="input" type="email" name="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label>Anything we should know? (optional)</label>
        <textarea className="input" name="notes" rows={3} placeholder="Inherited property, tenants in place, repairs needed…" />
      </div>
      {err && <p className="hv-err">{err}</p>}
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Sending…" : "Get My Cash Offer"}
      </button>
      <p className="hv-fine">
        100% free, no obligation. By submitting you agree to be contacted by The Land &amp; Home
        Group about your property. Consent is not a condition of any purchase or sale.
      </p>
    </form>
  );
}
