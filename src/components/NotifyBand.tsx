"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";

function label(c?: Record<string, unknown>): string {
  if (!c) return "My saved search";
  const parts: string[] = [];
  if (c.city) parts.push(String(c.city));
  if (c.beds) parts.push(`${c.beds}+ bd`);
  if (c.type) parts.push(String(c.type));
  if (c.zip) parts.push(String(c.zip));
  return parts.length ? parts.join(" · ") : "My saved search";
}

// "New listings to your inbox" band. Drives website sign-up: clicking it opens
// the account modal (if signed out), then saves this search to the user's
// account so they get alerts when matching homes hit the market.
export default function NotifyBand({ criteria }: { criteria?: Record<string, unknown> }) {
  const { user, openAuth } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveSearch() {
    const sb = getBrowserClient();
    const { data: { session } } = await sb.auth.getSession();
    const uid = session?.user.id;
    if (!uid) return;
    setBusy(true);
    await sb.from("saved_searches").insert({
      user_id: uid,
      email: session?.user.email ?? null,
      name: label(criteria),
      criteria: criteria ?? {},
      alert_frequency: "instant",
      active: true,
    });
    setBusy(false);
    setSaved(true);
  }

  function handleClick() {
    if (!user) { openAuth({ intent: "alerts", onAuthed: () => saveSearch() }); return; }
    saveSearch();
  }

  return (
    <div className="leadband">
      <div className="leadband__txt">
        <span className="script">be the first to know</span>
        <h3>New listings, straight to your inbox.</h3>
        <p>Create your free account and we&apos;ll send matching homes the moment they hit the market.</p>
      </div>
      {saved ? (
        <p className="leadband__ok">You&apos;re all set — we&apos;ll alert you when new matches hit the market.</p>
      ) : (
        <button className="leadband__btn" onClick={handleClick} disabled={busy}>
          {busy ? "Saving…" : user ? "Save this search & get alerts" : "Sign up for new-listing alerts"}
        </button>
      )}
    </div>
  );
}
