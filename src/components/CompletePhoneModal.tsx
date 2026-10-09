"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { site } from "@/config/site";

// Shown to a signed-in user whose profile has no phone number — in practice,
// anyone who registered through Google OAuth, which skips the regular sign-up
// form (where phone is required because it doubles as the password).
// Deliberately not dismissible: the account isn't complete without a phone.
export default function CompletePhoneModal({ onDone }: { onDone: () => void }) {
  const supabase = getBrowserClient();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setErr("Please enter your 10-digit phone number.");
      return;
    }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const u = userData.user;
    if (!u) {
      setLoading(false);
      setErr("You've been signed out — please sign in again.");
      return;
    }
    // Upsert rather than update: covers the rare case where the profile row
    // hasn't been created yet when this runs.
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: u.id, email: u.email ?? null, phone: digits });
    setLoading(false);
    if (error) {
      setErr("We couldn't save that — please try again.");
      return;
    }
    onDone();
  }

  return (
    <div className="authm" role="dialog" aria-modal="true">
      <div className="authm__card">
        <h2 className="authm__title">One last step.</h2>
        <p className="prose" style={{ marginBottom: 16 }}>
          Add your phone number to finish creating your account.
        </p>
        <div className="field">
          <label>Phone Number *</label>
          <input
            className="input"
            type="tel"
            autoComplete="tel"
            placeholder="(337) 555-0123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
          />
        </div>
        {err && <p className="hv-err">{err}</p>}
        <button
          type="button"
          className="btn btn--primary"
          style={{ width: "100%" }}
          onClick={save}
          disabled={loading}
        >
          {loading ? "One moment…" : "Save & Continue"}
        </button>
        <p className="authm__legal">
          By registering on {site.name.toLowerCase().includes("the") ? "" : "the "}{site.name} website, you consent to receive
          calls, texts, and emails from {site.name}, brokered by {site.brokerage}, regarding real estate matters.
          This consent allows us to contact you in compliance with the Telephone Consumer Protection Act (TCPA) and
          Do Not Call (DNC) guidelines. Consent is not a condition of purchase; you can opt out anytime.
        </p>
      </div>
    </div>
  );
}
