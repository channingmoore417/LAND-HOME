"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { logActivity } from "@/lib/activity";
import { trackSignal } from "@/lib/signals";

// Records a listing view for signed-in users (powers "recently viewed" + the
// activity log).
export default function TrackView({ listingKey }: { listingKey: string }) {
  const { user, ready } = useAuth();
  // Behavioral signal: counts views for anonymous AND signed-in visitors.
  useEffect(() => {
    if (!ready) return;
    trackSignal("listing_view", { listingKey });
  }, [ready, listingKey]);
  useEffect(() => {
    if (!user) return;
    getBrowserClient()
      .from("recently_viewed")
      .upsert(
        { user_id: user.id, listing_key: listingKey, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,listing_key" },
      )
      .then(() => {});
    logActivity("view_listing", { listingKey });
  }, [user, listingKey]);
  return null;
}
