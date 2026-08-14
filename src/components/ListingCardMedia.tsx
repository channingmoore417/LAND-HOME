"use client";

import { useRef, useState } from "react";

// The photo area of a listing card — lets visitors slide through a
// listing's photos (click arrows or swipe) without opening the listing.
// All photos are pre-fetched server-side (see fetchPhotosMap), so this is
// pure client-side index state — no loading/fetching here.
export default function ListingCardMedia({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const swiped = useRef(false);

  if (photos.length === 0) {
    return <div style={{ width: "100%", height: "100%", background: "#cfe0e4" }} />;
  }

  const hasMultiple = photos.length > 1;
  const go = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length);

  function onArrowClick(delta: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    go(delta);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (!hasMultiple) return;
    touchStartX.current = e.touches[0].clientX;
    swiped.current = false;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!hasMultiple || touchStartX.current == null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 10) swiped.current = true;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!hasMultiple || touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) {
      e.preventDefault();
      e.stopPropagation();
      go(dx < 0 ? 1 : -1);
    }
  }
  // Swiping shouldn't also trigger the card's Link navigation.
  function onClickCapture(e: React.MouseEvent) {
    if (swiped.current) {
      e.preventDefault();
      e.stopPropagation();
      swiped.current = false;
    }
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClickCapture={onClickCapture}
      style={{ width: "100%", height: "100%" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photos[index]} alt={alt} loading="lazy" />
      {hasMultiple && (
        <>
          <button type="button" className="pcard__nav pcard__nav--prev" aria-label="Previous photo" onClick={(e) => onArrowClick(-1, e)}>
            &lsaquo;
          </button>
          <button type="button" className="pcard__nav pcard__nav--next" aria-label="Next photo" onClick={(e) => onArrowClick(1, e)}>
            &rsaquo;
          </button>
          <div className="pcard__dots">
            {photos.map((_, i) => (
              <span key={i} className={i === index ? "is-on" : ""} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
