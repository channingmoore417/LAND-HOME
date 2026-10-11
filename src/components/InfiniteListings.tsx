"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import type { Card } from "@/lib/listings";

// Keeps loading the next homes as the visitor scrolls, so landing pages don't
// need a "next page" click. The first batch is server-rendered by the page
// (crawlable); this continues from `offset` and stops when everything is shown.
export default function InfiniteListings({ params, offset, total, noun, seeAllHref }: {
  params: string; offset: number; total: number; noun: string; seeAllHref: string;
}) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(offset >= total);
  const [failed, setFailed] = useState(false);
  const next = useRef(offset);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/seo-listings?${params}${params ? "&" : ""}offset=${next.current}`);
      if (!res.ok) throw new Error(String(res.status));
      const data: { cards: Card[]; total: number } = await res.json();
      next.current += data.cards.length;
      setCards((prev) => {
        const seen = new Set(prev.map((c) => c.listing_key));
        return [...prev, ...data.cards.filter((c) => !seen.has(c.listing_key))];
      });
      if (data.cards.length === 0 || next.current >= data.total) setDone(true);
    } catch {
      setFailed(true); // stop auto-loading; the visitor can retry
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [params, done]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || failed) return;
    if (typeof IntersectionObserver === "undefined") { load(); return; }
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) load(); }, { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [load, done, failed, cards.length]);

  return (
    <>
      {cards.length > 0 && (
        <div className="listings__grid" style={{ marginTop: 28 }}>
          {cards.map((c) => <ListingCard key={c.listing_key} c={c} />)}
        </div>
      )}
      {!done && <div ref={sentinel} style={{ height: 1 }} aria-hidden="true" />}
      {loading && <p className="inflist__status">Loading more homes…</p>}
      {failed && (
        <p className="inflist__status">
          Couldn&apos;t load more. <button type="button" className="inflist__retry" onClick={() => { setFailed(false); load(); }}>Try again</button>
        </p>
      )}
      {done && cards.length > 0 && (
        <p className="inflist__status">
          That&apos;s all {total.toLocaleString()} {noun}. <Link href={seeAllHref}>Search with filters and the map</Link>
        </p>
      )}
    </>
  );
}
