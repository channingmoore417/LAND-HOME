"use client";

import { useState } from "react";

export default function AlertPrefs({ token, enabled, sms }: { token: string; enabled: boolean; sms: boolean }) {
  const [on, setOn] = useState(enabled);
  const [textOn, setTextOn] = useState(sms);
  const [busy, setBusy] = useState(false);

  async function send(action: "pause" | "resume" | "sms_off") {
    setBusy(true);
    try {
      const r = await fetch("/api/alerts/prefs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action }),
      });
      if (r.ok) {
        if (action === "pause") setOn(false);
        if (action === "resume") setOn(true);
        if (action === "sms_off") setTextOn(false);
      }
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {on ? (
        <button className="btn btn--ghost" style={{ width: "auto", padding: "10px 18px" }} disabled={busy} onClick={() => send("pause")}>
          Pause my alerts
        </button>
      ) : (
        <button className="btn btn--primary" style={{ width: "auto", padding: "10px 18px" }} disabled={busy} onClick={() => send("resume")}>
          Alerts paused — turn back on
        </button>
      )}
      {textOn && (
        <button className="btn btn--ghost" style={{ width: "auto", padding: "10px 18px" }} disabled={busy} onClick={() => send("sms_off")}>
          Stop weekly texts
        </button>
      )}
    </div>
  );
}
