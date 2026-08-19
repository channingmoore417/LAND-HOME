// BoldTrail (kvCORE) lead sync — Inside Real Estate Public API v2.
// Docs: https://developer.insiderealestate.com/publicv2/docs/contact-management
//
// Called best-effort from /api/forms after the Supabase write: a BoldTrail
// outage must never lose or delay a lead (Supabase is the source of truth).
// Per the docs' "Search then Create" guidance we look the contact up by
// email first and only create when there's no match; leaving
// assigned_agent_id off the create routes the lead through the account's
// own lead-routing rules.

const BASE = process.env.BOLDTRAIL_BASE_URL || "https://api.kvcore.com";

export interface BoldTrailLead {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null; // where the lead came from, e.g. "landhomegroup.com"
  formId?: string | null; // which form produced it → deal_type + hashtag
  city?: string | null; // property city (when the form is about a listing) → hashtag
}

// Which side of a deal each form signals. Forms not listed (plain contact)
// send no deal_type and let BoldTrail default it.
const DEAL_TYPE: Record<string, string> = {
  listing_inquiry: "buyer",
  showing_request: "buyer",
  buyer_guide: "buyer",
  buyer_quiz: "buyer",
  mortgage_preapproval: "buyer",
  saved_search: "buyer",
  home_valuation: "seller",
  cash_offer: "seller",
};

export interface BoldTrailResult {
  ok: boolean;
  contactId: string | null;
  existing: boolean;
  detail: string;
}

function headers(token: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    accept: "application/json",
    authorization: `Bearer ${token}`,
  };
  // Only needed for super-scoped (multi-account partner) tokens, which must
  // name the child account they act on. Harmless to omit for normal tokens.
  if (process.env.BOLDTRAIL_ACCOUNT_ID) h["X-Account-ID"] = process.env.BOLDTRAIL_ACCOUNT_ID;
  return h;
}

export async function syncLeadToBoldTrail(lead: BoldTrailLead): Promise<BoldTrailResult | null> {
  const token = process.env.BOLDTRAIL_API_TOKEN;
  if (!token) return null; // integration not configured — skip silently

  const email = lead.email?.trim().toLowerCase() || null;
  const phone = (lead.phone ?? "").replace(/\D/g, "") || null;
  if (!email && !phone) return null; // nothing BoldTrail can key a contact on

  const nameParts = (lead.name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || (email ? email.split("@")[0] : "Website");
  const lastName = nameParts.slice(1).join(" ") || "Lead";

  try {
    // 1) Search-then-create (docs recommend this to avoid duplicates).
    if (email) {
      const searchRes = await fetch(
        `${BASE}/v2/public/contacts?filter[email]=${encodeURIComponent(email)}`,
        { headers: headers(token) },
      );
      if (searchRes.ok) {
        const found = await searchRes.json().catch(() => null);
        const match = found?.data?.[0];
        if (match?.id) {
          console.log(`[boldtrail] existing contact ${match.id} for ${email} (form=${lead.formId})`);
          return { ok: true, contactId: String(match.id), existing: true, detail: "matched existing contact" };
        }
      } else {
        console.error(`[boldtrail] search failed ${searchRes.status}: ${(await searchRes.text()).slice(0, 300)}`);
      }
    }

    // 2) Create. No assigned_agent_id → BoldTrail lead-routing assigns it.
    const body: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
    };
    if (email) body.email = email;
    if (phone) {
      // kvCORE's contact schema stores mobile numbers as cell_phone_1; send
      // plain `phone` too — unknown attributes are ignored, so whichever
      // name the endpoint honors wins.
      body.cell_phone_1 = phone;
      body.phone = phone;
    }
    if (lead.source) body.source = lead.source;
    const dealType = lead.formId ? DEAL_TYPE[lead.formId] : undefined;
    if (dealType) body.deal_type = dealType;
    const hashtags = [
      "website-lead",
      ...(lead.formId ? [lead.formId.replace(/_/g, "-")] : []),
      ...(lead.city ? [lead.city.toLowerCase().replace(/\s+/g, "-")] : []),
    ];
    body.hashtags = hashtags;

    const res = await fetch(`${BASE}/v2/public/contact`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (res.status === 409) {
      // BoldTrail's duplicate protection: the contact already exists (their
      // search index can lag a fresh create by ~30s, so our search-first
      // pass may miss it). Not a failure — the contact is there.
      console.log(`[boldtrail] duplicate suppressed by BoldTrail for ${email ?? phone} (form=${lead.formId})`);
      return { ok: true, contactId: null, existing: true, detail: "duplicate suppressed by BoldTrail" };
    }
    if (!res.ok) {
      console.error(`[boldtrail] create failed ${res.status} (form=${lead.formId}): ${text.slice(0, 400)}`);
      return { ok: false, contactId: null, existing: false, detail: `create failed ${res.status}` };
    }

    let contactId: string | null = null;
    try {
      const json = JSON.parse(text);
      contactId = String(json?.id ?? json?.data?.id ?? json?.contact?.id ?? "") || null;
    } catch { /* some 2xx responses may not be JSON — id stays null */ }
    console.log(`[boldtrail] created contact ${contactId ?? "(id not returned)"} for ${email ?? phone} (form=${lead.formId})`);
    return { ok: true, contactId, existing: false, detail: "created" };
  } catch (e) {
    console.error(`[boldtrail] sync error (form=${lead.formId}): ${(e as Error).message}`);
    return { ok: false, contactId: null, existing: false, detail: (e as Error).message };
  }
}
