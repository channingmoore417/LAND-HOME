"use client";

import { getBrowserClient } from "@/lib/supabaseBrowser";
import { clickAttribution } from "@/lib/attribution";

export type SignalType = "listing_view" | "listing_saved" | "saved_search" | "session_start" | "identify";

// Fire-and-forget behavioral signal -> /api/signals (Supabase + GHL).
// Attaches the Supabase JWT when signed in so the server can resolve the
// email; the anonymous visitor id lives in a server-set cookie.
export async function trackSignal(
  type: SignalType,
  opts?: { listingKey?: string; criteria?: Record<string, unknown> },
) {
  try {
    const { data: { session } } = await getBrowserClient().auth.getSession();
    await fetch("/api/signals", {
      method: "POST",
      keepalive: true,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ type, listing_key: opts?.listingKey, criteria: opts?.criteria, attribution: clickAttribution() }),
    });
  } catch { /* tracking is best-effort */ }
}
