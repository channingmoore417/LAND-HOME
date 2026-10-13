import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { SITE_URL } from "@/lib/seoConfig";

export const runtime = "nodejs";
export const maxDuration = 60;

// ============================================================
// Agent activity recap. A GoHighLevel scheduled workflow calls this at
// the exact local times (Mon–Fri 8 AM / 12 PM / 4 PM, Sat & Sun 4 PM), so GHL
// owns the timing and the time zone. For each GHL user it finds their
// assigned contacts (GHL API), summarizes what those people did on the
// site since THAT AGENT'S LAST SUCCESSFUL RECAP (Supabase digest_runs), and
// posts one email per agent to GHL_DIGEST_WEBHOOK_URL, where a GHL workflow
// sends it. Because the window is "since last send", a missed or failed
// run never loses activity — the next run just covers more. Agents with
// no activity get nothing.
// ============================================================

const TZ = "America/Chicago";
const LOCATION_ID = process.env.GHL_LOCATION_ID || "xdGkCWotXaek58gmTbxt";
const GHL_API = "https://services.leadconnectorhq.com";

const DEFAULT_WINDOW_MS = 16 * 60 * 60 * 1000; // first-ever run

function slotName(d: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: false }).format(d)) % 24;
  return hour < 11 ? "Morning" : hour < 15 ? "Lunch" : "Afternoon";
}

