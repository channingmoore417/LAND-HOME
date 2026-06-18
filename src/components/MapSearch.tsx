"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import type { Card, MapPin } from "@/lib/listings";
import type { MapBounds } from "@/components/ListingsMap";

// Leaflet touches window → client-only.
const ListingsMap = dynamic(() => import("@/components/ListingsMap"), {
  ssr: false,
  loading: () => <div className="lmap__loading">Loading map…</div>,
});

export default function MapSearch({
  initialCards,
  initialPins,
  initialTotal,
  query,
  qText,
  listHref,
}: {
  initialCards: Card[];
  initialPins: MapPin[];
  initialTotal: number;
  query: string; // active filter query string (no view/page)
  qText: string; // current search text (for the input)
  listHref: string; // link to the List view (preserves filters)
}) {
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [pins, setPins] = useState<MapPin[]>(initialPins);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [searchOnMove, setSearchOnMove] = useState(true);
  const [mobilePane, setMobilePane] = useState<"list" | "map">("list");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBounds = useRef<MapBounds | null>(null);

  const run = useCallback(async (b: MapBounds | null) => {
    setLoading(true);
    try {
      const p = new URLSearchParams(query);
      if (b) { p.set("s", b.s.toFixed(5)); p.set("n", b.n.toFixed(5)); p.set("w", b.w.toFixed(5)); p.set("e", b.e.toFixed(5)); }
      const res = await fetch(`/api/listings/search?${p.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setCards(data.cards ?? []);
      setPins(data.pins ?? []);
      setTotal(data.total ?? 0);
    } catch { /* keep previous results */ }
    setLoading(false);
  }, [query]);

  const onBoundsChange = useCallback((b: MapBounds) => {
    lastBounds.current = b;
    if (!searchOnMove) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(b), 450);
  }, [searchOnMove, run]);

  function toggleSearchOnMove(next: boolean) {
    setSearchOnMove(next);
    // Turning it on immediately searches the current view; off reverts to all.
    run(next ? lastBounds.current : null);
  }

  return (
    <div className={`mapsearch mapsearch--${mobilePane}`}>
      <div className="mapsearch__bar">
        <form className="hsearch hsearch--bar" action="/listings" method="get">
          <input type="hidden" name="view" value="split" />
          <input className="hsearch__input" type="text" name="q" defaultValue={qText}
            placeholder="Search by city, address, or ZIP…" aria-label="Search properties" />
          <button className="hsearch__btn" type="submit">Search</button>
        </form>
        <label className="mapsearch__toggle">
          <input type="checkbox" checked={searchOnMove} onChange={(e) => toggleSearchOnMove(e.target.checked)} />
          <span>{loading ? "Searching…" : <><b>{total.toLocaleString()}</b> homes · search as I move</>}</span>
        </label>
        <div className="viewtoggle mapsearch__view">
          <span className="is-on">Map</span>
          <a href={listHref}>List</a>
        </div>
        <div className="mapsearch__panes">
          <button type="button" className={mobilePane === "list" ? "is-on" : ""} onClick={() => setMobilePane("list")}>List</button>
          <button type="button" className={mobilePane === "map" ? "is-on" : ""} onClick={() => setMobilePane("map")}>Map</button>
        </div>
      </div>

      <div className="mapsearch__split">
        <div className="mapsearch__map">
          <ListingsMap pins={pins} onBoundsChange={onBoundsChange} />
        </div>
        <div className="mapsearch__list">
          {cards.length === 0 ? (
            <div className="empty">
              <span className="script">no matches</span>
              <h3>No homes in this view</h3>
              <p>Zoom out or pan the map, or clear a filter.</p>
              <Link href="/listings">Reset all filters</Link>
            </div>
          ) : (
            <div className="mapsearch__grid">
              {cards.map((c) => <ListingCard key={c.listing_key} c={c} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
