import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";
import { SITE_URL } from "@/lib/seoConfig";
import { addNote, addTask, findContact, findContactId, ghlConfigured } from "@/lib/alerts/ghl";

export const runtime = "nodejs";

// ============================================================
// Behavioral intent signals (medium intent) -> Supabase -> GHL.
//   1. repeat_listing_view   same property viewed 3 times
//   2. listing_saved         property saved / favorited
//   3. saved_search_created / saved_search_narrowed
//   4. return_visit          back after 30+ days (band 30_60 | 60_plus)
// Raw events go to behavior_events; derived signals to intent_signals.
// A signal is forwarded to GHL_SIGNALS_WEBHOOK_URL only once we know the
// visitor's email (signed in). Earlier anonymous signals are flushed on
// the first authenticated request ("identify").
// ============================================================

const EVENT_TYPES = ["listing_view", "listing_saved", "saved_search", "session_start", "identify"] as const;
type EventType = (typeof EVENT_TYPES)[number];

const VIEW_THRESHOLD = 3;
const VIEW_DEBOUNCE_MS = 10 * 1000; // only ignores one page load reporting twice; every real revisit counts
const RETURN_MIN_DAYS = 30;
const RETURN_BAND_MAX_DAYS = 60;
const VID_COOKIE = "lhg_vid";
// GHL "Website Behavior Signal" inbound webhook. GHL_SIGNALS_WEBHOOK_URL overrides it without a code change.
const SIGNALS_WEBHOOK =
  process.env.GHL_SIGNALS_WEBHOOK_URL ||
  "https://services.leadconnectorhq.com/hooks/xdGkCWotXaek58gmTbxt/webhook-trigger/9b2af318-2526-4ac6-8a05-722dee778f66";

// Saves, saved searches and showing requests already reach GHL through the
// database triggers (favorites_to_ghl, saved_searches_to_ghl, ...). Forwarding
// them here too would text the team twice, so only the signals GHL does NOT
// already get are sent; the rest are recorded in Supabase only.
const GHL_SIGNALS = new Set(["repeat_listing_view", "return_visit"]);

const TAGS: Record<string, string[]> = {
  repeat_listing_view: ["intent:medium", "intent:repeat-listing-view"],
  listing_saved: ["intent:medium", "intent:saved-listing"],
  saved_search_created: ["intent:medium", "intent:saved-search"],
  saved_search_narrowed: ["intent:medium", "intent:saved-search", "intent:search-narrowed"],
  return_visit_30_60: ["intent:medium", "intent:returned-30-60d"],
  return_visit_60_plus: ["intent:medium", "intent:returned-60d-plus"],
};

const LABELS: Record<string, string> = {
  repeat_listing_view: "Very interested in this property",
  listing_saved: "Saved a property",
  saved_search_created: "Saved a search",
  saved_search_narrowed: "Narrowed a saved search",
  return_visit: "Returned to the website after being away",
};

interface Body {
  type?: string;
  listing_key?: string;
  criteria?: Record<string, unknown>;
  attribution?: Record<string, unknown>;
}

interface Actor {
  visitorId: string;
  userId: string | null;
  email: string | null;
  clientId?: number | null; // set when identified by an alert-email link (lhg_client cookie)
}

type Admin = ReturnType<typeof getAdminClient>;