async function ghl<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GHL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GHL_API_KEY}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`GHL ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

interface GhlUser { id: string; name?: string; firstName?: string; email?: string }
interface GhlContact { id: string; contactName?: string; firstName?: string; lastName?: string; email?: string; phone?: string }

async function assignedContacts(userId: string): Promise<GhlContact[]> {
  const all: GhlContact[] = [];
  for (let page = 1; page <= 10; page++) {
    const r = await ghl<{ contacts?: GhlContact[] }>("/contacts/search", {
      method: "POST",
      body: JSON.stringify({
        locationId: LOCATION_ID, page, pageLimit: 100,
        filters: [{ field: "assignedTo", operator: "eq", value: userId }],
      }),
    });
    const batch = r.contacts ?? [];
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

const money = (n: unknown) => (typeof n === "number" ? `$${n.toLocaleString("en-US")}` : "");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function critText(c: Record<string, unknown> | null | undefined): string {
  if (!c) return "";
  const out: string[] = [];
  for (const k of ["city", "zip", "type", "neighborhood"]) if (c[k]) out.push(String(c[k]));
  if (Array.isArray(c.communities) && c.communities.length) out.push(c.communities.join(", "));
  if (c.beds) out.push(`${c.beds}+ bd`);
  if (c.baths) out.push(`${c.baths}+ ba`);
  if (c.minPrice || c.maxPrice) out.push(`${c.minPrice ? money(Number(c.minPrice)) : "any"} – ${c.maxPrice ? money(Number(c.maxPrice)) : "any"}`);
  if (typeof c.price === "string" && c.price) out.push(c.price);
  if (Array.isArray(c.features) && c.features.length) out.push(c.features.join(", "));
  return out.join(" · ");
}

interface Activity { weight: number; html: string; text: string }

interface ContactRecap {
  name: string; email: string; phone: string; score: number; items: Activity[];
}

async function buildRecaps(contacts: GhlContact[], since: Date): Promise<ContactRecap[]> {
  const db = getAdminClient();
  const sinceIso = since.toISOString();
  const byEmail = new Map<string, GhlContact>();
  for (const c of contacts) if (c.email) byEmail.set(c.email.toLowerCase(), c);
  const emails = [...byEmail.keys()];
  if (!emails.length) return [];

  const [profiles, favs, searches, leads, showings] = await Promise.all([
    db.from("profiles").select("id, email").in("email", emails),
    db.from("favorites").select("email, listing_key, created_at").in("email", emails).gte("created_at", sinceIso),
    db.from("saved_searches").select("email, name, criteria, created_at").in("email", emails).gte("created_at", sinceIso),
    db.from("leads").select("email, destination, listing_key, message, created_at").in("email", emails).gte("created_at", sinceIso),
    db.from("showing_requests").select("email, listing_key, preferred_times, created_at").in("email", emails).gte("created_at", sinceIso),
  ]);
  const idToEmail = new Map<string, string>();
  for (const p of profiles.data ?? []) if (p.email) idToEmail.set(p.id, p.email.toLowerCase());
  const ids = [...idToEmail.keys()];

  const activity = ids.length
    ? await db.from("user_activity").select("user_id, type, listing_key, meta, created_at").in("user_id", ids).gte("created_at", sinceIso)
    : { data: [] as { user_id: string; type: string; listing_key: string | null; meta: Record<string, unknown>; created_at: string }[] };
  // Signals table only exists once the behavior-signals migration is applied.
  let signals: { user_id: string | null; signal: string; listing_key: string | null; meta: Record<string, unknown> }[] = [];
  if (ids.length) {
    const r = await db.from("intent_signals").select("user_id, signal, listing_key, meta").in("user_id", ids).gte("created_at", sinceIso);
    if (!r.error) signals = r.data ?? [];
  }

  // Resolve every listing mentioned to a full address.
  const keys = new Set<string>();
  for (const r of [...(favs.data ?? []), ...(leads.data ?? []), ...(showings.data ?? [])]) if (r.listing_key) keys.add(r.listing_key);
  for (const a of activity.data ?? []) if (a.listing_key) keys.add(a.listing_key);
  for (const s of signals) if (s.listing_key) keys.add(s.listing_key);
  const listing = new Map<string, { addr: string; price: string }>();
  if (keys.size) {
    const { data } = await db.from("listings")
      .select("listing_key, unparsed_address, city, state_or_province, postal_code, list_price, internet_address_yn")
      .in("listing_key", [...keys]);
    for (const l of data ?? []) {
      const addr = l.internet_address_yn !== false && l.unparsed_address
        ? [l.unparsed_address, l.city, `${l.state_or_province ?? "LA"} ${l.postal_code ?? ""}`.trim()].filter(Boolean).join(", ")
        : `Listing in ${l.city ?? "SWLA"}`;
      listing.set(l.listing_key, { addr, price: money(l.list_price) });
    }
  }
  const home = (key: string | null) => {
    if (!key) return { html: "a property", text: "a property" };
    const l = listing.get(key);
    const url = `${SITE_URL}/listings/${key}`;
    const label = l ? `${l.addr}${l.price ? ` (${l.price})` : ""}` : "a property";
    return { html: `<a href="${url}">${esc(label)}</a>`, text: `${label} ${url}` };
  };

  const recaps = new Map<string, ContactRecap>();
  const get = (email: string) => {
    const k = email.toLowerCase();
    let r = recaps.get(k);
    if (!r) {
      const c = byEmail.get(k)!;
      r = { name: c.contactName || [c.firstName, c.lastName].filter(Boolean).join(" ") || k, email: c.email || k, phone: c.phone || "", score: 0, items: [] };
      recaps.set(k, r);
    }
    return r;
  };
  const add = (email: string | undefined | null, weight: number, html: string, text: string) => {
    if (!email || !byEmail.has(email.toLowerCase())) return;
    const r = get(email);
    r.score += weight;
    r.items.push({ weight, html, text });
  };

  for (const s of showings.data ?? []) {
    const h = home(s.listing_key);
    add(s.email, 100, `🔥 Requested a tour of ${h.html}${s.preferred_times ? ` — ${esc(s.preferred_times)}` : ""}`, `Requested a tour of ${h.text}${s.preferred_times ? ` — ${s.preferred_times}` : ""}`);
  }
  for (const l of leads.data ?? []) {
    const h = home(l.listing_key);
    const label: Record<string, string> = {
      listing_inquiry: "🔥 Asked about", mortgage_preapproval: "💰 Started a pre-approval", home_valuation: "🏡 Requested a home valuation",
      buyer_quiz: "🎯 Completed the buyer quiz", buyer_guide: "📘 Downloaded the buyer guide", contact: "📩 Sent a contact message",
    };
    const w = ["listing_inquiry", "mortgage_preapproval", "home_valuation", "contact"].includes(l.destination ?? "") ? 80 : 20;
    const what = l.destination === "listing_inquiry" ? ` ${h.html}` : "";
    const whatText = l.destination === "listing_inquiry" ? ` ${h.text}` : "";
    add(l.email, w, `${label[l.destination ?? ""] ?? esc(l.destination ?? "Submitted a form")}${what}`, `${(label[l.destination ?? ""] ?? l.destination ?? "Submitted a form").replace(/^[^\w]+/, "")}${whatText}`);
  }
  for (const f of favs.data ?? []) {
    const h = home(f.listing_key);
    add(f.email, 30, `❤️ Saved ${h.html}`, `Saved ${h.text}`);
  }
  for (const s of searches.data ?? []) {
    const c = critText(s.criteria as Record<string, unknown>) || s.name || "listing alerts";
    add(s.email, 25, `🔎 Saved a search: ${esc(c)}`, `Saved a search: ${c}`);
  }
  // Views: collapse per listing; searches: collapse per contact.
  const views = new Map<string, number>();
  const searchCount = new Map<string, number>();
  for (const a of activity.data ?? []) {
    const email = idToEmail.get(a.user_id);
    if (!email) continue;
    if (a.type === "view_listing" && a.listing_key) views.set(`${email}|${a.listing_key}`, (views.get(`${email}|${a.listing_key}`) ?? 0) + 1);
    if (a.type === "search") searchCount.set(email, (searchCount.get(email) ?? 0) + 1);
    if (a.type === "valuation") add(email, 60, "🏡 Requested a home valuation", "Requested a home valuation");
  }
  for (const [k, n] of views) {
    const [email, key] = k.split("|");
    const h = home(key);
    add(email, 10 + n * 3, `👀 Viewed ${h.html}${n > 1 ? ` (${n}×)` : ""}`, `Viewed ${h.text}${n > 1 ? ` (${n}x)` : ""}`);
  }
  for (const [email, n] of searchCount) add(email, 5, `🔍 Ran ${n} search${n > 1 ? "es" : ""}`, `Ran ${n} search${n > 1 ? "es" : ""}`);
  for (const s of signals) {
    const email = s.user_id ? idToEmail.get(s.user_id) : undefined;
    if (s.signal === "repeat_listing_view") {
      const h = home(s.listing_key);
      add(email, 40, `🔁 Keeps coming back to ${h.html}`, `Keeps coming back to ${h.text}`);
    } else if (s.signal === "return_visit") {
      add(email, 35, `↩️ Returned to the site after ${s.meta?.days_inactive} days away`, `Returned after ${s.meta?.days_inactive} days away`);
    }
  }

  return [...recaps.values()].sort((a, b) => b.score - a.score).map((r) => ({ ...r, items: r.items.sort((a, b) => b.weight - a.weight) }));
}

function renderEmail(agent: string, slot: string, recaps: ContactRecap[]) {
  const blocks = recaps.map((r) => `
    <div style="margin:0 0 18px;padding:14px 16px;border:1px solid #e3e8ec;border-radius:10px">
      <div style="font-size:16px;font-weight:700">${esc(r.name)}</div>
      <div style="font-size:13px;color:#5a6772;margin:2px 0 8px">${esc(r.phone)}${r.phone ? " · " : ""}<a href="mailto:${esc(r.email)}">${esc(r.email)}</a></div>
      <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6">${r.items.map((i) => `<li>${i.html}</li>`).join("")}</ul>
    </div>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;color:#14232e">
    <h2 style="margin:0 0 4px">${slot} recap, ${esc(agent.split(" ")[0] || agent)}</h2>
    <p style="margin:0 0 18px;color:#5a6772">${recaps.length} of your contacts ${recaps.length === 1 ? "was" : "were"} active on the website since the last recap. Most important first.</p>
    ${blocks}</div>`;
  const text = recaps.map((r) => `${r.name} · ${r.phone} · ${r.email}\n${r.items.map((i) => `  - ${i.text}`).join("\n")}`).join("\n\n");
  return { html, text };
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "1"; // build but don't send or record
  const now = new Date();
  if (!process.env.GHL_API_KEY) return NextResponse.json({ ok: false, error: "GHL_API_KEY not set" }, { status: 500 });

  const slot = slotName(now);
  const webhook = process.env.GHL_DIGEST_WEBHOOK_URL;
  const db = getAdminClient();

  const { users } = await ghl<{ users?: GhlUser[] }>(`/users/?locationId=${LOCATION_ID}`);
  const results: Record<string, unknown>[] = [];
  for (const u of users ?? []) {
    if (!u.email) continue;
    try {
      // Window = since this agent's last delivered recap.
      const { data: last } = await db.from("digest_runs").select("sent_at").eq("agent_email", u.email.toLowerCase())
        .order("sent_at", { ascending: false }).limit(1).maybeSingle();
      const since = last ? new Date(last.sent_at) : new Date(now.getTime() - DEFAULT_WINDOW_MS);

      const contacts = await assignedContacts(u.id);
      const recaps = await buildRecaps(contacts, since);
      if (!recaps.length) { results.push({ agent: u.email, active: 0, since: since.toISOString() }); continue; }
      const name = u.name || u.firstName || u.email;
      const { html, text } = renderEmail(name, slot, recaps);
      const payload = {
        agent_email: u.email, agent_name: name, slot, active_contacts: recaps.length,
        subject: `${slot} recap: ${recaps.length} of your contacts ${recaps.length === 1 ? "was" : "were"} active`,
        html, text,
      };
      if (preview || !webhook) { results.push({ agent: u.email, active: recaps.length, since: since.toISOString(), preview: payload }); continue; }
      const r = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      // Only a delivered recap moves the window forward.
      if (r.ok) await db.from("digest_runs").insert({ agent_email: u.email.toLowerCase(), slot, contacts: recaps.length, sent_at: now.toISOString() });
      results.push({ agent: u.email, active: recaps.length, sent: r.ok });
    } catch (e) {
      console.error("[digest] agent failed:", u.email, (e as Error).message);
      results.push({ agent: u.email, error: (e as Error).message });
    }
  }
  const failed = results.filter((r) => r.error || r.sent === false).length;
  return NextResponse.json({ ok: failed === 0, slot, webhookConfigured: !!webhook, results }, { status: failed ? 502 : 200 });
}
