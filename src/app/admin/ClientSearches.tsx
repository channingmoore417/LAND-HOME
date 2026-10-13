"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, fmtWhen, type ClientRow, type ListResponse } from "./clientApi";

// "Client Alerts": every client who gets alerts, what they're searching for,
// what was sent, and what they opened. New clients are added in the
// "Set Up a Client Search" flow (SetupClientSearch.tsx).

export default function ClientSearches({ onSetup }: { onSetup: () => void }) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [html, setHtml] = useState<{ subject: string; html: string; sms: string; count: number } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await adminApi("/api/admin/clients");
    if (!r.ok) { setErr(r.body.error || `Request failed (${r.status})`); return; }
    setData(r.body);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function patch(body: Record<string, unknown>) {
    const r = await adminApi("/api/admin/clients", { method: "PATCH", body: JSON.stringify(body) });
    if (!r.ok) setNote(r.body.error || "Update failed");
    load();
  }

  async function runFor(c: ClientRow, kind: "preview" | "send") {
    setBusyId(c.id); setNote(""); setHtml(null);
    const qs = kind === "preview" ? "dry=1&force=1&preview=1" : "force=1";
    const r = await adminApi(`/api/alerts/run?client=${c.id}&${qs}`, { method: "POST" });
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
          ? "Alerts are in test mode, so nothing was sent (this only calculated what would go out)."
          : `Email: ${res.email_status} (${res.email_matches} homes)${res.sms_status !== "off" ? ` · Text: ${res.sms_status}` : ""}${res.detail ? ` — ${res.detail}` : ""}`,
      );
      load();
    }
  }

  if (err) return <p className="admin__empty">{err}</p>;
  if (!data) return <p className="admin__empty">Loading…</p>;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <h1 className="adm__title" style={{ margin: 0 }}>Client Alerts</h1>
        <button className="btn btn--primary" style={{ width: "auto", padding: "12px 22px" }} onClick={onSetup}>+ Set up a client search</button>
      </div>

      <p className="admin__empty" style={{ margin: "10px 0 18px" }}>
        {data.mode === "live" ? "Alerts are LIVE." : data.mode === "test" ? "Test mode — only approved test addresses receive messages." : "Test mode — searches are saved but nothing is emailed or texted yet."}
        {!data.ghl && " GoHighLevel isn't connected yet."}
      </p>
      {note && <p className="prose" style={{ background: "var(--aqua-soft)", padding: "10px 14px", borderRadius: 10 }}>{note}</p>}

      {html && (
        <div className="adm-card" style={{ marginBottom: 24 }}>
          <h2 className="adm-card__head">Email preview — {html.count} homes</h2>
          <p><strong>Subject:</strong> {html.subject}</p>
          <iframe title="Email preview" srcDoc={html.html} style={{ width: "100%", height: 640, border: "1px solid var(--line)", borderRadius: 10 }} />
          <p style={{ marginTop: 10 }}><strong>Weekly text:</strong> {html.sms}</p>
          <button className="adm-back" onClick={() => setHtml(null)}>Close preview</button>
        </div>
      )}

      {data.clients.length === 0 ? (
        <p className="admin__empty">No clients yet. <button className="adm-back" onClick={onSetup}>Set up your first client search →</button></p>
      ) : (
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
                      {" "}last email {fmtWhen(c.last_digest_at)} · {c.sent_count} sent · {c.page_views} page views · {c.clicks} clicks
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
