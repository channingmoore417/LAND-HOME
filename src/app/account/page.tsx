"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { fetchCardsByKeys } from "@/lib/clientListings";
import ListingCard from "@/components/ListingCard";
import type { Card } from "@/lib/listings";

interface SavedSearch { id: number; name: string | null; criteria: Record<string, unknown>; active: boolean }

export default function AccountPage() {
  const { user, ready, openAuth, signOut, favCount } = useAuth();
  const [saved, setSaved] = useState<Card[]>([]);
  const [recent, setRecent] = useState<Card[]>([]);
  const [recs, setRecs] = useState<Card[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const sb = getBrowserClient();
    const [{ data: favRows }, { data: rvRows }, { data: ssRows }] = await Promise.all([
      sb.from("favorites").select("listing_key, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      sb.from("recently_viewed").select("listing_key, viewed_at").eq("user_id", user.id).order("viewed_at", { ascending: false }).limit(8),
      sb.from("saved_searches").select("id, name, criteria, active").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    const favKeys = ((favRows as { listing_key: string }[]) ?? []).map((r) => r.listing_key);
    const recentKeys = ((rvRows as { listing_key: string }[]) ?? []).map((r) => r.listing_key).filter((k) => !favKeys.includes(k));
    const [savedCards, recentCards] = await Promise.all([fetchCardsByKeys(favKeys), fetchCardsByKeys(recentKeys)]);
    setSaved(savedCards);
    setRecent(recentCards);
    setSearches((ssRows as SavedSearch[]) ?? []);

    // Recommendations: active homes in the cities you've saved/viewed, similar
    // price/beds, excluding ones you've already saved.
    const seed = [...savedCards, ...recentCards];
    if (seed.length) {
      const cityCount = new Map<string, number>();
      for (const c of seed) if (c.city) cityCount.set(c.city, (cityCount.get(c.city) ?? 0) + 1);
      const topCity = [...cityCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const prices = seed.map((c) => c.list_price ?? 0).filter(Boolean);
      const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      let q = sb.from("listings").select("*").eq("standard_status", "Active").neq("internet_display_yn", false).gt("photos_count", 0).limit(6);
      if (topCity) q = q.ilike("city", topCity);
      if (avg) q = q.gte("list_price", Math.round(avg * 0.7)).lte("list_price", Math.round(avg * 1.3));
      const { data: recRows } = await q;
      const recKeys = ((recRows as { listing_key: string }[]) ?? [])
        .map((r) => r.listing_key)
        .filter((k) => !favKeys.includes(k) && !recentKeys.includes(k))
        .slice(0, 3);
      setRecs(await fetchCardsByKeys(recKeys));
    } else {
      setRecs([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (ready && user) load(); else if (ready) setLoading(false); }, [ready, user, load]);

  if (!ready) {
    return <main className="results"><div className="wrap"><p className="prose">Loading…</p></div></main>;
  }

  if (!user) {
    return (
      <main className="results">
        <div className="wrap" style={{ maxWidth: 560, textAlign: "center" }}>
          <span className="script" style={{ fontSize: "1.7rem" }}>your home search</span>
          <h1 className="section__title">Sign in to see your saved homes</h1>
          <p className="prose" style={{ color: "var(--ink-muted)" }}>
            Create a free account to save homes, track what you&apos;ve viewed, and get matched with
            listings that fit. It takes seconds.
          </p>
          <button className="btn btn--primary" style={{ maxWidth: 280, margin: "0 auto" }} onClick={() => openAuth()}>
            Sign in / Create account
          </button>
        </div>
      </main>
    );
  }

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";

  return (
    <>
      <header className="hero hero--index" style={{ paddingBottom: 60 }}>
        <div className="wrap">
          <span className="hero__script">welcome back</span>
          <h1>Hi {firstName}, here&apos;s your home search</h1>
          <p className="hero__sub">{favCount} saved {favCount === 1 ? "home" : "homes"} · everything in one place.</p>
          <div className="hero__cta">
            <Link className="btn btn--aqua" href="/listings">Browse more homes</Link>
            <button className="btn btn--hollow" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="results">
        <div className="wrap">
          {loading ? (
            <p className="prose">Loading your homes…</p>
          ) : (
            <>
              <Section title="Saved homes" eyebrow="your favorites" empty={saved.length === 0}
                emptyText="No saved homes yet — tap the ♡ on any listing to save it here.">
                {saved.map((c) => <ListingCard key={c.listing_key} c={c} />)}
              </Section>

              {recent.length > 0 && (
                <Section title="Recently viewed" eyebrow="pick up where you left off" empty={false}>
                  {recent.map((c) => <ListingCard key={c.listing_key} c={c} />)}
                </Section>
              )}

              {recs.length > 0 && (
                <Section title="Recommended for you" eyebrow="homes you might love" empty={false}>
                  {recs.map((c) => <ListingCard key={c.listing_key} c={c} />)}
                </Section>
              )}

              <section className="acct-searches">
                <span className="script" style={{ fontSize: "1.6rem" }}>saved searches</span>
                <h2 className="section__title" style={{ marginTop: 0 }}>Your saved searches</h2>
                {searches.length === 0 ? (
                  <p className="prose" style={{ color: "var(--ink-muted)" }}>
                    No saved searches yet. (Listing alerts are coming soon — you&apos;ll be able to save a
                    search and get notified when new matches hit the market.)
                  </p>
                ) : (
                  <ul className="acct-ss">
                    {searches.map((s) => (
                      <li key={s.id}>{s.name || "Saved search"} {s.active ? "· alerts on" : ""}</li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Section({ title, eyebrow, empty, emptyText, children }: {
  title: string; eyebrow: string; empty: boolean; emptyText?: string; children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 44 }}>
      <span className="script" style={{ fontSize: "1.6rem" }}>{eyebrow}</span>
      <h2 className="section__title" style={{ marginTop: 0 }}>{title}</h2>
      {empty ? (
        <p className="prose" style={{ color: "var(--ink-muted)" }}>{emptyText}</p>
      ) : (
        <div className="listings__grid">{children}</div>
      )}
    </section>
  );
}
