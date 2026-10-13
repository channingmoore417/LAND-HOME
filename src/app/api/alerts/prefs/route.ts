import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, token-authenticated preferences from the /m/<token> page.
// The token is a 32-char random id that only the client receives.
//   { token, action: "pause" | "resume" | "sms_off" | "sms_on" }
export async function POST(req: Request) {
  let body: { token?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const token = (body.token ?? "").trim();
  if (!/^[a-f0-9]{32}$/.test(token)) return NextResponse.json({ ok: false }, { status: 400 });

  const patch: Record<string, unknown> | null =
    body.action === "pause" ? { alerts_enabled: false }
    : body.action === "resume" ? { alerts_enabled: true }
    : body.action === "sms_off" ? { sms_weekly: false }
    : null; // texting can only be turned ON by an explicit consent flow, never from a link
  if (!patch) return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });

  const admin = getAdminClient();
  const { data, error } = await admin.from("clients").update(patch).eq("token", token).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true });
}
