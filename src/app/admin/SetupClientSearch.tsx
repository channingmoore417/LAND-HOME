"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { COMMUNITIES } from "@/lib/buyerMatch";
import { PRICES, TYPES, MUST_HAVES } from "@/lib/alerts/options";
import { adminApi, type Agent, type ListResponse, type Preview } from "./clientApi";

// "Set Up a Client Search": a 4-step guided flow. One question per screen,
// big tap targets, and a live "N homes match right now" counter so the agent
// can tune the search before saving. Saving creates the client, their search,
// and starts the alerts (see /api/admin/clients).

const STEPS = ["Client", "Where", "What", "Alerts"];

const priceLabel = (v: string) => PRICES.find(([k]) => k === v)?.[1] ?? v;
const digits = (v: string) => v.replace(/\D/g, "");

interface Form {
  full_name: string; email: string; phone: string; agent_id: string;
  cities: string[]; priceMin: string; priceMax: string; bedsMin: string; bathsMin: string; type: string; features: string[];
  freq: "instant" | "daily" | "weekly"; backfill: "0" | "7" | "30"; sms: boolean; consent: boolean;
}
const EMPTY: Form = {
  full_name: "", email: "", phone: "", agent_id: "",
  cities: [], priceMin: "", priceMax: "", bedsMin: "", bathsMin: "", type: "", features: [],
  freq: "instant", backfill: "7", sms: false, consent: false,
};

