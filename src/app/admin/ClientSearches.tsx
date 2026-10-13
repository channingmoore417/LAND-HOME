"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { COMMUNITIES, FEATURES } from "@/lib/buyerMatch";

// "Client Searches": the realtor sets up a client on a home search, and the
// site emails them (and optionally texts them weekly) every time something
// matching hits the market. See src/lib/alerts/* and /api/admin/clients.

interface Agent { id: number; full_name: string | null; active: boolean }
interface SearchRow { id: number; name: string | null; summary: string; active: boolean; source: string }
interface SendRow { channel: string; status: string; match_count: number; error: string | null; created_at: string }
interface ClientRow {
  id: number; full_name: string | null; email: string; phone: string | null; agent_id: number | null;
  source: string; alerts_enabled: boolean; digest_frequency: string; sms_weekly: boolean; sms_consent_at: string | null;
  last_digest_at: string | null; last_sms_at: string | null; created_at: string;
  searches: SearchRow[]; last_send: SendRow | null; sent_count: number; page_views: number; clicks: number; last_activity: string | null;
}
interface ListResponse { clients: ClientRow[]; agents: Agent[]; mode: "off" | "test" | "live"; ghl: boolean }
interface Preview { count: number; new_last_7_days: number; price_min: number | null; price_max: number | null; summary: string }

const TYPES = ["", "Single Family", "New Construction", "Multi-Family", "Land", "Mobile / Manufactured"];
const FEATURE_OPTIONS: [string, string][] = [
  ["pool", "Pool"], ["acre_plus", "Acre+"], ["waterfront", "Waterfront"], ["single_story", "Single story"],
  ["new_construction", "New construction"], ["garage", "Garage"], ["shop", "Shop"], ["fireplace", "Fireplace"], ["updated", "Updated / remodeled"],
];
void FEATURES;

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

