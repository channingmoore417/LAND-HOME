"use client";

import { getBrowserClient } from "@/lib/supabaseBrowser";

// Shared by the client-search screens: authenticated fetch to the admin APIs.
export async function adminApi(path: string, init?: RequestInit) {
  const { data } = await getBrowserClient().auth.getSession();
  const t = data.session?.access_token ?? null;
  const res = await fetch(path, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${t}`, "Content-Type": "application/json" } });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

export interface Agent { id: number; full_name: string | null; email: string | null; active: boolean }
export interface SearchRow { id: number; name: string | null; summary: string; active: boolean; source: string }
export interface SendRow { channel: string; status: string; match_count: number; error: string | null; created_at: string }
export interface ClientRow {
  id: number; full_name: string | null; email: string; phone: string | null; agent_id: number | null;
  source: string; alerts_enabled: boolean; digest_frequency: string; sms_weekly: boolean; sms_consent_at: string | null;
  last_digest_at: string | null; last_sms_at: string | null; created_at: string;
  searches: SearchRow[]; last_send: SendRow | null; sent_count: number; page_views: number; clicks: number; last_activity: string | null;
}
export interface ListResponse { clients: ClientRow[]; agents: Agent[]; mode: "off" | "test" | "live"; ghl: boolean }
export interface Preview { count: number; new_last_7_days: number; price_min: number | null; price_max: number | null; summary: string }

export const fmtWhen = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
