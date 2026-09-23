"use client";

import { useState } from "react";
import { A2P_REVIEW_MODE } from "@/config/a2p";
import { HoneypotField, useFormGuard } from "@/components/FormGuard";

// "Start Your Home Search" card on the buyer's agent page. Posts through the
// shared /api/forms pipeline as a buyer_quiz lead, so it reaches GHL on the
// existing buyer webhook with the same mapped fields as the buyer quiz.

const AREAS = [
  "Lake Charles", "Sulphur", "Moss Bluff", "Carlyss", "Westlake", "Iowa",
  "Vinton", "DeQuincy", "Ragley", "Jennings", "Not sure yet",
];
const PRICES = [
  "Under $150,000", "$150,000 to $250,000", "$250,000 to $350,000",
  "$350,000 to $500,000", "$500,000 and up",
];
const TIMELINES = ["Ready now", "Next 3 months", "3 to 6 months", "Just starting to look"];

export default function BuyerAgentForm() {
  const guard = useFormGuard();
  const [f, setF] = useState({ first: "", last: "", phone: "", email: "", area: "", price: "", timeline: "" });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const ok = f.first.trim() && f.last.trim() && /\S+@\S+\.\S+/.test(f.email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ok || state === "sending") return;
    setState("sending");
    try {
      const sent = await guard.submit({
        form_id: "buyer_quiz",
        name: `${f.first.trim()} ${f.last.trim()}`,
        first_name: f.first.trim(),
        last_name: f.last.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        message: `Buyer's agent page · ${f.area || "any area"} · ${f.price || "any price"} · ${f.timeline || "no timeline given"}`,
        criteria: {
          communities: f.area && f.area !== "Not sure yet" ? [f.area] : [],
          price: f.price,
          timeline: f.timeline,
          listing_alerts: true,
          quiz_source: "buyers_agent_page",
        },
      });
      setState(sent ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="ba-form ba-form--done" role="status">
        <h2 className="ba-form__h">You're All Set</h2>
        <p>Thanks, {f.first.trim()}. We'll call or text you shortly to confirm what you're looking for, then start sending matching homes.</p>
      </div>
    );
  }

  return (
    <form className="ba-form" onSubmit={submit} noValidate>
      <h2 className="ba-form__h">Start Your Home Search</h2>
      <p className="ba-form__sub">
        Tell us what you are looking for and we will send matching listings, including ones that are not on the big search sites yet.
      </p>
      <HoneypotField inputRef={guard.hpRef} />
      <div className="ba-form__row">
        <label className="ba-field"><span>First Name</span>
          <input className="input" autoComplete="given-name" value={f.first} onChange={set("first")} required /></label>
        <label className="ba-field"><span>Last Name</span>
          <input className="input" autoComplete="family-name" value={f.last} onChange={set("last")} required /></label>
      </div>
      <div className="ba-form__row">
        {!A2P_REVIEW_MODE && (
          <label className="ba-field"><span>Phone</span>
            <input className="input" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} /></label>
        )}
        <label className="ba-field"><span>Email</span>
          <input className="input" type="email" autoComplete="email" value={f.email} onChange={set("email")} required /></label>
      </div>
      <label className="ba-field"><span>Area</span>
        <select className="input" value={f.area} onChange={set("area")}>
          <option value="">Choose an area</option>
          {AREAS.map((a) => <option key={a}>{a}</option>)}
        </select></label>
      <div className="ba-form__row">
        <label className="ba-field"><span>Price Range</span>
          <select className="input" value={f.price} onChange={set("price")}>
            <option value="">Choose a range</option>
            {PRICES.map((a) => <option key={a}>{a}</option>)}
          </select></label>
        <label className="ba-field"><span>Timeline</span>
          <select className="input" value={f.timeline} onChange={set("timeline")}>
            <option value="">Choose a timeline</option>
            {TIMELINES.map((a) => <option key={a}>{a}</option>)}
          </select></label>
      </div>
      <button className="btn btn--primary ba-form__btn" type="submit" disabled={!ok || state === "sending"}>
        {state === "sending" ? "Sending..." : "Send My Listings"}
      </button>
      {state === "error" && <p className="ba-form__err">Something went wrong. Please call or text us instead.</p>}
      <p className="ba-form__fine">
        We will reach out by call or text to confirm what you are looking for. No spam, and you can stop the alerts any time.
      </p>
    </form>
  );
}
