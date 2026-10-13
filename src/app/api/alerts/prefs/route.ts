import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { basePayload, loadAgents } from "@/lib/alerts/run";
import { postToGhl } from "@/lib/alerts/ghl";
import type { Client } from "@/lib/alerts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, token-authenticated preferences from the /m/<token> page and the
// "Unsubscribe" link in alert emails. The token is a 32-char random id that
// only the client receives.
//   { token, action: "pause" | "resume" | "sms_off" }
// Every real change (a) leaves a note on the contact in /admin and
// (b) tells the assigned agent through the GHL alert workflow, so nobody is
// surprised when a client goes quiet.
const COPY: Record<string, { title: string; detail: string }> = {
  pause: { title: "⏸ Client paused their home alerts", detail: "They used the unsubscribe link in their home-alert email, so they will not get new-listing emails until they turn alerts back on. Worth a quick personal check-in." },
  resume: { title: "▶️ Client turned their home alerts back on", detail: "They are receiving new-listing emails again." },
  sms_off: { title: "🔕 Client stopped their weekly home-alert texts", detail: "Emails are unchanged. They will not get the Saturday text." },
};

export async function POST(req: Request) {
  let body: { token?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const token = (body.token ?? "").trim();
  if (!/^[a-f0-9]{32}$/.test(token)) return NextResponse.json({ ok: false }, { status: 400 });

  const action = body.action ?? "";
  // Texting can only be turned ON through the agent's consent flow, never from a link.
  if (!COPY[action]) return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });

  const admin = getAdminClient();
  const { data } = await admin.from("clients").select("*").eq("token", token).maybeSingle();
  const client = data as Client | null;
  if (!client) return NextResponse.json({ ok: false }, { status: 404 });

  const patch: Record<string, unknown> =
    action === "pause" ? { alerts_enabled: false }
    : action === "resume" ? { alerts_enabled: true }
    : { sms_weekly: false };
  const unchanged =
    (action === "pause" && !client.alerts_enabled) ||
    (action === "resume" && client.alerts_enabled) ||
    (action === "sms_off" && !client.sms_weekly);

  if (!unchanged) {
    const { error } = await admin.from("clients").update(patch).eq("id", client.id);
    if (error) return NextResponse.json({ ok: false }, { status: 500 });

    // Note on the contact record in /admin (best effort).
    const copy = COPY[action];
    await admin.from("contact_notes").insert({
      contact_email: client.email, author_email: "system", body: `${copy.title.replace(/^\S+\s/, "")}. ${copy.detail}`,
    });

    // Tell the assigned agent (GHL note + in-app notification on the contact). Best effort.
    try {
      const agents = await loadAgents(admin);
      await postToGhl({ ...basePayload(client, agents, "activity"), activity_title: copy.title, activity_detail: copy.detail });
    } catch (e) {
      console.error("[alerts] activity notify failed:", (e as Error).message);
    }
  }
  return NextResponse.json({ ok: true });
}
