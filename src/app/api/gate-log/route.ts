import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

// Lightweight, best-effort log of what the listing capture gate did for a visitor
// (see components/CaptureGate.tsx). Lets us prove whether the gate is actually
// shown to signed-out visitors and where they stop. Never blocks the page.
const OUTCOMES = new Set([
  "shown", "skipped_signed_in", "skipped_session_flag", "skipped_client_cookie",
  "step_email", "step_details", "complete", "error",
]);

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const outcome = String(b?.outcome ?? "");
    if (!OUTCOMES.has(outcome)) return new NextResponse(null, { status: 204 });
    const detail = b?.detail && typeof b.detail === "object" ? b.detail : {};
    await getAdminClient().from("gate_events").insert({
      outcome,
      traffic: b?.traffic === "ad" ? "ad" : "organic",
      path: String(b?.path ?? "").slice(0, 200),
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
      detail: JSON.parse(JSON.stringify(detail).slice(0, 1000) || "{}"),
    });
  } catch { /* best effort */ }
  return new NextResponse(null, { status: 204 });
}
