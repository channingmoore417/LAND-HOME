// ============================================================
// Match engine: which homes should this person hear about?
//
// Uses the SAME filter code as the site search (applyListingFilters), so an
// alert means exactly what the search page means by "matches". Reads Supabase
// only — never Trestle.
//
// Events per home:
//   new            first_seen_at after the search was created (and not already sent)
//   back_on_market status flipped back to Active (listing_history, written by trigger)
//   price_drop     list price lowered (listing_history)
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { applyListingFilters, CARD_SELECT, type Card, type ListingCriteria } from "@/lib/listings";
import { normalizeCriteria, summarizeCriteria } from "@/lib/alerts/criteria";
import { photo } from "@/lib/images";
import { titleCase } from "@/lib/format";
import type { AlertEvent, Client, MatchedListing, SavedSearchRow } from "@/lib/alerts/types";

const COLS = `${CARD_SELECT}, first_seen_at`;
const NEW_MAX_AGE_DAYS = 30; // never alert on something "new" more than a month ago
const MAX_PER_SEARCH = 60;
const MAX_EVENT_KEYS = 150;

type Row = Card & { first_seen_at: string | null };

export interface FindOptions {
  /** Ignore the sent-log and look back this many days (weekly text / matches page). */
  lookbackDays?: number;
  /** Events (price drop / back on market) must be newer than this. */
  eventsSince?: Date;
}

const PRIORITY: Record<AlertEvent, number> = { new: 0, back_on_market: 1, price_drop: 2 };

function why(card: Card, crit: ListingCriteria): string {
  const bits: string[] = [];
  if (card.city) bits.push(titleCase(card.city));
  if (card.bedrooms_total) bits.push(`${card.bedrooms_total} bd`);
  if (card.bathrooms_total) bits.push(`${card.bathrooms_total} ba`);
  for (const f of crit.features ?? []) bits.push(f.replace(/_/g, " "));
  if (crit.priceMax && card.list_price && card.list_price < crit.priceMax) {
    const under = Math.round((crit.priceMax - card.list_price) / 1000);
    if (under >= 5) bits.push(`$${under}k under your max`);
  }
  return bits.join(" · ");
}

