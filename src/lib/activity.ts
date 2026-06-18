"use client";

import { getBrowserClient } from "@/lib/supabaseBrowser";

export type ActivityType =
  | "view_listing" | "save" | "unsave" | "search" | "quiz" | "guide" | "valuation";

// Records a user action to their activity stream. No-op when signed out.
// Uses the locally-cached session (no extra network round-trip to check auth).
export async function logActivity(
  type: ActivityType,
  opts?: { listingKey?: string; meta?: Record<string, unknown> },
) {
  try {
    const sb = getBrowserClient();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    await sb.from("user_activity").insert({
      user_id: session.user.id,
      type,
      listing_key: opts?.listingKey ?? null,
      meta: opts?.meta ?? {},
    });
  } catch { /* activity logging is best-effort */ }
}
