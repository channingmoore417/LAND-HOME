"use client";

import { getBrowserClient } from "@/lib/supabaseBrowser";
import { CARD_SELECT, type Card } from "@/lib/listings";

const PHOTOS_PER_CARD = 6;

// Fetch listing cards (with up to 6 photos each, for the card slider) by
// key, client-side, preserving order.
export async function fetchCardsByKeys(keys: string[]): Promise<Card[]> {
  if (keys.length === 0) return [];
  const sb = getBrowserClient();
  const [{ data: rows }, { data: media }] = await Promise.all([
    sb.from("listings").select(CARD_SELECT).in("listing_key", keys),
    sb.from("listing_media").select("listing_key, media_url, order").in("listing_key", keys).order("order", { ascending: true }),
  ]);
  const photos = new Map<string, string[]>();
  for (const m of (media as { listing_key: string; media_url: string }[]) ?? []) {
    const arr = photos.get(m.listing_key) ?? [];
    if (arr.length < PHOTOS_PER_CARD) {
      arr.push(m.media_url);
      photos.set(m.listing_key, arr);
    }
  }
  const byKey = new Map<string, Card>();
  for (const r of (rows as Card[]) ?? []) {
    r.photos = photos.get(r.listing_key) ?? [];
    byKey.set(r.listing_key, r);
  }
  return keys.map((k) => byKey.get(k)).filter((x): x is Card => !!x);
}
