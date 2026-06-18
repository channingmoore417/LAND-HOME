"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { logActivity } from "@/lib/activity";

// Records a listing view for signed-in users (powers "recently viewed" + the
// activity log).
export default function TrackView({ listingKey }: { listingKey: string }) {
  const { user } = useAuth();
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