async function token(): Promise<string | null> {
  const { data } = await getBrowserClient().auth.getSession();
  return data.session?.access_token ?? null;
}
async function api(path: string, init?: RequestInit) {
  const t = await token();
  const res = await fetch(path, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${t}`, "Content-Type": "application/json" } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const EMPTY_FORM = {
  full_name: "", email: "", phone: "", agent_id: "",
  cities: [] as string[], priceMin: "", priceMax: "", bedsMin: "", bathsMin: "", type: "", features: [] as string[],
  digest_frequency: "weekly", backfill_days: "7", sms_weekly: false, sms_consent: false, search_name: "",
};

export default function ClientSearches() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [html, setHtml] = useState<{ subject: string; html: string; sms: string; count: number } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await api("/api/admin/clients");
    if (!r.ok) { setErr(r.body.error || `Request failed (${r.status})`); return; }
    setData(r.body);
  }, []);
  useEffect(() => { load(); }, [load]);

  const criteria = useMemo(() => ({
    cities: form.cities,
    priceMin: form.priceMin ? Number(form.priceMin) : undefined,
    priceMax: form.priceMax ? Number(form.priceMax) : undefined,
    bedsMin: form.bedsMin ? Number(form.bedsMin) : undefined,
    bathsMin: form.bathsMin ? Number(form.bathsMin) : undefined,
    type: form.type || undefined,
    features: form.features,
  }), [form]);

  // Live "N homes match right now" while the agent fills in criteria.
  const seq = useRef(0);
  useEffect(() => {
    if (!open || form.cities.length === 0) { setPreview(null); return; }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const r = await api("/api/admin/clients/preview", { method: "POST", body: JSON.stringify({ criteria }) });
      if (mine === seq.current && r.ok) setPreview(r.body);
    }, 350);
    return () => clearTimeout(t);
  }, [criteria, open, form.cities.length]);

  const set = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k: "cities" | "features", v: string) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  async function save() {
    setSaving(true); setNote("");
    const r = await api("/api/admin/clients", {
      method: "POST",
      body: JSON.stringify({
        full_name: form.full_name, email: form.email, phone: form.phone, agent_id: form.agent_id || null,
        criteria, digest_frequency: form.digest_frequency, backfill_days: Number(form.backfill_days),
        sms_weekly: form.sms_weekly, sms_consent: form.sms_consent, search_name: form.search_name,
      }),
    });
    setSaving(false);
    if (!r.ok) { setNote(r.body.error || "Could not save"); return; }
    const g = r.body.ghl as { ok: boolean; detail: string };
    setNote(`Saved. ${g.ok ? "Contact synced to GoHighLevel." : `GHL: ${g.detail}`}${r.body.mode === "off" ? " Alerts are in OFF mode — nothing will send until it is switched on." : ""}`);
    setForm(EMPTY_FORM); setPreview(null); setOpen(false);
    load();
  }

  async function patch(body: Record<string, unknown>) {
    const r = await api("/api/admin/clients", { method: "PATCH", body: JSON.stringify(body) });
    if (!r.ok) setNote(r.body.error || "Update failed");
    load();
  }

  async function runFor(c: ClientRow, kind: "preview" | "send") {
    setBusyId(c.id); setNote(""); setHtml(null);
    const qs = kind === "preview" ? "dry=1&force=1&preview=1" : "force=1";
    const r = await api(`/api/alerts/run?client=${c.id}&${qs}`, { method: "POST" });
    setBusyId(null);
    if (!r.ok) { setNote(r.body.error || "Run failed"); return; }
    const res = r.body.results?.[0];
    if (!res) { setNote("Nothing to run for this client (alerts paused or no active search)."); return; }
    if (kind === "preview") {
      if (res.preview) setHtml({ ...res.preview, count: res.email_matches });
      else setNote(res.email_matches === 0 ? "No new matches right now, so there is no email to preview." : `Nothing to preview (${res.email_status}).`);
    } else {
      setNote(
        r.body.mode === "off"
          ? "Alerts are OFF. Nothing was sent (this was only a calculation)."
          : `Email: ${res.email_status} (${res.email_matches} homes)${res.sms_status !== "off" ? ` · Text: ${res.sms_status}` : ""}${res.detail ? ` — ${res.detail}` : ""}`,
      );
      load();
    }
  }

  if (err) return <p className="admin__empty">{err}</p>;
  if (!data) return <p className="admin__empty">Loading…</p>;

  const canSave = form.full_name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.cities.length > 0 && (!form.sms_weekly || (form.phone && form.sms_consent));

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <h1 className="adm__title" style={{ margin: 0 }}>Client Searches</h1>
        <button className="btn btn--primary" style={{ width: "auto", padding: "12px 22px" }} onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "+ New client search"}
        </button>
      </div>

      <p className="admin__empty" style={{ margin: "10px 0 18px" }}>
        Alerts are <strong>{data.mode.toUpperCase()}</strong>
        {data.mode === "off" && " — searches are saved but nothing is emailed or texted yet."}
        {data.mode === "test" && " — only approved test addresses receive messages."}
        {!data.ghl && " · GoHighLevel alert webhook is not connected yet."}
      </p>
      {note && <p className="prose" style={{ background: "var(--aqua-soft)", padding: "10px 14px", borderRadius: 10 }}>{note}</p>}

      {open && (
        <div className="adm-card" style={{ marginBottom: 24 }}>
          <h2 className="adm-card__head">New client search</h2>
          <div className="cs-grid">
            <label>Client name<input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Sarah Thibodeaux" /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="sarah@email.com" /></label>
            <label>Mobile (for weekly text)<input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(337) 555-0100" /></label>
            <label>Agent
              <select value={form.agent_id} onChange={(e) => set("agent_id", e.target.value)}>
                <option value="">— choose —</option>
                {data.agents.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </label>
          </div>

          <h3 className="cs-sub">Cities</h3>
          <div className="cs-chips">
            {COMMUNITIES.map((c) => (
              <label key={c} className={`cs-chip${form.cities.includes(c) ? " is-on" : ""}`}>
                <input type="checkbox" checked={form.cities.includes(c)} onChange={() => toggle("cities", c)} />{c}
              </label>
            ))}
          </div>

          <h3 className="cs-sub">Criteria</h3>
          <div className="cs-grid">
            <label>Min price<input inputMode="numeric" value={form.priceMin} onChange={(e) => set("priceMin", e.target.value.replace(/\D/g, ""))} placeholder="150000" /></label>
            <label>Max price<input inputMode="numeric" value={form.priceMax} onChange={(e) => set("priceMax", e.target.value.replace(/\D/g, ""))} placeholder="400000" /></label>
            <label>Beds (min)
              <select value={form.bedsMin} onChange={(e) => set("bedsMin", e.target.value)}>
                <option value="">Any</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </label>
            <label>Baths (min)
              <select value={form.bathsMin} onChange={(e) => set("bathsMin", e.target.value)}>
                <option value="">Any</option>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </label>
            <label>Property type
              <select value={form.type} onChange={(e) => set("type", e.target.value)}>
                {TYPES.map((t) => <option key={t} value={t}>{t || "Any"}</option>)}
              </select>
            </label>
          </div>
          <div className="cs-chips" style={{ marginTop: 12 }}>
            {FEATURE_OPTIONS.map(([k, label]) => (
              <label key={k} className={`cs-chip${form.features.includes(k) ? " is-on" : ""}`}>
                <input type="checkbox" checked={form.features.includes(k)} onChange={() => toggle("features", k)} />{label}
              </label>
            ))}
          </div>

          <div className="cs-preview">
            {form.cities.length === 0 ? "Pick at least one city to see matches."
              : preview ? <><strong>{preview.count}</strong> homes match right now · <strong>{preview.new_last_7_days}</strong> listed in the last 7 days</>
              : "Checking…"}
          </div>

          <h3 className="cs-sub">Alerts</h3>
          <div className="cs-grid">
            <label>Email me this client's matches
              <select value={form.digest_frequency} onChange={(e) => set("digest_frequency", e.target.value)}>
                <option value="instant">As they hit (hourly check)</option>
                <option value="daily">Daily digest (8 AM)</option>
                <option value="weekly">Weekly digest (Saturday 9 AM)</option>
              </select>
            </label>
            <label>First email includes homes listed in the last
              <select value={form.backfill_days} onChange={(e) => set("backfill_days", e.target.value)}>
                <option value="0">Nothing yet — only new from now</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
              </select>
            </label>
            <label>Search name (optional)<input value={form.search_name} onChange={(e) => set("search_name", e.target.value)} placeholder="Auto-named from criteria" /></label>
          </div>
          <label className="cs-check"><input type="checkbox" checked={form.sms_weekly} onChange={(e) => set("sms_weekly", e.target.checked)} /> Also send a weekly text (Saturday) linking to the week's new homes</label>
          {form.sms_weekly && (
            <label className="cs-check cs-check--consent">
              <input type="checkbox" checked={form.sms_consent} onChange={(e) => set("sms_consent", e.target.checked)} />
              I confirm this client agreed to receive text messages from The Land &amp; Home Group about homes matching their search.
            </label>
          )}

          <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn btn--primary" style={{ width: "auto", padding: "13px 26px" }} disabled={!canSave || saving} onClick={save}>
              {saving ? "Saving…" : "Save client & start alerts"}
            </button>
            {!canSave && <span className="admin__empty">Name, email and at least one city are required.</span>}
          </div>
        </div>
      )}

      {html && (
        <div className="adm-card" style={{ marginBottom: 24 }}>
          <h2 className="adm-card__head">Email preview — {html.count} homes</h2>
          <p><strong>Subject:</strong> {html.subject}</p>
          <iframe title="Email preview" srcDoc={html.html} style={{ width: "100%", height: 640, border: "1px solid var(--line)", borderRadius: 10 }} />
          <p style={{ marginTop: 10 }}><strong>Weekly text:</strong> {html.sms}</p>
          <button className="adm-back" onClick={() => setHtml(null)}>Close preview</button>
        </div>
      )}

      {data.clients.length === 0 ? <p className="admin__empty">No clients yet. Use “New client search” to set up your first one.</p> : (
        <ul className="adm-rows">
          {data.clients.map((c) => {
            const agent = data.agents.find((a) => a.id === c.agent_id);
            return (
              <li key={c.id}>
                <div className="adm-row" style={{ gridTemplateColumns: "1.2fr 1.6fr 1.1fr", alignItems: "start" }}>
                  <div className="adm-row__who">
                    <strong>{c.full_name || c.email}</strong>
                    <span>{c.email}{c.phone ? ` · ${c.phone}` : ""}</span>
                    <span>{agent ? `Agent: ${agent.full_name}` : c.source === "visitor" ? "Site visitor" : "No agent"}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    {c.searches.length === 0 ? <span className="admin__empty">No searches</span> : c.searches.map((s) => (
                      <div key={s.id} style={{ fontSize: ".82rem", display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span className={`adm-chip ${s.active ? "adm-chip--teal" : "adm-chip--gold"}`}>{s.active ? "on" : "paused"}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.summary}</span>
                        <button className="adm-back" style={{ margin: 0 }} onClick={() => patch({ search_id: s.id, active: !s.active })}>{s.active ? "pause" : "resume"}</button>
                      </div>
                    ))}
                    <div style={{ fontSize: ".78rem", color: "var(--ink-muted)", marginTop: 6 }}>
                      {c.alerts_enabled ? c.digest_frequency : "alerts off"}{c.sms_weekly ? " · weekly text" : ""} ·
                      {" "}last email {fmt(c.last_digest_at)} · {c.sent_count} sent · {c.page_views} page views · {c.clicks} clicks
                      {c.last_send?.status === "failed" && <span style={{ color: "#c2410c" }}> · last send FAILED: {c.last_send.error}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                    <button className="adm-back" style={{ margin: 0 }} disabled={busyId === c.id} onClick={() => runFor(c, "preview")}>Preview email</button>
                    <button className="adm-back" style={{ margin: 0 }} disabled={busyId === c.id} onClick={() => runFor(c, "send")}>Send now</button>
                    <button className="adm-back" style={{ margin: 0 }} onClick={() => patch({ client_id: c.id, alerts_enabled: !c.alerts_enabled })}>
                      {c.alerts_enabled ? "Pause all alerts" : "Turn alerts on"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
