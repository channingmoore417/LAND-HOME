"use client";

import { useState } from "react";

// The "new listings to your inbox" lead band inside the results grid.
// Posts a saved_search to the single /api/forms endpoint.
export default function NotifyBand({ criteria }: { criteria?: Record<string, unknown> }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_id: "saved_search",
        email: fd.get("email"),
        phone: fd.get("phone"),
        criteria: criteria ?? {},
        alert_frequency: "instant",
        source_url: typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined,
      }),
    });
    setBusy(false);
    if (res.ok) setSent(true);
  }

  return (
    <div className="leadband">
      <div className="leadband__txt">
        <span className="script">be the first to know</span>
        <h3>New listings, straight to your inbox.</h3>
        <p>Tell us what you&apos;re looking for and we&apos;ll send matching homes the moment they hit the market.</p>
      </div>
      {sent ? (
        <p className="leadband__ok">You&apos;re on the list — we&apos;ll be in touch with new matches.</p>
      ) : (
        <form className="leadband__form" onSubmit={handleSubmit}>
          <input type="email" name="email" placeholder="Your email" required />
          <input type="tel" name="phone" placeholder="Phone" />
          <button type="submit" disabled={busy}>{busy ? "Saving…" : "Notify Me"}</button>
        </form>
      )}
    </div>
  );
}
