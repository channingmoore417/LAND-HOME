"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { fetchCardsByKeys } from "@/lib/clientListings";
import ListingCard from "@/components/ListingCard";
import type { Card } from "@/lib/listings";

// Shown at the end of blog posts for signed-in users only — a quick way back
// to the homes they were just looking at. Renders nothing for signed-out
// visitors or users with no view history yet.
export default function RecentlyViewedBox() {
  const { user, ready } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!user) { setLoading(false); return; }
    getBrowserClient()
      .from("recently_viewed")
      .select("listing_key, viewed_at")
      .eq("user_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(5)
      .then(async ({ data }) => {
        const keys = ((data as { listing_key: string }[]) ?? []).map((r) => r.listing_key);
        setCards(await fetchCardsByKeys(keys));
        setLoading(false);
      });
  }, [ready, user]);

  if (!ready || !user || loading || cards.length === 0) return null;

  return (
    <section className="recently-viewed">
      <span className="script" style={{ fontSize: "1.4rem" }}>pick up where you left off</span>
      <h2 className="section__title" style={{ marginTop: 0 }}>Homes You&apos;ve Recently Viewed</h2>
      <div className="listings__grid">
        {cards.map((c) => <ListingCard key={c.listing_key} c={c} />)}
      </div>
    </section>
  );
}