function readCookie(req: Request, name: string): string | null {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function reply(vid: string, body: Record<string, unknown>, status = 200) {
  const res = NextResponse.json(body, { status });
  // Server-set first-party cookie (1 yr). Survives Safari's 7-day cap on
  // script-written storage, which matters for 30–60 day return detection.
  res.cookies.set(VID_COOKIE, vid, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

// Normalize search criteria to a comparable object.
function normCriteria(c: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!c || typeof c !== "object") return out;
  for (const [k, v] of Object.entries(c)) {
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
    out[k] = Array.isArray(v) ? [...v].map(String).sort() : v;
  }
  return out;
}

// True when `next` is strictly tighter than `prev`: keeps every prior filter
// (or tightens it) and adds / tightens at least one.
function isNarrower(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  let tighter = false;
  for (const [k, pv] of Object.entries(prev)) {
    if (!(k in next)) return false; // dropped a filter -> broadened
    const nv = next[k];
    if (JSON.stringify(pv) === JSON.stringify(nv)) continue;
    if (k === "minPrice" || k === "beds" || k === "baths") {
      if (Number(nv) > Number(pv)) { tighter = true; continue; }
      return false;
    }
    if (k === "maxPrice") {
      if (Number(nv) < Number(pv)) { tighter = true; continue; }
      return false;
    }
    if (Array.isArray(pv) && Array.isArray(nv)) {
      if ((pv as string[]).every((x) => (nv as string[]).includes(x)) && nv.length > pv.length) { tighter = true; continue; }
      return false;
    }
    return false; // a different city/type/etc. is a new search, not a narrowing
  }
  if (Object.keys(next).some((k) => !(k in prev))) tighter = true;
  return tighter;
}

async function recordSignal(
  db: Admin, a: Actor, signal: string, dedupeKey: string,
  listingKey: string | null, meta: Record<string, unknown>,
  attribution: Record<string, string> = {},
) {
  const { error } = await db.from("intent_signals").insert({
    signal, visitor_id: a.visitorId, user_id: a.userId,
    dedupe_key: dedupeKey, listing_key: listingKey, meta: { ...meta, attribution },
  });
  if (error) {
    if (error.code === "23505") return; // already recorded
    console.error("[signals] insert failed:", error.message);
  }
}

// Deliver every unforwarded signal for this visitor/user to GHL.
async function flushToGhl(db: Admin, a: Actor) {
  const url = SIGNALS_WEBHOOK;
  if (!a.email) return;
  const filter = a.userId ? `visitor_id.eq.${a.visitorId},user_id.eq.${a.userId}` : `visitor_id.eq.${a.visitorId}`;
  const { data: pending } = await db
    .from("intent_signals").select("*").is("forwarded_at", null).or(filter).order("created_at");
  if (!pending?.length) return;

  const { data: profile } = a.userId
    ? await db.from("profiles").select("full_name, phone").eq("id", a.userId).maybeSingle()
    : { data: null };

  for (const s of pending) {
    let listing: Record<string, unknown> | null = null;
    if (s.listing_key) {
      const { data } = await db
        .from("listings")
        .select("listing_key, unparsed_address, city, state_or_province, postal_code, list_price, internet_address_yn")
        .eq("listing_key", s.listing_key).maybeSingle();
      listing = data;
    }
    const tagKey = s.signal === "return_visit" ? `return_visit_${s.meta?.band ?? "30_60"}` : s.signal;
    const payload = {
      event: "intent_signal",
      signal: s.signal,
      signal_label: LABELS[s.signal] ?? s.signal,
      signal_detail:
        s.signal === "return_visit" ? `${s.meta?.days_inactive} days since last visit`
        : s.signal === "repeat_listing_view" ? `Viewed this home ${s.meta?.view_count} times`
        : s.meta?.criteria ? JSON.stringify(s.meta.criteria) : "",
      intent_level: "medium",
      tags: TAGS[tagKey] ?? ["intent:medium"],
      occurred_at: s.created_at,
      email: a.email,
      name: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      listing_key: s.listing_key,
      listing_url: s.listing_key ? `${SITE_URL}/listings/${s.listing_key}` : null,
      // Full address (street, city, state ZIP) + a link the team can open.
      listing_address:
        listing && listing.internet_address_yn !== false && listing.unparsed_address
          ? [listing.unparsed_address, listing.city,
             `${listing.state_or_province ?? "LA"} ${listing.postal_code ?? ""}`.trim()].filter(Boolean).join(", ")
          : null,
      listing_city: listing?.city ?? null,
      listing_price: listing?.list_price ?? null,
      ...(s.meta?.attribution ?? {}),
      ...s.meta,
    };
    let ok = false;
    if (!GHL_SIGNALS.has(s.signal)) {
      ok = true; // already delivered by the DB triggers; just mark done
    } else if (url) {
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        ok = r.ok;
        if (!r.ok) console.error("[signals] ghl webhook non-2xx:", r.status);
      } catch (e) {
        console.error("[signals] ghl webhook failed:", (e as Error).message);
      }
    }
    // Without a webhook configured we leave signals pending so nothing is lost.
    if (ok) await db.from("intent_signals").update({ forwarded_at: new Date().toISOString(), user_id: a.userId }).eq("id", s.id);
  }
}

const CT = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " CT";
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Every property view goes into the contact's GHL activity feed as a note
// (address linked, price, beds/baths, and "opened from an alert email" when it was).
// Views from before the visitor was identified are logged on the first identified
// hit. Only EXISTING GHL contacts get notes; unlogged views wait for one to appear.
async function logViewsToGhl(db: Admin, a: Actor) {
  if (!a.email || !ghlConfigured()) return;
  const filter = a.userId ? `visitor_id.eq.${a.visitorId},user_id.eq.${a.userId}` : `visitor_id.eq.${a.visitorId}`;
  const { data: rows } = await db
    .from("behavior_events").select("id, listing_key, created_at")
    .eq("type", "listing_view").is("ghl_logged_at", null).or(filter).order("created_at").limit(20);
  if (!rows?.length) return;
  const contactId = await findContactId(a.email);
  if (!contactId) return;

  const keys = [...new Set(rows.map((r) => r.listing_key).filter(Boolean))] as string[];
  const { data: ls } = await db
    .from("listings")
    .select("listing_key, unparsed_address, city, state_or_province, postal_code, list_price, bedrooms_total, bathrooms_total, internet_address_yn")
    .in("listing_key", keys);
  const byKey = new Map((ls ?? []).map((l) => [l.listing_key, l]));

  let clicked = new Set<string>();
  if (a.clientId) {
    const since = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    const { data: ev } = await db.from("alert_events").select("listing_key").eq("client_id", a.clientId).eq("type", "listing_click").gte("created_at", since);
    clicked = new Set((ev ?? []).map((e) => e.listing_key as string));
  }

  for (const r of rows) {
    const l = byKey.get(r.listing_key as string);
    const url = `${SITE_URL}/listings/${r.listing_key}`;
    const showAddr = !!l && l.internet_address_yn !== false && !!l.unparsed_address;
    const addr = showAddr
      ? [l!.unparsed_address, l!.city, `${l!.state_or_province ?? "LA"} ${l!.postal_code ?? ""}`.trim()].filter(Boolean).join(", ")
      : `a home in ${l?.city ?? "Southwest Louisiana"}`;
    const facts = l
      ? [l.list_price ? `$${Number(l.list_price).toLocaleString("en-US")}` : "", l.bedrooms_total ? `${l.bedrooms_total} bd` : "", l.bathrooms_total ? `${l.bathrooms_total} ba` : ""].filter(Boolean).join(" · ")
      : "";
    const html =
      `<p><span style="color:#00695C"><strong>👀 Viewed a home</strong></span> · ${CT(r.created_at)}</p>` +
      `<p>📍 <a href="${esc(url)}">${esc(addr)}</a></p>` +
      (facts ? `<p>${esc(facts)}</p>` : "") +
      (clicked.has(r.listing_key as string) ? `<p><em>Opened from an alert email</em></p>` : "");
    const res = await addNote(contactId, html);
    if (res.ok) await db.from("behavior_events").update({ ghl_logged_at: new Date().toISOString() }).eq("id", r.id);
    else { console.error("[signals] ghl note failed:", res.detail); break; }
  }
}

// A home save puts a task on the contact's owner in GHL (they are notified and it lands in
// their task list) — in addition to the workflow's in-app notification, which GHL gives us no
// way to verify. One task per burst: saves within 15 minutes of an earlier one are covered by
// that task (every save still gets its own note). Only for contacts that already have an owner.
async function taskOwnerForSave(db: Admin, a: Actor, actorFilter: string, listingKey: string) {
  if (!a.email || !ghlConfigured()) return;
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await db.from("behavior_events").select("id", { count: "exact", head: true })
    .eq("type", "listing_saved").or(actorFilter).gte("created_at", since);
  if ((count ?? 0) > 1) return; // this save is the one just stored; any more means a task already went out
  const contact = await findContact(a.email);
  if (!contact?.assignedTo) return;
  const { data: l } = await db.from("listings")
    .select("unparsed_address, city, list_price, internet_address_yn").eq("listing_key", listingKey).maybeSingle();
  const where = l && l.internet_address_yn !== false && l.unparsed_address ? `${l.unparsed_address}, ${l.city ?? ""}`.replace(/,\s*$/, "") : `a home in ${l?.city ?? "Southwest Louisiana"}`;
  const price = l?.list_price ? ` · $${Number(l.list_price).toLocaleString("en-US")}` : "";
  const res = await addTask({
    contactId: contact.id, userId: contact.assignedTo,
    title: `${contact.name ?? a.email} saved a home`,
    body: `${where}${price}\n${SITE_URL}/listings/${listingKey}\nReach out while it's fresh.`,
  });
  if (!res.ok) console.error("[signals] ghl task failed:", res.detail);
}

export async function POST(req: Request) {
  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const vid = readCookie(req, VID_COOKIE) ?? crypto.randomUUID();
  const type = body.type as EventType;
  if (!EVENT_TYPES.includes(type)) return reply(vid, { ok: false, error: "bad type" }, 400);
  const listingKey = typeof body.listing_key === "string" && body.listing_key.length <= 64 ? body.listing_key : null;
  if ((type === "listing_view" || type === "listing_saved") && !listingKey) return reply(vid, { ok: false, error: "listing_key required" }, 400);

  const db = getAdminClient();
  // Ad-click fields (gclid, gbraid, wbraid, UTMs) so GHL can tie every signal back to the ad.
  const attribution: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.attribution ?? {})) if (typeof v === "string" && v.length < 600) attribution[k] = v;

  // Identify the user from their Supabase JWT (never trust a client-sent email).
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const actor: Actor = { visitorId: vid, userId: null, email: null };
  if (token) {
    const { data } = await db.auth.getUser(token);
    if (data.user) { actor.userId = data.user.id; actor.email = data.user.email ?? null; }
  }
  // Not signed in, but arrived through a link in one of our alert emails: that private
  // token already identifies the client (same trust as their matches page).
  if (!actor.email) {
    const ct = readCookie(req, "lhg_client");
    if (ct && /^[a-f0-9]{32}$/.test(ct)) {
      const { data: c } = await db.from("clients").select("id, email").eq("token", ct).maybeSingle();
      if (c?.email) { actor.email = c.email; actor.clientId = c.id; }
    }
  }

  try {
    // Link earlier anonymous events to the account on first authenticated hit.
    if (actor.userId) {
      await db.from("behavior_events").update({ user_id: actor.userId }).eq("visitor_id", vid).is("user_id", null);
    }

    const actorFilter = actor.userId ? `visitor_id.eq.${vid},user_id.eq.${actor.userId}` : `visitor_id.eq.${vid}`;
    const now = Date.now();

    // Inactivity check runs on the first event of any visit, before it is
    // stored, so event ordering (view vs session_start) can't hide the gap.
    if (type !== "identify") {
      const { data: prev } = await db.from("behavior_events").select("created_at").or(actorFilter)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (prev) {
        const days = Math.floor((now - new Date(prev.created_at).getTime()) / 86_400_000);
        if (days >= RETURN_MIN_DAYS) {
          const band = days <= RETURN_BAND_MAX_DAYS ? "30_60" : "60_plus";
          await recordSignal(db, actor, "return_visit", new Date().toISOString().slice(0, 10), null, { days_inactive: days, band }, attribution);
        }
      }
    }

    if (type === "session_start") {
      await db.from("behavior_events").insert({ visitor_id: vid, user_id: actor.userId, type, meta: {} });
    } else if (type === "listing_view") {
      const { data: last } = await db.from("behavior_events").select("created_at").eq("type", type)
        .eq("listing_key", listingKey!).or(actorFilter).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!last || now - new Date(last.created_at).getTime() > VIEW_DEBOUNCE_MS) {
        await db.from("behavior_events").insert({ visitor_id: vid, user_id: actor.userId, type, listing_key: listingKey, meta: {} });
        const { count } = await db.from("behavior_events").select("id", { count: "exact", head: true })
          .eq("type", type).eq("listing_key", listingKey!).or(actorFilter);
        if ((count ?? 0) >= VIEW_THRESHOLD) {
          await recordSignal(db, actor, "repeat_listing_view", listingKey!, listingKey, { view_count: count }, attribution);
        }
      }
    } else if (type === "listing_saved") {
      await db.from("behavior_events").insert({ visitor_id: vid, user_id: actor.userId, type, listing_key: listingKey, meta: {} });
      await recordSignal(db, actor, "listing_saved", listingKey!, listingKey, {}, attribution);
      await taskOwnerForSave(db, actor, actorFilter, listingKey!);
    } else if (type === "saved_search") {
      const criteria = normCriteria(body.criteria);
      if (JSON.stringify(criteria).length > 2000) return reply(vid, { ok: false, error: "criteria too large" }, 400);
      const { data: prior } = await db.from("behavior_events").select("meta").eq("type", type).or(actorFilter)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      await db.from("behavior_events").insert({ visitor_id: vid, user_id: actor.userId, type, meta: { criteria } });
      const prev = prior?.meta?.criteria as Record<string, unknown> | undefined;
      const narrowed = !!prev && isNarrower(prev, criteria);
      await recordSignal(
        db, actor, narrowed ? "saved_search_narrowed" : "saved_search_created",
        `${Date.now()}`, null, { criteria, previous_criteria: narrowed ? prev : undefined }, attribution,
      );
    }
    // "identify" has no event of its own; it only triggers the flush below.

    await logViewsToGhl(db, actor);
    await flushToGhl(db, actor);
  } catch (e) {
    console.error("[signals] failed:", (e as Error).message);
    return reply(vid, { ok: false }, 500);
  }
  return reply(vid, { ok: true });
}
