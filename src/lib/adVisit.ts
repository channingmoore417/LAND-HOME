// Detects visitors who arrived from a paid ad (Google Ads click IDs or paid
// UTMs) and remembers it for the browser session, so the listing gate can
// apply to ad traffic only. Params are kept so they travel with the lead.
const KEY = "lhg_ad_params";
const CLICK_IDS = ["gclid", "gbraid", "wbraid", "msclkid"];
const UTMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export function captureAdVisit(): void {
  try {
    const q = new URLSearchParams(window.location.search);
    // Test hook: ?gate=test behaves like a fresh paid-ad visit (clears "already completed").
    if (q.get("gate") === "test") {
      localStorage.removeItem("lhg_gate_pass");
      localStorage.removeItem("lhg_gate_views");
      sessionStorage.removeItem("lhg_quiz");
      sessionStorage.setItem(KEY, JSON.stringify({ utm_source: "gate-test", landing_page: window.location.pathname }));
      return;
    }
    const medium = (q.get("utm_medium") || "").toLowerCase();
    const paid = CLICK_IDS.some((k) => q.get(k)) || ["cpc", "ppc", "paid", "paidsearch"].includes(medium);
    if (!paid) return;
    const params: Record<string, string> = {};
    for (const k of [...CLICK_IDS, ...UTMS]) { const v = q.get(k); if (v) params[k] = v; }
    params.landing_page = window.location.pathname;
    sessionStorage.setItem(KEY, JSON.stringify(params));
  } catch { /* storage blocked */ }
}

export function adParams(): Record<string, string> | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; }
}
