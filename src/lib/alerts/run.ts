// ============================================================
// The alert runner. Called hourly by pg_cron (Supabase) via
// POST /api/alerts/run, and on demand from /admin ("send test").
//
// Safety rails:
//   ALERTS_MODE   off (default) = compute only, never send
//                 test          = only addresses in ALERTS_TEST_EMAILS
//                 live          = everyone who is due
//   Each client's "due" check is slot-based (see schedule.ts), so a missed
//   hour self-heals. Sends are logged to alert_sends and deduped through
//   alert_sent_listings. 3 failures in 24h pauses a client until fixed.
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { findMatches, loadSearches } from "@/lib/alerts/engine";
import { digestDue, smsDue } from "@/lib/alerts/schedule";
import { emailHtml, emailSubject, smsText } from "@/lib/alerts/messages";
import { ensureContact, notifyOwner, sendEmail, sendSms, splitName } from "@/lib/alerts/ghl";
import type { Client } from "@/lib/alerts/types";

export type AlertsMode = "off" | "test" | "live";

export function alertsMode(): AlertsMode {
  const m = (process.env.ALERTS_MODE || "off").toLowerCase();
  return m === "live" || m === "test" ? m : "off";
}

export function mayDeliver(email: string): boolean {
  const mode = alertsMode();
  if (mode === "live") return true;
  if (mode === "test") {
    const allow = (process.env.ALERTS_TEST_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    return allow.includes(email.trim().toLowerCase());
  }
  return false;
}

const centralHour = (d: Date) =>
  +new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", hourCycle: "h23" }).format(d);
const smsHoursOk = (d: Date) => { const h = centralHour(d); return h >= 8 && h < 20; }; // TCPA quiet hours

interface AgentRow { id: number; full_name: string | null; email: string | null; phone: string | null; ghl_user_id: string | null }

export interface ClientResult {
  client_id: number;
  email: string;
  email_due: boolean;
  email_matches: number;
  email_status: "sent" | "failed" | "dry" | "none" | "blocked" | "not_due";
  sms_due: boolean;
  sms_matches: number;
  sms_status: "sent" | "failed" | "dry" | "none" | "blocked" | "not_due" | "off";
  detail?: string;
  preview?: { subject: string; html: string; sms: string };
}

export interface RunOptions {
  dry?: boolean;         // compute only
  clientId?: number;     // single client
  force?: boolean;       // ignore the schedule (still respects ALERTS_MODE)
  preview?: boolean;     // include rendered subject/html/sms in the result
  now?: Date;
}

export function baseAgent(agents: Map<number, AgentRow>, c: Client) {
  const a = c.agent_id ? agents.get(c.agent_id) : undefined;
  return { name: a?.full_name ?? null, email: a?.email ?? null, phone: a?.phone ?? null, ghlUserId: a?.ghl_user_id ?? null };
}

/**
 * The client's GHL contact id — looked up / created on first use and cached on
 * the client row. Existing GHL contacts are matched, never duplicated, and keep
 * their owner and tags (see lib/alerts/ghl.ts).
 */
export async function ensureClientContact(
  admin: SupabaseClient,
  c: Client,
  agents: Map<number, AgentRow>,
): Promise<{ ok: boolean; contactId?: string; assignedTo?: string | null; detail: string }> {
  const a = baseAgent(agents, c);
  const r = await ensureContact({
    email: c.email, phone: c.phone, name: c.full_name, ownerUserId: a.ghlUserId,
    tags: c.source === "agent" ? ["agent_client", "search_alerts"] : ["search_alerts"],
  });
  if (!r.ok || !r.id) return { ok: false, detail: r.detail };
  if (c.ghl_contact_id !== r.id) await admin.from("clients").update({ ghl_contact_id: r.id }).eq("id", c.id);
  return { ok: true, contactId: r.id, assignedTo: r.assignedTo ?? a.ghlUserId, detail: r.detail };
}

/** Tell the assigned agent (GHL note + task on the contact) that a client did something. Best effort. */
export async function notifyAgent(admin: SupabaseClient, c: Client, agents: Map<number, AgentRow>, title: string, detail: string) {
  const ensured = await ensureClientContact(admin, c, agents);
  if (!ensured.ok || !ensured.contactId) return ensured;
  const r = await notifyOwner({ contactId: ensured.contactId, userId: ensured.assignedTo ?? null, title, detail });
  return { ok: r.ok, detail: r.detail };
}

export async function loadAgents(admin: SupabaseClient): Promise<Map<number, AgentRow>> {
  const { data } = await admin.from("agents").select("id, full_name, email, phone, ghl_user_id");
  return new Map(((data as AgentRow[]) ?? []).map((a) => [a.id, a]));
}


/** Optimistic claim: only one overlapping run may send for a client at a time. */
async function claim(admin: SupabaseClient, id: number, field: "last_digest_at" | "last_sms_at", old: string | null, now: Date): Promise<boolean> {
  let q = admin.from("clients").update({ [field]: now.toISOString() }).eq("id", id);
  q = old === null ? q.is(field, null) : q.eq(field, old);
  const { data } = await q.select("id");
  return (data?.length ?? 0) > 0;
}
const release = (admin: SupabaseClient, id: number, field: "last_digest_at" | "last_sms_at", old: string | null) =>
  admin.from("clients").update({ [field]: old }).eq("id", id);

export async function runAlerts(admin: SupabaseClient, opts: RunOptions = {}): Promise<{ mode: AlertsMode; results: ClientResult[] }> {
  const now = opts.now ?? new Date();
  const mode = alertsMode();
  const agents = await loadAgents(admin);

  let q = admin.from("clients").select("*").eq("alerts_enabled", true);
  if (opts.clientId) q = q.eq("id", opts.clientId);
  const { data: clients, error } = await q;
  if (error) throw new Error(`clients query failed: ${error.message}`);

  const results: ClientResult[] = [];
  for (const c of (clients as Client[]) ?? []) {
    const r: ClientResult = {
      client_id: c.id, email: c.email,
      email_due: false, email_matches: 0, email_status: "not_due",
      sms_due: false, sms_matches: 0, sms_status: "off",
    };
    results.push(r);
    try {
      const { searches, summary } = await loadSearches(admin, c.id);
      if (searches.length === 0) { r.detail = "no active searches"; continue; }

      const deliver = !opts.dry && mayDeliver(c.email);

      // Failure circuit-breaker: don't hammer GHL for a broken contact.
      const { count: failures } = await admin.from("alert_sends").select("id", { count: "exact", head: true })
        .eq("client_id", c.id).eq("status", "failed").gt("created_at", new Date(now.getTime() - 86_400_000).toISOString());
      if ((failures ?? 0) >= 3 && !opts.force) { r.email_status = "blocked"; r.detail = "3 failures in 24h"; continue; }

      // ---------------------------------------------------------------- email
      r.email_due = !!opts.force || digestDue({ frequency: c.digest_frequency, lastDigestAt: c.last_digest_at ? new Date(c.last_digest_at) : null, now });
      if (r.email_due) {
        const matches = await findMatches(admin, c, searches);
        r.email_matches = matches.length;
        if (matches.length === 0) {
          r.email_status = "none";
          if (deliver && !opts.force) await admin.from("clients").update({ last_digest_at: now.toISOString() }).eq("id", c.id);
        } else {
          const a = baseAgent(agents, c);
          const { first } = splitName(c.full_name);
          const subject = emailSubject(matches, first);
          const html = emailHtml({ matches, token: c.token, firstName: first, agentName: a.name, agentPhone: a.phone, agentEmail: a.email, searchSummary: summary });
          if (opts.preview) r.preview = { subject, html, sms: smsText({ count: matches.length, token: c.token, firstName: first }) };
          if (!deliver) {
            r.email_status = "dry";
          } else {
            const ensured = await ensureClientContact(admin, c, agents);
            if (!ensured.ok || !ensured.contactId) {
              await admin.from("alert_sends").insert({ client_id: c.id, channel: "email", status: "failed", match_count: matches.length, listing_keys: matches.map((m) => m.card.listing_key), error: `GHL contact: ${ensured.detail}` });
              r.email_status = "failed"; r.detail = `GHL contact: ${ensured.detail}`;
              continue;
            }
            if (!(await claim(admin, c.id, "last_digest_at", c.last_digest_at, now))) { r.email_status = "not_due"; r.detail = "another run is sending"; continue; }
            const res = await sendEmail({ contactId: ensured.contactId, subject, html });
            const keys = matches.map((m) => m.card.listing_key);
            const events = Object.fromEntries(matches.map((m) => [m.card.listing_key, m.event]));
            await admin.from("alert_sends").insert({
              client_id: c.id, channel: "email", status: res.ok ? "sent" : "failed",
              match_count: matches.length, listing_keys: keys, events, error: res.ok ? null : `${res.status} ${res.detail}`,
            });
            if (res.ok) {
              r.email_status = "sent";
              const newRows = matches.filter((m) => m.event === "new").map((m) => ({ client_id: c.id, listing_key: m.card.listing_key, event: "new" }));
              if (newRows.length) await admin.from("alert_sent_listings").upsert(newRows, { onConflict: "client_id,listing_key,event", ignoreDuplicates: true });
            } else {
              await release(admin, c.id, "last_digest_at", c.last_digest_at);
              r.email_status = "failed"; r.detail = `${res.status} ${res.detail}`;
            }
          }
        }
      }

      // ------------------------------------------------------------ weekly text
      const smsEligible = c.sms_weekly && !!c.sms_consent_at && !!c.phone;
      if (smsEligible) {
        r.sms_status = "not_due";
        r.sms_due = !!opts.force || smsDue(c.last_sms_at ? new Date(c.last_sms_at) : null, now);
        if (r.sms_due && (opts.force || smsHoursOk(now))) {
          const week = (await findMatches(admin, c, searches, { lookbackDays: 7 })).filter((m) => m.event !== "price_drop");
          r.sms_matches = week.length;
          if (week.length === 0) {
            r.sms_status = "none";
            if (deliver && !opts.force) await admin.from("clients").update({ last_sms_at: now.toISOString() }).eq("id", c.id);
          } else if (!deliver) {
            r.sms_status = "dry";
          } else {
            const { first } = splitName(c.full_name);
            const text = smsText({ count: week.length, token: c.token, firstName: first });
            const ensured = await ensureClientContact(admin, c, agents);
            if (!ensured.ok || !ensured.contactId) {
              await admin.from("alert_sends").insert({ client_id: c.id, channel: "sms", status: "failed", match_count: week.length, listing_keys: week.map((m) => m.card.listing_key), error: `GHL contact: ${ensured.detail}` });
              r.sms_status = "failed"; r.detail = `${r.detail ? r.detail + " | " : ""}sms GHL contact: ${ensured.detail}`;
              continue;
            }
            if (!(await claim(admin, c.id, "last_sms_at", c.last_sms_at, now))) { r.sms_status = "not_due"; continue; }
            const res = await sendSms({ contactId: ensured.contactId, text });
            await admin.from("alert_sends").insert({
              client_id: c.id, channel: "sms", status: res.ok ? "sent" : "failed",
              match_count: week.length, listing_keys: week.map((m) => m.card.listing_key), error: res.ok ? null : `${res.status} ${res.detail}`,
            });
            if (res.ok) {
              r.sms_status = "sent";
            } else {
              await release(admin, c.id, "last_sms_at", c.last_sms_at);
              r.sms_status = "failed"; r.detail = `${r.detail ? r.detail + " | " : ""}sms ${res.status} ${res.detail}`;
            }
          }
        }
      }
    } catch (e) {
      r.email_status = "failed";
      r.detail = (e as Error).message;
      console.error(`[alerts] client ${c.id} failed:`, e);
    }
  }
  return { mode, results };
}
