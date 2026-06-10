"use client";

import { useEffect, useState } from "react";

export interface Photo {
  url: string;
  alt: string;
}

// Hero gallery grid (1 large + 4) with a full lightbox. Mirrors the
// template layout; falls back gracefully when there are fewer photos.
export default function Gallery({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  const has = photos.length > 0;
  const grid = photos.slice(0, 5);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setI((p) => (p + 1) % photos.length);
      if (e.key === "ArrowLeft") setI((p) => (p - 1 + photos.length) % photos.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, photos.length]);

  function show(idx: number) {
    setI(idx);
    setOpen(true);
  }

  if (!has) {
    return (
      <div className="gallery" aria-hidden>
        <figure>
          <div style={{ width: "100%", height: "100%", background: "#222" }} />
        </figure>
      </div>
    );
  }

  return (
    <>
      <div className="gallery">
        {grid.map((p, idx) => (
          <figure key={idx} onClick={() => show(idx)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.alt} loading={idx === 0 ? "eager" : "lazy"} />
            {idx === 0 && photos.length > 1 && (
              <button
                className="gallery__more"
                onClick={(e) => {
                  e.stopPropagation();
                  show(0);
                }}
              >
                View all {photos.length} photos
              </button>
            )}
          </figure>
        ))}
      </div>

      <div className={`lightbox${open ? " open" : ""}`} onClick={() => setOpen(false)}>
        <div className="lightbox__bar">
          <span>
            {i + 1} / {photos.length}
          </span>
          <button aria-label="Close" onClick={() => setOpen(false)}>
            &times;
          </button>
        </div>
        <div className="lightbox__stage" onClick={(e) => e.stopPropagation()}>
          {photos.length > 1 && (
            <button
              className="lightbox__nav prev"
              aria-label="Previous"
              onClick={() => setI((p) => (p - 1 + photos.length) % photos.length)}
            >
              &#8249;
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[i].url} alt={photos[i].alt} />
          {photos.length > 1 && (
            <button
              className="lightbox__nav next"
              aria-label="Next"
              onClick={() => setI((p) => (p + 1) % photos.length)}
            >
              &#8250;
            </button>
          )}
        </div>
      </div>
    </>
  );
}
