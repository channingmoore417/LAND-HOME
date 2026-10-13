import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { listingStats } from "@/lib/listings";
import { canonicalFromForm, normalizeCriteria, summarizeCriteria } from "@/lib/alerts/criteria";
import { loadAgents, notifyAgent } from "@/lib/alerts/run";
import { ghlConfigured } from "@/lib/alerts/ghl";
import type { Client } from "@/lib/alerts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Client-facing "adjust the homes I'm getting", reached from the email footer
// link. Token-authenticated (the 32-char id only the client has).
//   { token, action: "preview", criteria }                       → live match count
//   { token, action: "save", criteria, digest_frequency }        → update their search
// A saved change is logged on the contact and sent to the assigned agent via GHL.
export async function POST(req: Request) {
  let b: { token?: string; action?: string; criteria?: Record<string, unknown>; digest_frequency?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const token = (b.token ?? "").trim();
  if (!/^[a-f0-9]{32}$/.test(token)) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = getAdminClient();
  const { data } = await admin.from("clients").select("*").eq("token", token).maybeSingle();
  const client = data as Client | null;
  if (!client) return NextResponse.json({ ok: false }, { status: 404 });

  const criteria = canonicalFromForm(b.criteria ?? {});
  const crit = normalizeCriteria(criteria);
  if (!crit.cities?.length) return NextResponse.json({ ok: false, error: "Pick at least one town." }, { status: 400 });

  if (b.action === "preview") {
    const stats = await listingStats(crit);
    return NextResponse.json({ ok: true, count: stats.count });
  }
  if (b.action !== "save") return NextResponse.json({ ok: false }, { status: 400 });

  const summary = summarizeCriteria(crit);
  const freq = ["instant", "daily", "weekly"].includes(b.digest_frequency ?? "") ? b.digest_frequency! : client.digest_frequency;

  // Edit their main search: newest agent-built one, else newest active, else create one.
  const { data: existing } = await admin.from("saved_searches").select("id, source, active, created_at")
    .eq("client_id", client.id).order("created_at", { ascending: false });
  const rows = (existing ?? []) as { id: number; source: string; active: boolean }[];
  const main = rows.find((r) => r.source === "agent" && r.active) ?? rows.find((r) => r.active) ?? rows[0];
  if (main) {
    const { error } = await admin.from("saved_searches").update({
      criteria, name: summary.slice(0, 80), alert_frequency: freq, active: true,
    }).eq("id", main.id);
    if (error) return NextResponse.json({ ok: false }, { status: 500 });
  } else {
    const { error } = await admin.from("saved_searches").insert({
      email: client.email, name: summary.slice(0, 80), criteria, alert_frequency: freq, active: true,
      client_id: client.id, agent_id: client.agent_id, source: "auto",
    });
    if (error) return NextResponse.json({ ok: false }, { status: 500 });
  }
  await admin.from("clients").update({ digest_frequency: freq, alerts_enabled: true }).eq("id", client.id);

  const title = "✏️ Client adjusted their home search";
  const detail = `New search: ${summary}. Alerts: ${freq === "instant" ? "as homes hit the market" : freq === "daily" ? "daily" : "weekly"}. A good moment to check in.`;
  await admin.from("contact_notes").insert({ contact_email: client.email, author_email: "system", body: `Client adjusted their home search. ${detail}` });
  try {
    if (ghlConfigured()) await notifyAgent(admin, client, await loadAgents(admin), title, detail);
  } catch (e) {
    console.error("[alerts] adjust notify failed:", (e as Error).message);
  }
  return NextResponse.json({ ok: true, summary });
}
