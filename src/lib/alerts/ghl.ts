// ============================================================
// Hand-off to GoHighLevel. ONE inbound-webhook workflow ("Client Search
// Alert") branches on `channel`:
//   email → send the email using email_subject / email_html
//   sms   → send sms_text
//   sync  → create/update the contact (tag, owner) and send NOTHING
//   activity → note + in-app notification to the contact owner (client paused/resumed, etc.); sends nothing to the client
//
// Deliberately NOT any of the lead-form webhooks, so the new-buyer-lead
// workflows (round-robin assign, speed-to-lead texts) can never fire from an
// alert or from an agent-created client.
// ============================================================

export interface GhlAlertPayload {
  channel: "email" | "sms" | "sync" | "activity";
  form_id: "search_alert";
  source: "agent_client" | "site_visitor";
  submission_id: string;
  submitted_at: string;
  email: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  agent_name?: string | null;
  agent_email?: string | null;
  agent_ghl_user_id?: string | null;
  match_count?: number;
  search_summary?: string;
  matches_url?: string;
  email_subject?: string;
  email_html?: string;
  sms_text?: string;
  tags?: string;
  /** channel "activity": a client changed their alert settings — notify the contact owner. */
  activity_title?: string;
  activity_detail?: string;
}

export interface GhlResult { ok: boolean; status: number; detail: string }

export function ghlWebhookConfigured(): boolean {
  return !!process.env.GHL_ALERT_WEBHOOK_URL;
}

export async function postToGhl(payload: GhlAlertPayload): Promise<GhlResult> {
  const url = process.env.GHL_ALERT_WEBHOOK_URL;
  if (!url) return { ok: false, status: 0, detail: "GHL_ALERT_WEBHOOK_URL is not set" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    const text = (await res.text()).slice(0, 300);
    return { ok: res.ok, status: res.status, detail: text };
  } catch (e) {
    return { ok: false, status: 0, detail: (e as Error).message };
  }
}

export function splitName(full: string | null | undefined): { first: string | null; last: string | null } {
  const t = (full ?? "").trim();
  if (!t) return { first: null, last: null };
  const i = t.indexOf(" ");
  return i < 0 ? { first: t, last: null } : { first: t.slice(0, i), last: t.slice(i + 1).trim() || null };
}