export default function SetupClientSearch({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [meta, setMeta] = useState<ListResponse | null>(null);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ name: string; ghlNote: string; clientId: number } | null>(null);
  const [email, setEmail] = useState<{ subject: string; html: string; sms: string; count: number } | null>(null);
  const [emailNote, setEmailNote] = useState("");

  useEffect(() => { adminApi("/api/admin/clients").then((r) => r.ok && setMeta(r.body)); }, []);

  // Pre-select the signed-in agent.
  useEffect(() => {
    if (!meta || f.agent_id) return;
    const me = meta.agents.find((a) => a.email && user?.email && a.email.toLowerCase() === user.email.toLowerCase());
    if (me) setF((x) => ({ ...x, agent_id: String(me.id) }));
  }, [meta, user, f.agent_id]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k: "cities" | "features", v: string) =>
    setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((i) => i !== v) : [...x[k], v] }));

  const criteria = useMemo(() => ({
    cities: f.cities,
    priceMin: f.priceMin ? Number(f.priceMin) : undefined,
    priceMax: f.priceMax ? Number(f.priceMax) : undefined,
    bedsMin: f.bedsMin ? Number(f.bedsMin) : undefined,
    bathsMin: f.bathsMin ? Number(f.bathsMin) : undefined,
    type: f.type || undefined,
    features: f.features,
  }), [f.cities, f.priceMin, f.priceMax, f.bedsMin, f.bathsMin, f.type, f.features]);

  // Live match counter (steps 2–4).
  const seq = useRef(0);
  useEffect(() => {
    if (f.cities.length === 0) { setPreview(null); return; }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const r = await adminApi("/api/admin/clients/preview", { method: "POST", body: JSON.stringify({ criteria }) });
      if (mine === seq.current && r.ok) setPreview(r.body);
    }, 300);
    return () => clearTimeout(t);
  }, [criteria, f.cities.length]);

  const emailOk = /^\S+@\S+\.\S+$/.test(f.email.trim());
  const phoneOk = digits(f.phone).length >= 10;
  const priceBad = !!(f.priceMin && f.priceMax && Number(f.priceMin) > Number(f.priceMax));

  const stepOk = [
    f.full_name.trim().length > 1 && emailOk && !!f.agent_id,
    f.cities.length > 0,
    !priceBad,
    !f.sms || (phoneOk && f.consent),
  ];

  const agentName = meta?.agents.find((a) => String(a.id) === f.agent_id)?.full_name ?? "";
  const first = f.full_name.trim().split(/\s+/)[0] || "Your client";

  async function save() {
    setSaving(true); setError("");
    const r = await adminApi("/api/admin/clients", {
      method: "POST",
      body: JSON.stringify({
        full_name: f.full_name, email: f.email, phone: f.phone, agent_id: f.agent_id || null,
        criteria, digest_frequency: f.freq, backfill_days: Number(f.backfill),
        sms_weekly: f.sms, sms_consent: f.sms && f.consent,
      }),
    });
    setSaving(false);
    if (!r.ok) { setError(r.body.error || "Something went wrong saving. Please try again."); return; }
    const g = r.body.ghl as { ok: boolean; detail: string };
    setDone({
      name: f.full_name.trim(),
      clientId: r.body.client.id,
      ghlNote: g.ok ? "" : "Heads up: the contact has not been added to GoHighLevel yet — that connection is still being set up.",
    });
  }

  async function previewFirstEmail() {
    if (!done) return;
    setEmailNote("Building the email…");
    const r = await adminApi(`/api/alerts/run?client=${done.clientId}&dry=1&force=1&preview=1`, { method: "POST" });
    const res = r.body?.results?.[0];
    if (res?.preview) { setEmail({ ...res.preview, count: res.email_matches }); setEmailNote(""); }
    else setEmailNote(res?.email_matches === 0 ? "No homes to show yet — the first email goes out as soon as one matches." : "Nothing to preview right now.");
  }

  function reset() { setF(EMPTY); setStep(0); setDone(null); setEmail(null); setEmailNote(""); setError(""); setPreview(null); }

  // ------------------------------------------------------------------ success
  if (done) {
    return (
      <div className="su">
        <div className="su-card su-done">
          <div className="su-tick">✓</div>
          <h1 className="su-h1">{done.name.split(/\s+/)[0]} is all set</h1>
          <p className="su-sub">
            {meta?.mode === "live"
              ? `We'll ${f.freq === "instant" ? "email them as new homes hit the market" : f.freq === "daily" ? "email them a daily digest at 8 AM" : "email them a weekly digest on Saturday morning"}${f.sms ? " and text them a weekly link" : ""}.`
              : "Their search is saved. Alerts are in test mode right now, so nothing has been sent to them yet."}
          </p>
          {done.ghlNote && <p className="su-warn">{done.ghlNote}</p>}
          <div className="su-actions">
            <button className="su-btn su-btn--primary" onClick={previewFirstEmail}>See what their first email looks like</button>
            <button className="su-btn" onClick={reset}>Set up another client</button>
            <button className="su-btn su-btn--link" onClick={onDone}>View all clients</button>
          </div>
          {emailNote && <p className="su-sub">{emailNote}</p>}
        </div>
        {email && (
          <div className="su-card">
            <p className="su-q" style={{ marginTop: 0 }}>Subject: {email.subject}</p>
            <iframe title="First email" srcDoc={email.html} className="su-frame" />
            <p className="su-sub" style={{ marginTop: 12 }}><strong>Weekly text:</strong> {email.sms}</p>
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------- wizard
  const next = () => stepOk[step] && setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const matchLine = f.cities.length === 0 ? null : !preview ? "Counting matching homes…" : (
    <>
      <strong>{preview.count}</strong> {preview.count === 1 ? "home matches" : "homes match"} right now
      {preview.new_last_7_days > 0 && <> · <strong>{preview.new_last_7_days}</strong> listed this week</>}
    </>
  );
  const matchHint = preview && f.cities.length > 0
    ? preview.count === 0 ? "Nothing matches yet — try a wider price range or remove a must-have."
    : preview.count > 300 ? "That's a lot of homes. Add a price range or must-haves so the alerts stay useful."
    : "" : "";

  return (
    <div className="su">
      <h1 className="su-h1">Set up a client search</h1>
      <p className="su-sub">Tell us what your client wants. We'll email them every new home that fits — and you'll see what they open and click.</p>

      <ol className="su-steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "is-now" : i < step ? "is-done" : ""}>
            <button disabled={i > step && !stepOk.slice(0, i).every(Boolean)} onClick={() => setStep(i)}><span>{i < step ? "✓" : i + 1}</span>{s}</button>
          </li>
        ))}
      </ol>

      <div className="su-card">
        {step === 0 && (
          <>
            <p className="su-q">Who is this search for?</p>
            <div className="su-fields">
              <label>Client's name<input autoFocus value={f.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Sarah Thibodeaux" autoComplete="off" /></label>
              <label>Email address<input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="sarah@email.com" autoComplete="off" />
                {f.email && !emailOk && <em>That email doesn't look right.</em>}</label>
              <label>Mobile number <small>(only needed for weekly texts)</small><input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(337) 555-0100" autoComplete="off" /></label>
              <label>Which agent is working with them?
                <select value={f.agent_id} onChange={(e) => set("agent_id", e.target.value)}>
                  <option value="">Choose an agent…</option>
                  {(meta?.agents ?? []).filter((a: Agent) => a.active).map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
              </label>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="su-q">Where would {first} like to live?</p>
            <p className="su-hint">Tap every town they'd consider.</p>
            <div className="su-chips">
              {COMMUNITIES.map((c) => (
                <button key={c} type="button" className={`su-chip${f.cities.includes(c) ? " is-on" : ""}`} onClick={() => toggle("cities", c)}>
                  {f.cities.includes(c) && "✓ "}{c}
                </button>
              ))}
            </div>
            <button type="button" className="su-link" onClick={() => set("cities", f.cities.length === COMMUNITIES.length ? [] : [...COMMUNITIES])}>
              {f.cities.length === COMMUNITIES.length ? "Clear all" : "Select all towns"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="su-q">What are they looking for?</p>
            <p className="su-hint">Skip anything they're flexible on — fewer filters means more homes.</p>

            <div className="su-row">
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
          </>
        )}

        {step === 3 && (
          <>
            <p className="su-q">How should we keep {first} updated?</p>
            <div className="su-opts">
              {([
                ["instant", "As soon as new homes hit the market", "Recommended. We check every hour and email only when something new matches."],
                ["daily", "One email a day", "A morning digest at 8 AM with everything new."],
                ["weekly", "One email a week", "A Saturday-morning roundup."],
              ] as const).map(([v, t, d]) => (
                <button key={v} type="button" className={`su-opt${f.freq === v ? " is-on" : ""}`} onClick={() => set("freq", v)}>
                  <strong>{t}</strong><span>{d}</span>
                </button>
              ))}
            </div>

            <p className="su-label">Their first email</p>
            <div className="su-opts">
              {([
                ["7", "Include homes listed in the last 7 days", "They see real matches right away."],
                ["30", "Include the last 30 days", "A bigger first batch."],
                ["0", "Only homes that list from now on", "Start fresh."],
              ] as const).map(([v, t, d]) => (
                <button key={v} type="button" className={`su-opt${f.backfill === v ? " is-on" : ""}`} onClick={() => set("backfill", v)}>
                  <strong>{t}</strong><span>{d}</span>
                </button>
              ))}
            </div>

            <p className="su-label">Weekly text message <small>(optional)</small></p>
            <label className="su-check"><input type="checkbox" checked={f.sms} onChange={(e) => set("sms", e.target.checked)} />
              Text {first} a link every Saturday to everything new that week</label>
            {f.sms && (
              <>
                {!phoneOk && (
                  <div className="su-fields" style={{ marginTop: 12 }}>
                    <label>{first}'s mobile number
                      <input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(337) 555-0100" autoComplete="off" />
                    </label>
                  </div>
                )}
                <label className="su-check su-check--consent"><input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} />
                  I confirm {first} agreed to receive text messages from The Land &amp; Home Group about homes matching their search.</label>
              </>
            )}

            <div className="su-review">
              <p className="su-label" style={{ marginTop: 0 }}>Review</p>
              <ul>
                <li><b>Client:</b> {f.full_name} · {f.email}{agentName ? ` · agent ${agentName}` : ""}</li>
                <li><b>Towns:</b> {f.cities.join(", ")}</li>
                <li><b>Looking for:</b> {[
                  f.priceMin || f.priceMax ? `${f.priceMin ? priceLabel(f.priceMin) : "any price"} – ${f.priceMax ? priceLabel(f.priceMax) : "no max"}` : null,
                  f.bedsMin ? `${f.bedsMin}+ beds` : null, f.bathsMin ? `${f.bathsMin}+ baths` : null,
                  f.type ? TYPES.find(([v]) => v === f.type)?.[1] : null,
                  ...f.features.map((x) => MUST_HAVES.find(([v]) => v === x)?.[1]),
                ].filter(Boolean).join(" · ") || "Any home"}</li>
                <li><b>Alerts:</b> {f.freq === "instant" ? "as homes hit the market" : f.freq === "daily" ? "daily at 8 AM" : "weekly, Saturday"}{f.sms && f.consent ? " + weekly text" : ""}</li>
              </ul>
            </div>
          </>
        )}

        {error && <p className="su-warn">{error}</p>}

        <div className="su-nav">
          {step > 0 ? <button className="su-btn" onClick={() => setStep(step - 1)}>← Back</button> : <span />}
          {step < STEPS.length - 1
            ? <button className="su-btn su-btn--primary" disabled={!stepOk[step]} onClick={next}>Continue →</button>
            : <button className="su-btn su-btn--primary" disabled={!stepOk.every(Boolean) || saving} onClick={save}>{saving ? "Saving…" : `Start alerts for ${first}`}</button>}
        </div>
      </div>

      {step >= 1 && matchLine && (
        <div className={`su-live${preview && preview.count === 0 ? " is-zero" : ""}`}>
          <div>{matchLine}</div>
          {matchHint && <small>{matchHint}</small>}
        </div>
      )}

      {meta && meta.mode !== "live" && (
        <p className="su-note">
          {meta.mode === "off"
            ? "Test mode: searches are saved, but no emails or texts go out yet."
            : "Test mode: only approved test addresses receive messages."}
        </p>
      )}
    </div>
  );
}
