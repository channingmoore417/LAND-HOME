"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { GOOGLE_KEY } from "@/components/TrafficSource";

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|lighthouse|headless|preview/i;

function landedFromGoogle() {
  const q = new URLSearchParams(window.location.search);
  if (q.has("gclid") || q.has("gbraid") || q.has("wbraid") || q.get("utm_source") === "google") return true;
  try { return /(^|\.)google\.[a-z.]+$/i.test(new URL(document.referrer).hostname); } catch { return false; }
}

// Forced lead capture on the property page for visitors who came from Google
// (ads or organic) — not site-wide browsing. Signed-out visitors get a
// non-dismissible sign-up modal shortly after landing. Search-engine/link-preview
// crawlers are skipped so the listing stays indexable (content is in the HTML).
export default function RegistrationGate() {
  const { user, ready, openAuth } = useAuth();

  useEffect(() => {
    if (!ready || user) return;
    if (BOT.test(navigator.userAgent)) return;
    try {
      // Effects run child-first, so TrafficSource may not have written yet on a
      // direct landing — fall back to checking this page's own URL/referrer.
      if (sessionStorage.getItem(GOOGLE_KEY) !== "1" && !landedFromGoogle()) return;
    } catch { return; }
    const t = window.setTimeout(() => openAuth({ intent: "view", forced: true }), 1200);
    return () => window.clearTimeout(t);
  }, [ready, user, openAuth]);

  return null;
}
