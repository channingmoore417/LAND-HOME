"use client";

import { getBrowserClient } from "@/lib/supabaseBrowser";
import { CARD_SELECT, type Card } from "@/lib/listings";

// Fetch listing cards (with first photo) by key, client-side, preserving order.
export async function fetchCardsByKeys(keys: string[]): Promise<Card[]> {
  if (keys.length === 0) return [];
  const sb = getBrowserClient();
  const [{ data: rows }, { data: media }] = await Promise.all([
    sb.from("listings").select(CARD_SELECT).in("listing_key", keys),
    sb.from("listing_media").select("listing_key, media_url, order").in("listing_key", keys).order("order", { ascending: true }),
  ]);
  const first = new Map<string, string>();
  for (const m of (media as { listing_key: string; media_url: string }[]) ?? []) {
    if (!first.has(m.listing_key)) first.set(m.listing_key, m.media_url);
  }
  const byKey = new Map<string, Card>();
  for (const r of (rows as Card[]) ?? []) {
    r.photo_url = first.get(r.listing_key) ?? null;
    byKey.set(r.listing_key, r);
  }
  return keys.map((k) => byKey.get(k)).filter((x): x is Card => !!x);
}
