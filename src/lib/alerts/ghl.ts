// ============================================================
// GoHighLevel delivery via the REST API (Private Integration token, the same
// GHL_API_KEY the agent recap uses).
//
// Why the API and not a webhook + workflow template: the HTML email body is
// handed to GHL's conversation API directly (verified: stored and delivered
// intact), so there is no template variable to come through blank, no if/else
// workflow to maintain, and every email/text shows up in the contact's
// conversation thread.
//
// Scopes the token needs: contacts.readonly, contacts.write,
// conversations.write, conversations/message.write.
//
// Contact rules: a contact that already exists in GHL is NEVER re-owned or
// re-tagged destructively — we look it up first, only ADD our tags, and only
// set an owner when it has none. Lead automations are webhook-triggered, so
// nothing here fires them; the `agent_client` tag lets speed-to-lead skip these.
// ============================================================

const BASE = "https://services.leadconnectorhq.com";
const LOCATION_ID = process.env.GHL_LOCATION_ID || "xdGkCWotXaek58gmTbxt";

export interface GhlResult { ok: boolean; status: number; detail: string; id?: string }

export function ghlConfigured(): boolean {
  return !!process.env.GHL_API_KEY;
}

async function call<T = Record<string, unknown>>(
  path: string,
  method: "GET" | "POST" | "PUT",
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: T; detail: string }> {
  if (!process.env.GHL_API_KEY) return { ok: false, status: 0, data: {} as T, detail: "GHL_API_KEY is not set" };
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let data: unknown = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON error body */ }
    return { ok: res.ok, status: res.status, data: data as T, detail: res.ok ? "ok" : `${res.status} ${text.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, status: 0, data: {} as T, detail: (e as Error).message };
  }
}

export function splitName(full: string | null | undefined): { first: string | null; last: string | null } {
  const t = (full ?? "").trim();
  if (!t) return { first: null, last: null };
  const i = t.indexOf(" ");
  return i < 0 ? { first: t, last: null } : { first: t.slice(0, i), last: t.slice(i + 1).trim() || null };
}

interface GhlContact { id: string; assignedTo?: string | null; tags?: string[] }

export interface ContactInput {
  email: string;
  phone?: string | null;
  name?: string | null;
  /** GHL user id to own the contact IF it has no owner yet. */
  ownerUserId?: string | null;
  tags?: string[];
}

/** Find the GHL contact by email (then phone), creating it only if it does not exist. */
export async function ensureContact(input: ContactInput): Promise<GhlResult & { assignedTo?: string | null }> {
  const email = input.email.trim().toLowerCase();
  const tags = input.tags ?? ["agent_client", "search_alerts"];

  // 1) existing contact?
  const q = new URLSearchParams({ locationId: LOCATION_ID, email });
  const dup = await call<{ contact?: GhlContact }>(`/contacts/search/duplicate?${q}`, "GET");
  let contact: GhlContact | undefined = dup.ok ? dup.data.contact : undefined;
  if (!contact && !dup.ok && dup.status !== 404 && dup.status !== 422) {
    return { ok: false, status: dup.status, detail: `contact lookup failed: ${dup.detail}` };
  }

  // 2) create if missing
  if (!contact) {
    const { first, last } = splitName(input.name);
    const created = await call<{ contact?: GhlContact; meta?: { contactId?: string } }>("/contacts/", "POST", {
      locationId: LOCATION_ID, email, phone: input.phone || undefined,
      firstName: first ?? undefined, lastName: last ?? undefined,
      assignedTo: input.ownerUserId || undefined, tags, source: "Client search alerts",
    });
    if (created.ok && created.data.contact) {
      return { ok: true, status: created.status, detail: "created", id: created.data.contact.id, assignedTo: input.ownerUserId ?? null };
    }
    // The location blocks duplicates and told us which contact already owns this email/phone.
    const existingId = created.data.meta?.contactId;
    if (!existingId) return { ok: false, status: created.status, detail: `contact create failed: ${created.detail}` };
    contact = { id: existingId };
  }

  // 3) existing: only ADD our tags; only set an owner when there is none.
  await call(`/contacts/${contact.id}/tags`, "POST", { tags });
  let assignedTo = contact.assignedTo ?? null;
  if (contact.assignedTo === undefined) {
    const full = await call<{ contact?: GhlContact }>(`/contacts/${contact.id}`, "GET");
    assignedTo = full.data.contact?.assignedTo ?? null;
  }
  if (!assignedTo && input.ownerUserId) {
    const set = await call(`/contacts/${contact.id}`, "PUT", { assignedTo: input.ownerUserId });
    if (set.ok) assignedTo = input.ownerUserId;
  }
  return { ok: true, status: 200, detail: "existing", id: contact.id, assignedTo };
}

/** Send the alert email through GHL's mail system (HTML body goes straight in). */
export async function sendEmail(opts: { contactId: string; subject: string; html: string }): Promise<GhlResult> {
  const from = process.env.ALERTS_EMAIL_FROM || undefined; // e.g. "Lauren Huffman <lauren@landhomegroup.com>" once the domain is verified in GHL
  const r = await call<{ messageId?: string; msg?: string }>("/conversations/messages", "POST", {
    type: "Email", contactId: opts.contactId, subject: opts.subject, html: opts.html, emailFrom: from,
  });
  return { ok: r.ok, status: r.status, detail: r.ok ? (r.data.msg ?? "queued") : r.detail, id: r.data.messageId };
}

/** Send the weekly text (respects GHL DND / A2P like any other GHL text). */
export async function sendSms(opts: { contactId: string; text: string }): Promise<GhlResult> {
  const r = await call<{ messageId?: string; msg?: string }>("/conversations/messages", "POST", {
    type: "SMS", contactId: opts.contactId, message: opts.text,
  });
  return { ok: r.ok, status: r.status, detail: r.ok ? (r.data.msg ?? "queued") : r.detail, id: r.data.messageId };
}

/** Tell the contact's owner something happened: a note on the contact + a task assigned to them. */
export async function notifyOwner(opts: { contactId: string; userId: string | null; title: string; detail: string }): Promise<GhlResult> {
  const note = await call(`/contacts/${opts.contactId}/notes`, "POST", {
    body: `${opts.title}\n${opts.detail}`, userId: opts.userId || undefined,
  });
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const task = await call(`/contacts/${opts.contactId}/tasks`, "POST", {
    title: opts.title.replace(/^[^\p{L}\p{N}]+/u, ""), body: opts.detail, dueDate: due, completed: false,
    assignedTo: opts.userId || undefined,
  });
  const ok = note.ok || task.ok;
  return { ok, status: ok ? 200 : task.status, detail: ok ? "ok" : `${note.detail} | ${task.detail}` };
}
