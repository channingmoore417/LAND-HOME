"use client";

import { useState } from "react";

// Deliberately low-key: small muted text at the very bottom of the page,
// not buttons. Reached from the email's tiny "Unsubscribe" link (#preferences).
export default function AlertPrefs({ token, enabled, sms }: { token: string; enabled: boolean; sms: boolean }) {
  const [on, setOn] = useState(enabled);
  const [textOn, setTextOn] = useState(sms);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function send(action: "pause" | "resume" | "sms_off") {
    setBusy(true);
    try {
      const r = await fetch("/api/alerts/prefs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action }),
      });
      if (r.ok) {
        if (action === "pause") { setOn(false); setMsg("Done — you won't get any more home alert emails. Changed your mind? Turn them back on below."); }
        if (action === "resume") { setOn(true); setMsg("Welcome back — alerts are on."); }
        if (action === "sms_off") { setTextOn(false); setMsg("Done — no more weekly texts."); }
      } else setMsg("Something went wrong. Please try again, or reply to any of our emails.");
    } finally { setBusy(false); }
  }

  const link: React.CSSProperties = { background: "none", border: 0, padding: 0, color: "inherit", textDecoration: "underline", font: "inherit", cursor: "pointer" };

  return (
    <div id="preferences" style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid var(--line)", fontSize: ".75rem", color: "#8A9AA3" }}>
      {msg && <p style={{ margin: "0 0 8px", color: "var(--ink-muted)" }}>{msg}</p>}
      <span>Email preferences: </span>
      {on
        ? <button style={link} disabled={busy} onClick={() => send("pause")}>unsubscribe from home alerts</button>
        : <button style={link} disabled={busy} onClick={() => send("resume")}>turn home alerts back on</button>}
      {textOn && <> · <button style={link} disabled={busy} onClick={() => send("sms_off")}>stop weekly texts</button></>}
    </div>
  );
}
