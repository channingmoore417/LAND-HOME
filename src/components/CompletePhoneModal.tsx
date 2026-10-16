"use client";

import { trackBuyerRegistration } from "@/lib/ads";
import { useState } from "react";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { site, AD_VISIT_KEY } from "@/config/site";
import { useFormGuard } from "@/components/FormGuard";

// Shown to a signed-in user whose profile has no phone number — in practice,
// anyone who registered through Google OAuth, which skips the regular sign-up
// form (where phone is required because it doubles as the password).
// Deliberately not dismissible: the account isn't complete without a phone.
export default function CompletePhoneModal({ onDone }: { onDone: () => void }) {
  const supabase = getBrowserClient();
  const guard = useFormGuard();
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
    if (error) {
      setLoading(false);
      setErr("We couldn't save that — please try again.");
      return;
    }
    // One-tap sign-ups skip the lead form, so send the lead now that we have a phone.
    try {
      const full = String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? "").trim();
      const [first, ...rest] = full.split(/\s+/);
      const m = window.location.pathname.match(/^\/listings\/([^/]+)/);
      let isAd = false;
      try { isAd = !!window.sessionStorage.getItem(AD_VISIT_KEY); } catch { /* ignore */ }
      await guard.submit({
        form_id: isAd ? "ad_capture" : "buyer_quiz",
        listing_key: m?.[1],
        name: full, first_name: first ?? "", last_name: rest.join(" "),
        phone: digits, email: u.email ?? "",
        message: `Inquiry about listing ${m?.[1] ?? "(site)"} (Google/Facebook sign-in${isAd ? ", Google Ads visitor" : ""}) · wants new-listing alerts`,
        criteria: { quiz_source: "listing_gate_oauth", listing_alerts: true },
      });
      try { window.localStorage.setItem("lhg_captured", "1"); } catch { /* ignore */ }
      (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "generate_lead", { method: "oauth", traffic: isAd ? "ad" : "organic" });
      trackBuyerRegistration(isAd);
      window.dispatchEvent(new Event("lhg:captured"));
    } catch { /* never block the account on the lead post */ }
    setLoading(false);
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
