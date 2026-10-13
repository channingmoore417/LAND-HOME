import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { canonicalFromForm, normalizeCriteria, summarizeCriteria } from "@/lib/alerts/criteria";
import { basePayload, loadAgents, alertsMode } from "@/lib/alerts/run";
import { ghlWebhookConfigured, postToGhl } from "@/lib/alerts/ghl";
import type { Client } from "@/lib/alerts/types";

export const dynamic = "force-dynamic";

// Team tool for client searches. Admin-only (requireAdmin) — Lauren, Kacy and
// Channing are admins; the rows hold client PII so this never goes public.
//   GET    → every client with their searches + last send + engagement
//   POST   → create/update a client and add a search for them
//   PATCH  → { client_id, ...settings } or { search_id, active }
//   DELETE → ?search_id=…

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (v: string) => v.replace(/\D/g, "");

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if ("failure" in auth) return auth.failure;
  const { admin } = auth;

  const { data: clients } = await admin.from("clients").select("*").order("created_at", { ascending: false }).limit(300);
  const ids = (clients ?? []).map((c) => c.id);
  const none = ids.length === 0;

  const [searches, sends, events, agents] = await Promise.all([
    none ? { data: [] } : admin.from("saved_searches").select("id, client_id, name, criteria, active, source, baseline_at, created_at").in("client_id", ids).order("created_at", { ascending: false }),
    none ? { data: [] } : admin.from("alert_sends").select("client_id, channel, status, match_count, error, created_at").in("client_id", ids).order("created_at", { ascending: false }).limit(1000),
    none ? { data: [] } : admin.from("alert_events").select("client_id, type, created_at").in("client_id", ids).order("created_at", { ascending: false }).limit(2000),
    admin.from("agents").select("id, full_name, email, active").order("sort_order"),
  ]);

  const out = (clients ?? []).map((c) => {
    const mySends = (sends.data ?? []).filter((s) => s.client_id === c.id);
    const myEvents = (events.data ?? []).filter((e) => e.client_id === c.id);
    return {
      ...c,
      searches: (searches.data ?? [])
        .filter((s) => s.client_id === c.id)
        .map((s) => ({ ...s, summary: summarizeCriteria(normalizeCriteria(s.criteria)) })),
      last_send: mySends[0] ?? null,
      sent_count: mySends.filter((s) => s.status === "sent").length,
      page_views: myEvents.filter((e) => e.type === "page_view").length,
      clicks: myEvents.filter((e) => e.type === "listing_click").length,
      last_activity: myEvents[0]?.created_at ?? null,
    };
  });
  return NextResponse.json({ clients: out, agents: agents.data ?? [], mode: alertsMode(), ghl: ghlWebhookConfigured() });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("failure" in auth) return auth.failure;
  const { admin, user } = auth;

  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const email = String(b.email ?? "").trim().toLowerCase();
  const full_name = String(b.full_name ?? "").trim();
  const phone = String(b.phone ?? "").trim();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "A valid client email is required" }, { status: 400 });
  if (!full_name) return NextResponse.json({ error: "Client name is required" }, { status: 400 });

  const freq = ["instant", "daily", "weekly"].includes(b.digest_frequency) ? b.digest_frequency : "weekly";
  const wantsSms = !!b.sms_weekly;
  if (wantsSms && digits(phone).length < 10) return NextResponse.json({ error: "A mobile number is required to turn on weekly texts" }, { status: 400 });
  if (wantsSms && !b.sms_consent) return NextResponse.json({ error: "Confirm the client agreed to receive texts before turning them on" }, { status: 400 });

  const criteria = canonicalFromForm(b.criteria ?? {});
  const crit = normalizeCriteria(criteria);
  if (!crit.cities?.length && !crit.postalCode) return NextResponse.json({ error: "Pick at least one city" }, { status: 400 });

  const agentId = b.agent_id ? Number(b.agent_id) : null;
  const now = new Date();

  // --- client (one row per person; re-using an email updates that person)
  const { data: existing } = await admin.from("clients").select("*").ilike("email", email).maybeSingle();
  const fields = {
    full_name, phone: phone || null, agent_id: agentId, digest_frequency: freq, alerts_enabled: true,
    sms_weekly: wantsSms,
    ...(wantsSms && !(existing as Client | null)?.sms_consent_at
      ? { sms_consent_at: now.toISOString(), sms_consent_note: `Consent confirmed by ${user.email} in /admin on ${now.toISOString().slice(0, 10)}` }
      : {}),
  };
  let client: Client;
  if (existing) {
    const { data, error } = await admin.from("clients").update(fields).eq("id", existing.id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    client = data as Client;
  } else {
    const { data, error } = await admin.from("clients").insert({ ...fields, email, source: "agent", created_by: user.id }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    client = data as Client;
  }

  // --- search. backfill_days lets the agent include homes already listed recently.
  const backfill = Math.min(Math.max(Number(b.backfill_days) || 0, 0), 30);
  const baseline = new Date(now.getTime() - backfill * 86_400_000);
  const name = String(b.search_name ?? "").trim() || summarizeCriteria(crit).slice(0, 80);
  const { data: search, error: sErr } = await admin.from("saved_searches").insert({
    email, name, criteria, alert_frequency: freq, active: true,
    client_id: client.id, agent_id: agentId, source: "agent", baseline_at: baseline.toISOString(),
    user_id: client.user_id,
  }).select("*").single();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  // An agent-built search replaces any auto-generated one.
  await admin.from("saved_searches").update({ active: false }).eq("client_id", client.id).eq("source", "auto");

  // --- GHL contact sync (create/update, tag, assign owner). Sends nothing.
  let ghl: { ok: boolean; detail: string } = { ok: false, detail: "GHL_ALERT_WEBHOOK_URL not set — contact not synced yet" };
  if (ghlWebhookConfigured()) {
    const agents = await loadAgents(admin);
    const res = await postToGhl({ ...basePayload(client, agents, "sync"), search_summary: summarizeCriteria(crit), tags: "agent_client,search_alerts" });
    ghl = { ok: res.ok, detail: res.ok ? "synced" : `${res.status} ${res.detail}` };
  }

  return NextResponse.json({ ok: true, client, search, ghl, mode: alertsMode() });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req);
  if ("failure" in auth) return auth.failure;
  const { admin, user } = auth;
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  if (b.search_id) {
    const { error } = await admin.from("saved_searches").update({ active: !!b.active }).eq("id", Number(b.search_id));
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (!b.client_id) return NextResponse.json({ error: "client_id or search_id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof b.alerts_enabled === "boolean") patch.alerts_enabled = b.alerts_enabled;
  if (["instant", "daily", "weekly"].includes(b.digest_frequency)) patch.digest_frequency = b.digest_frequency;
  if (b.agent_id !== undefined) patch.agent_id = b.agent_id ? Number(b.agent_id) : null;
  if (typeof b.sms_weekly === "boolean") {
    const { data: c } = await admin.from("clients").select("phone, sms_consent_at").eq("id", Number(b.client_id)).single();
    if (b.sms_weekly) {
      if (!c?.phone) return NextResponse.json({ error: "Add a mobile number first" }, { status: 400 });
      if (!c.sms_consent_at) {
        if (!b.sms_consent) return NextResponse.json({ error: "Confirm the client agreed to receive texts" }, { status: 400 });
        patch.sms_consent_at = new Date().toISOString();
        patch.sms_consent_note = `Consent confirmed by ${user.email} in /admin`;
      }
    }
    patch.sms_weekly = b.sms_weekly;
  }
  const { error } = await admin.from("clients").update(patch).eq("id", Number(b.client_id));
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if ("failure" in auth) return auth.failure;
  const id = Number(new URL(req.url).searchParams.get("search_id"));
  if (!id) return NextResponse.json({ error: "search_id required" }, { status: 400 });
  const { error } = await auth.admin.from("saved_searches").delete().eq("id", id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
