"use client";

import { useRef, useState } from "react";

// Standalone contact form for the /contact page. Posts to the single
// /api/forms endpoint with the stable `contact` form_id.
//
// Spam protection (no external service / keys required):
//   1. Honeypot field ("company") — hidden from humans; bots fill it.
//   2. Minimum submit time — the form's load timestamp is sent so the
//      server can reject submissions completed in under a couple seconds.
// Both are ENFORCED server-side in /api/forms; the client just supplies
// the signals and silently shows success so bots get no useful feedback.
export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const loadedAt = useRef<number>(Date.now());

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
          form_id: "contact",
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          message: `[${f.get("topic") || "General"}] ${f.get("message") || ""}`,
          // Spam signals:
          company: f.get("company") || "", // honeypot — should be empty
          form_loaded_at: loadedAt.current,
          source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      if (res.ok) setSent(true);
      else setErr("Something went wrong. Please call us at (337) 245-0909.");
    } catch {
      setErr("Something went wrong. Please call us at (337) 245-0909.");
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
          <a href="tel:+13372450909"><strong>(337) 245-0909</strong></a>.
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      {/* Honeypot — hidden from real users; bots tend to fill every field. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="company">Company (leave this blank)</label>
        <input
          type="text"
          id="company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="hv-grid hv-grid--2">
        <div className="field">
          <label>Full Name</label>
          <input className="input" type="text" name="name" required />
        </div>
        <div className="field">
          <label>Phone</label>
          <input className="input" type="tel" name="phone" required />
        </div>
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
