"use client";

import { useEffect } from "react";

export const GOOGLE_KEY = "lhg_from_google";

// Runs on every page. Remembers (for the browser session) whether the visit
// began from Google — ads (gclid/gbraid/wbraid, utm_source=google) or organic
// (google.* referrer). Only the first landing counts, so later internal
// navigation doesn't overwrite it. RegistrationGate reads this flag.
export default function TrafficSource() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(GOOGLE_KEY) !== null) return;
      const q = new URLSearchParams(window.location.search);
      const paid =
        q.has("gclid") || q.has("gbraid") || q.has("wbraid") ||
        (q.get("utm_source") ?? "").toLowerCase() === "google";
      let organic = false;
      if (document.referrer) {
        try { organic = /(^|\.)google\.[a-z.]+$/i.test(new URL(document.referrer).hostname); } catch { /* ignore */ }
      }
      sessionStorage.setItem(GOOGLE_KEY, paid || organic ? "1" : "0");
    } catch { /* storage blocked */ }
  }, []);
  return null;
}