export async function findMatches(
  admin: SupabaseClient,
  client: Pick<Client, "id" | "last_digest_at">,
  searches: SavedSearchRow[],
  opts: FindOptions = {},
): Promise<MatchedListing[]> {
  const active = searches.filter((s) => s.active);
  if (active.length === 0) return [];

  const now = Date.now();
  const lookbackMs = opts.lookbackDays ? opts.lookbackDays * 86_400_000 : null;

  // Already-sent log (only consulted for the digest, not the 7-day text/page).
  const sent = new Set<string>();
  if (!lookbackMs) {
    const { data } = await admin.from("alert_sent_listings").select("listing_key, event").eq("client_id", client.id);
    for (const r of data ?? []) sent.add(`${r.listing_key}:${r.event}`);
  }

  // Price-drop / back-on-market history, once for all searches.
  const eventsSince = lookbackMs
    ? new Date(now - lookbackMs)
    : opts.eventsSince ?? (client.last_digest_at ? new Date(client.last_digest_at) : new Date(now - 7 * 86_400_000));
  const { data: hist } = await admin
    .from("listing_history")
    .select("listing_key, event_type, old_price, price, created_at")
    .in("event_type", ["price_drop", "back_on_market"])
    .gt("created_at", eventsSince.toISOString())
    .order("created_at", { ascending: false })
    .limit(MAX_EVENT_KEYS);
  const histByKey = new Map<string, { event: AlertEvent; oldPrice: number | null }>();
  for (const h of hist ?? []) {
    const ev = h.event_type as AlertEvent;
    const prev = histByKey.get(h.listing_key);
    if (!prev || PRIORITY[ev] < PRIORITY[prev.event]) histByKey.set(h.listing_key, { event: ev, oldPrice: h.old_price });
  }

  const found = new Map<string, MatchedListing>();
  const put = (row: Row, event: AlertEvent, crit: ListingCriteria, oldPrice?: number | null) => {
    const prev = found.get(row.listing_key);
    if (prev && PRIORITY[prev.event] <= PRIORITY[event]) return;
    found.set(row.listing_key, { card: row, event, oldPrice, why: why(row, crit), photo: null });
  };

  for (const s of active) {
    const crit = normalizeCriteria(s.criteria);
    const baseline = Math.max(
      new Date(s.baseline_at).getTime(),
      now - (lookbackMs ?? NEW_MAX_AGE_DAYS * 86_400_000),
    );
    // For the 7-day view the baseline is ignored: show last week's matches even for a new search.
    const since = lookbackMs ? now - lookbackMs : baseline;

    const newQ = applyListingFilters(admin.from("listings").select(COLS), crit)
      .gt("first_seen_at", new Date(since).toISOString())
      .order("first_seen_at", { ascending: false })
      .limit(MAX_PER_SEARCH);
    const { data: fresh, error } = await newQ;
    if (error) throw new Error(`new-listings query failed: ${error.message}`);
    for (const row of (fresh as Row[]) ?? []) {
      if (!lookbackMs && sent.has(`${row.listing_key}:new`)) continue;
      put(row, "new", crit);
    }

    const keys = [...histByKey.keys()];
    if (keys.length > 0) {
      const evQ = applyListingFilters(admin.from("listings").select(COLS), crit).in("listing_key", keys);
      const { data: evRows, error: evErr } = await evQ;
      if (evErr) throw new Error(`event query failed: ${evErr.message}`);
      for (const row of (evRows as Row[]) ?? []) {
        const h = histByKey.get(row.listing_key)!;
        // A home that is also "new" keeps the stronger "new" label (see put()).
        put(row, h.event, crit, h.oldPrice);
      }
    }
  }

  const matches = [...found.values()].sort((a, b) => {
    if (PRIORITY[a.event] !== PRIORITY[b.event]) return PRIORITY[a.event] - PRIORITY[b.event];
    const at = (a.card as Row).first_seen_at ?? "";
    const bt = (b.card as Row).first_seen_at ?? "";
    return at < bt ? 1 : -1;
  });

  await attachPhotos(admin, matches);
  return matches;
}

async function attachPhotos(admin: SupabaseClient, matches: MatchedListing[]) {
  const keys = matches.slice(0, 60).map((m) => m.card.listing_key);
  if (keys.length === 0) return;
  const { data } = await admin
    .from("listing_media")
    .select("listing_key, media_url, order")
    .in("listing_key", keys)
    .order("order", { ascending: true })
    .limit(1000);
  const first = new Map<string, string>();
  for (const m of (data as { listing_key: string; media_url: string }[]) ?? []) {
    if (!first.has(m.listing_key)) first.set(m.listing_key, m.media_url);
  }
  for (const m of matches) {
    const u = first.get(m.card.listing_key);
    m.photo = u ? photo(u, 800) : null;
    m.card.photo_url = u ?? null;
  }
}

/** Active searches for a client, plus a human summary for emails/pages. */
export async function loadSearches(admin: SupabaseClient, clientId: number) {
  const { data } = await admin
    .from("saved_searches")
    .select("id, client_id, name, criteria, active, baseline_at, source")
    .eq("client_id", clientId)
    .eq("active", true);
  const searches = (data as SavedSearchRow[]) ?? [];
  // Distinct searches only, capped so the email line stays short ("A | B (+1 more)").
  const distinct = [...new Set(searches.map((s) => summarizeCriteria(normalizeCriteria(s.criteria))))];
  const summary = distinct.length > 2 ? `${distinct.slice(0, 2).join(" | ")} (+${distinct.length - 2} more)` : distinct.join(" | ");
  return { searches, summary };
}
