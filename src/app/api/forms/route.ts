import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { syncLeadToBoldTrail } from "@/lib/boldtrail";
import { clientIp, evaluateSpam } from "@/lib/spam";

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
  "cash_offer",
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
  // Spam signals, attached by useFormGuard() on every form (see spam.ts):
  company?: string; // honeypot — must be empty
  form_loaded_at?: number; // epoch ms when the form was rendered
  human_interactions?: number; // key/pointer events before submit
  [k: string]: unknown;
}

// Returns which table the submission landed in and the new row id, so the
// BoldTrail sync below can stamp the row once the contact is created.
async function writeToSupabase(p: FormPayload): Promise<{ table: string; id: number } | null> {
  const supabase = getAdminClient();

  if (p.form_id === "showing_request") {
    const { data, error } = await supabase.from("showing_requests").insert({
      listing_key: p.listing_key ?? null,
      full_name: p.name ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      preferred_times: p.preferred_times ?? null,
      message: p.message ?? null,
      status: "new",
    }).select("id").single();
    if (error) throw error;
    return { table: "showing_requests", id: data.id };
  }

  if (p.form_id === "saved_search") {
    const { error } = await supabase.from("saved_searches").insert({
      email: p.email ?? "",
      name: p.name ?? null,
      criteria: p.criteria ?? {},
      alert_frequency: p.alert_frequency ?? "instant",
    });
    if (error) throw error;
    return null;
  }

  // Everything else is a lead. `destination` = which form produced it.
  // `criteria` carries the form's structured answers (valuation property
  // details, pre-approval numbers, quiz picks); the DB trigger forwards its
  // keys to GHL flat so each one maps to its own custom field.
  const { data, error } = await supabase.from("leads").insert({
    full_name: p.name ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
    source: p.source_url ?? null,
    destination: p.form_id,
    listing_key: p.listing_key ?? null,
    message: p.message ?? null,
    working_with_agent: p.working_with_agent ?? null,
    criteria: p.criteria ?? null,
  }).select("id").single();
  if (error) throw error;
  return { table: "leads", id: data.id };
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

  // Spam gate. Respond exactly as we would on success so bots learn nothing
  // about why they were dropped, but never write, sync or forward it. This
  // runs before the Supabase write AND before the BoldTrail sync, so junk
  // never reaches the CRM.
  const verdict = evaluateSpam(payload, {
    ip: clientIp(req.headers),
    origin: req.headers.get("origin"),
    host: req.headers.get("host"),
  });
  if (verdict.spam) {
    console.warn(
      "[forms] dropped spam",
      JSON.stringify({
        form_id: payload.form_id,
        score: verdict.score,
        reasons: verdict.reasons,
        email: payload.email ?? null,
      }),
    );
    return NextResponse.json({ ok: true, submission_id: payload.submission_id });
  }
  // Near-misses are worth seeing — they are how the threshold gets tuned.
  if (verdict.score > 0) {
    console.info(
      "[forms] allowed with spam score",
      JSON.stringify({ form_id: payload.form_id, score: verdict.score, reasons: verdict.reasons }),
    );
  }

  // Strip the spam signals so they are never stored or forwarded downstream.
  delete payload.company;
  delete payload.form_loaded_at;
  delete payload.human_interactions;

  // 1) Persist to Supabase first so a webhook outage never loses a lead.
  let dbOk = true;
  let dbError: string | null = null;
  let dbRow: { table: string; id: number } | null = null;
  try {
    dbRow = await writeToSupabase(payload);
  } catch (e) {
    dbOk = false;
    dbError = (e as Error).message;
    console.error("[forms] supabase write failed:", dbError);
  }

  // 1b) Push the contact into BoldTrail (kvCORE) — best-effort: never blocks
  // or fails the submission, and skips itself when the token isn't set.
  let boldtrailOk: boolean | null = null;
  const bt = await syncLeadToBoldTrail({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    source: "landhomegroup.com",
    formId: payload.form_id,
  });
  if (bt) {
    boldtrailOk = bt.ok;
    if (bt.ok && dbRow) {
      try {
        await getAdminClient()
          .from(dbRow.table)
          .update({ boldtrail_contact_id: bt.contactId, boldtrail_synced_at: new Date().toISOString() })
          .eq("id", dbRow.id);
      } catch (e) {
        console.error("[forms] boldtrail stamp failed:", (e as Error).message);
      }
    }
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
    { ok, submission_id: payload.submission_id, dbOk, dbError, webhookOk, boldtrailOk },
    { status: ok ? 200 : 500 },
  );
}
