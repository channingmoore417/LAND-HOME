"use client";

import { useState } from "react";
import { site } from "@/config/site";
import { HoneypotField, useFormGuard } from "@/components/FormGuard";
import { A2P_REVIEW_MODE } from "@/config/a2p";

// Standalone contact form for the /contact page. Posts to the single
// /api/forms endpoint with the stable `contact` form_id.
//
// Spam signals come from useFormGuard() and are scored server-side in
// src/lib/spam.ts; the client never decides anything itself.
export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const guard = useFormGuard();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const ok = await guard.submit({
        form_id: "contact",
        name: f.get("name"),
        email: f.get("email"),
        phone: f.get("phone"),
        message: `[${f.get("topic") || "General"}] ${f.get("message") || ""}`,
      });
      if (ok) setSent(true);
      else setErr(`Something went wrong. Please call us at ${site.phone}.`);
    } catch {
      setErr(`Something went wrong. Please call us at ${site.phone}.`);
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="contact-sent">
        <span className="script" style={{ fontSize: "1.7rem" }}>message sent!</span>
        <h3>Thanks — we&apos;ll be in touch shortly.</h3>
        <p>
          We typically reply the same business day. Need something now? Call or text us at{" "}
          <a href={site.phoneHref}><strong>{site.phone}</strong></a>.
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <HoneypotField inputRef={guard.hpRef} />
      <div className="hv-grid hv-grid--2">
        <div className="field">
          <label>Full Name</label>
          <input className="input" type="text" name="name" required />
        </div>
        {!A2P_REVIEW_MODE && (
          <div className="field">
            <label>Phone</label>
            <input className="input" type="tel" name="phone" required />
          </div>
        )}
      </div>
      <div className="field">
        <label>Email</label>
        <input className="input" type="email" name="email" required />
      </div>
      <div className="field">
        <label>How can we help?</label>
        <div className="qsel" style={{ width: "100%" }}>
          <select name="topic" style={{ width: "100%" }} defaultValue="">
            <option value="" disabled>Select a topic…</option>
            <option>Buying a home</option>
            <option>Selling my home</option>
            <option>Scheduling a tour</option>
            <option>Home valuation</option>
            <option>Mortgage / pre-approval</option>
            <option>Something else</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label>Message</label>
        <textarea className="input" name="message" rows={5} placeholder="Tell us a little about what you're looking for…" />
      </div>
      {err && <p className="hv-err">{err}</p>}
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Sending…" : "Send Message"}
      </button>
      <p className="hv-fine">
        By submitting you agree to be contacted by The Land &amp; Home Group. Consent is not a
        condition of any purchase or sale.
      </p>
    </form>
  );
}
