import { AD_VISIT_KEY, AD_VISIT_COOKIE } from "@/config/site";

// Ad / campaign attribution for every lead. Gathered from (highest priority first):
//   1. the current URL's query string
//   2. this visit's ad landing URL (sessionStorage, seeded from the ad-click cookie)
//   3. the last ad click remembered in localStorage (90 days), so a visitor who
//      returns later and submits still carries the gclid that Google Ads needs
// Sent as REAL fields (gclid, utm_*, landing_page, ...) in the webhook payload and
// in the named fields GoHighLevel's tracker reads, not buried inside source_url.
export const ATTR_KEYS = [
  "gclid", "gbraid", "wbraid", "gad_source", "gad_campaignid", "fbclid",
  "utm_source", "utm_medium", "utm_campaign", "utm_adgroup", "utm_term", "utm_content",
] as const;

const STORE = "lhg_attr";
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

function paramsOf(urlish: string | null | undefined): URLSearchParams {
  if (!urlish) return new URLSearchParams();
  try { return new URL(urlish, window.location.origin).searchParams; } catch { return new URLSearchParams(); }
}

function adCookie(): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${AD_VISIT_COOKIE}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

/** Remember an ad click's parameters (call on every page load; no-op without any). */
export function rememberAttribution() {
  try {
    const q = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    for (const k of ATTR_KEYS) { const v = q.get(k); if (v) found[k] = v; }
    if (!Object.keys(found).length) return;
    window.localStorage.setItem(STORE, JSON.stringify({
      ...found, landing_page: window.location.pathname + window.location.search, ts: Date.now(),
    }));
  } catch { /* storage blocked */ }
}

export function getAttribution(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  const here = new URLSearchParams(window.location.search);
  let sessionLanding: string | null = null;
  try { sessionLanding = window.sessionStorage.getItem(AD_VISIT_KEY) || null; } catch { /* ignore */ }
  const landing = sessionLanding || adCookie();
  const fromLanding = paramsOf(landing);
  let stored: Record<string, string> = {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORE) || "null");
    if (raw && typeof raw === "object" && Date.now() - Number(raw.ts || 0) < TTL_MS) stored = raw;
  } catch { /* ignore */ }

  for (const k of ATTR_KEYS) {
    const v = here.get(k) || fromLanding.get(k) || stored[k];
    if (v) out[k] = String(v);
  }
  const lp = landing || stored.landing_page || (window.location.pathname + window.location.search);
  if (lp) out.landing_page = String(lp);
  out.page_url = window.location.href;
  if (landing || out.gclid || out.gbraid || out.wbraid) out.ad_click = "true";
  return out;
}
