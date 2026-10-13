"use client";

import { useEffect, useRef, useState } from "react";
import { COMMUNITIES } from "@/lib/buyerMatch";
import { PRICES, TYPES, MUST_HAVES } from "@/lib/alerts/options";

export interface AdjustInitial {
  cities: string[]; priceMin: string; priceMax: string; bedsMin: string; bathsMin: string; type: string; features: string[];
  freq: "instant" | "daily" | "weekly";
}

// The client's own "adjust the homes I'm getting" form (link in every alert email).
export default function AdjustForm({ token, firstName, initial }: { token: string; firstName: string | null; initial: AdjustInitial }) {
  const [f, setF] = useState(initial);
  const [count, setCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof AdjustInitial>(k: K, v: AdjustInitial[K]) => { setSaved(false); setF((x) => ({ ...x, [k]: v })); };
  const toggle = (k: "cities" | "features", v: string) => { setSaved(false); setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((i) => i !== v) : [...x[k], v] })); };

  const criteria = () => ({
    cities: f.cities,
    priceMin: f.priceMin ? Number(f.priceMin) : undefined, priceMax: f.priceMax ? Number(f.priceMax) : undefined,
    bedsMin: f.bedsMin ? Number(f.bedsMin) : undefined, bathsMin: f.bathsMin ? Number(f.bathsMin) : undefined,
    type: f.type || undefined, features: f.features,
  });

  const seq = useRef(0);
  useEffect(() => {
    if (f.cities.length === 0) { setCount(null); return; }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const r = await fetch("/api/alerts/adjust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "preview", criteria: criteria() }) });
      const j = await r.json().catch(() => ({}));
      if (mine === seq.current && j.ok) setCount(j.count);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.cities, f.priceMin, f.priceMax, f.bedsMin, f.bathsMin, f.type, f.features]);

  const priceBad = !!(f.priceMin && f.priceMax && Number(f.priceMin) > Number(f.priceMax));

  async function save() {
    setSaving(true); setMsg("");
    const r = await fetch("/api/alerts/adjust", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "save", criteria: criteria(), digest_frequency: f.freq }) });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (r.ok && j.ok) { setSaved(true); setMsg("Saved. From now on you'll get homes that match this."); }
    else setMsg(j.error || "Something went wrong. Please try again, or reply to any of our emails.");
  }

  return (
    <div className="su" style={{ maxWidth: 720 }}>
      <h1 className="su-h1">Adjust the homes you&apos;re getting</h1>
      <p className="su-sub">{firstName ? `${firstName}, change` : "Change"} anything below and we&apos;ll match your next emails to it.</p>

      <div className="su-card">
        <p className="su-q">Where do you want to live?</p>
        <div className="su-chips">
          {COMMUNITIES.map((c) => (
            <button key={c} type="button" className={`su-chip${f.cities.includes(c) ? " is-on" : ""}`} onClick={() => toggle("cities", c)}>{f.cities.includes(c) && "✓ "}{c}</button>
          ))}
        </div>

        <div className="su-row" style={{ marginTop: 22 }}>
          <label>Price from<select value={f.priceMin} onChange={(e) => set("priceMin", e.target.value)}>{PRICES.map(([v, l]) => <option key={v} value={v}>{v ? l : "No minimum"}</option>)}</select></label>
          <label>up to<select value={f.priceMax} onChange={(e) => set("priceMax", e.target.value)}>{PRICES.map(([v, l]) => <option key={v} value={v}>{v ? l : "No maximum"}</option>)}</select></label>
        </div>
        {priceBad && <p className="su-warn">The minimum is higher than the maximum.</p>}

        <p className="su-label">Bedrooms</p>
        <div className="su-seg">{["", "1", "2", "3", "4", "5"].map((n) => <button key={n} type="button" className={f.bedsMin === n ? "is-on" : ""} onClick={() => set("bedsMin", n)}>{n ? `${n}+` : "Any"}</button>)}</div>
        <p className="su-label">Bathrooms</p>
        <div className="su-seg">{["", "1", "2", "3", "4"].map((n) => <button key={n} type="button" className={f.bathsMin === n ? "is-on" : ""} onClick={() => set("bathsMin", n)}>{n ? `${n}+` : "Any"}</button>)}</div>

        <p className="su-label">Type of property</p>
        <div className="su-chips">{TYPES.map(([v, l]) => <button key={v} type="button" className={`su-chip${f.type === v ? " is-on" : ""}`} onClick={() => set("type", v)}>{l}</button>)}</div>

        <p className="su-label">Must-haves</p>
        <div className="su-chips">{MUST_HAVES.map(([v, l]) => <button key={v} type="button" className={`su-chip${f.features.includes(v) ? " is-on" : ""}`} onClick={() => toggle("features", v)}>{f.features.includes(v) && "✓ "}{l}</button>)}</div>

        <p className="su-label">How often should we email you?</p>
        <div className="su-opts">
          {([["instant", "As soon as new homes hit the market"], ["daily", "One email a day"], ["weekly", "One email a week"]] as const).map(([v, t]) => (
            <button key={v} type="button" className={`su-opt${f.freq === v ? " is-on" : ""}`} onClick={() => set("freq", v)}><strong>{t}</strong></button>
          ))}
        </div>

        {msg && <p className={saved ? "su-sub" : "su-warn"} style={{ marginTop: 18 }}>{msg}</p>}

        <div className="su-nav">
          <span className="su-sub" style={{ margin: 0 }}>{f.cities.length === 0 ? "Pick at least one town." : count === null ? "Counting…" : <><strong>{count}</strong> homes match right now</>}</span>
          <button className="su-btn su-btn--primary" disabled={saving || f.cities.length === 0 || priceBad} onClick={save}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}
