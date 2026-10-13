import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { alertsMode, runAlerts } from "@/lib/alerts/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The alert runner endpoint.
//   • Supabase pg_cron calls this hourly with `Authorization: Bearer $ALERTS_CRON_SECRET`.
//   • Admins can call it with their own session token for a single client:
//       POST /api/alerts/run?client=12&force=1&dry=1&preview=1
// Nothing leaves the building unless ALERTS_MODE is `test` or `live` (see lib/alerts/run.ts).
async function handle(req: Request) {
  const secret = process.env.ALERTS_CRON_SECRET;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const isCron = !!secret && bearer === secret;

  let admin;
  if (isCron) {
    admin = getAdminClient();
  } else {
    const auth = await requireAdmin(req);
    if ("failure" in auth) return auth.failure;
    admin = auth.admin;
  }

  const q = new URL(req.url).searchParams;
  const clientId = q.get("client") ? Number(q.get("client")) : undefined;
  // Cron may only run the normal schedule; ad-hoc flags are for signed-in admins.
  const adhoc = !isCron;
  const out = await runAlerts(admin, {
    clientId,
    dry: adhoc && q.get("dry") === "1",
    force: adhoc && q.get("force") === "1",
    preview: adhoc && q.get("preview") === "1",
  });
  const counts = out.results.reduce<Record<string, number>>((m, r) => {
    m[`email_${r.email_status}`] = (m[`email_${r.email_status}`] ?? 0) + 1;
    if (r.sms_status !== "off") m[`sms_${r.sms_status}`] = (m[`sms_${r.sms_status}`] ?? 0) + 1;
    return m;
  }, {});
  console.log(`[alerts] mode=${alertsMode()} clients=${out.results.length}`, JSON.stringify(counts));
  return NextResponse.json({ ok: true, mode: out.mode, counts, results: out.results });
}

export const POST = handle;
export const GET = handle;
