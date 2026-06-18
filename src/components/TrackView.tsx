"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";

// Records a listing view for signed-in users (powers "recently viewed").
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
  }, [user, listingKey]);
  return null;
}
