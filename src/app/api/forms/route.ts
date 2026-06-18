import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

// ============================================================
// ONE webhook for EVERY form on the site.
// Each submission carries a stable `form_id`. This route:
//   1. writes it to the right Supabase table (service role)
//   2. forwards the SAME payload to FORMS_WEBHOOK_URL
// Add new forms by posting a new form_id — no new endpoint.
// ============================================================

const FORM_IDS = [
  "contact",
  "listing_inquiry",
  "showing_request",
  "saved_search",
  "home_valuation",
  "mortgage_preapproval",
  "buyer_guide",
  "buyer_quiz",
] as const;
type FormId = (typeof FORM_IDS)[number];

interface FormPayload {
  form_id: FormId;
  submission_id: string;
  source_url?: string;
  listing_key?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  preferred_times?: string;
  working_with_agent?: boolean;
  criteria?: Record<string, unknown>;
  alert_frequency?: string;
  // Spam-protection signals (optional; sent by public-facing forms):
  company?: string; // honeypot — must be empty
  form_loaded_at?: number; // epoch ms when the form was rendered
  [k: string]: unknown;
}

// Minimum time (ms) a real person needs to fill out a form. Anything faster
// is almost certainly an automated submission.
const MIN_SUBMIT_MS = 2500;

// Returns a reason string if the payload looks like spam, else null.
// Checks are only applied when the relevant signal is present, so forms that
// don't send these fields are unaffected.
function spamReason(p: FormPayload): string | null {
  if (typeof p.company === "string" && p.company.trim() !== "") return "honeypot";
  if (typeof p.form_loaded_at === "number" && Number.isFinite(p.form_loaded_at)) {
    const elapsed = Date.now() - p.form_loaded_at;
    if (elapsed >= 0 && elapsed < MIN_SUBMIT_MS) return "too-fast";
  }
  return null;
}

async function writeToSupabase(p: FormPayload) {
  const supabase = getAdminClient();

  if (p.form_id === "showing_request") {
    const { error } = await supabase.from("showing_requests").insert({
      listing_key: p.listing_key ?? null,
      full_name: p.name ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      preferred_times: p.preferred_times ?? null,
      message: p.message ?? null,
      status: "new",
    });
    if (error) throw error;
    return;
  }

  if (p.form_id === "saved_search") {
    const { error } = await supabase.from("saved_searches").insert({
      email: p.email ?? "",
      name: p.name ?? null,
      criteria: p.criteria ?? {},
      alert_frequency: p.alert_frequency ?? "instant",
    });
    if (error) throw error;
    return;
  }

  // Everything else is a lead. `destination` = which form produced it.
  const { error } = await supabase.from("leads").insert({
    full_name: p.name ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
    source: p.source_url ?? null,
    destination: p.form_id,
    listing_key: p.listing_key ?? null,
    message: p.message ?? null,
    working_with_agent: p.working_with_agent ?? null,
  });
  if (error) throw error;
}

export async function POST(req: Request) {
  let body: Partial<FormPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.form_id || !FORM_IDS.includes(body.form_id as FormId)) {
    return NextResponse.json(
      { ok: false, error: `form_id must be one of: ${FORM_IDS.join(", ")}` },
      { status: 400 },
    );
  }

  const payload: FormPayload = {
    ...body,
    form_id: body.form_id as FormId,
    submission_id: body.submission_id || crypto.randomUUID(),
    submitted_at: new Date().toISOString(),
  };

  // Spam gate: silently accept (so bots get no signal) but drop the
  // submission — never write it or forward it downstream.
  const reason = spamReason(payload);
  if (reason) {
    console.warn(`[forms] dropped spam (${reason}) for form_id=${payload.form_id}`);
    return NextResponse.json({ ok: true, submission_id: payload.submission_id });
  }

  // Strip the spam-protection signals so they're never stored or forwarded.
  delete payload.company;
  delete payload.form_loaded_at;

  // 1) Persist to Supabase first so a webhook outage never loses a lead.
  let dbOk = true;
  let dbError: string | null = null;
  try {
    await writeToSupabase(payload);
  } catch (e) {
    dbOk = false;
    dbError = (e as Error).message;
    console.error("[forms] supabase write failed:", dbError);
  }

  // 2) Forward the same payload to the single external webhook (if set).
  let webhookOk: boolean | null = null;
  const url = process.env.FORMS_WEBHOOK_URL;
  if (url) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      webhookOk = res.ok;
      if (!res.ok) console.error("[forms] webhook non-2xx:", res.status);
    } catch (e) {
      webhookOk = false;
      console.error("[forms] webhook failed:", (e as Error).message);
    }
  }

  const ok = dbOk || webhookOk === true;
  return NextResponse.json(
    { ok, submission_id: payload.submission_id, dbOk, dbError, webhookOk },
    { status: ok ? 200 : 500 },
  );
}
