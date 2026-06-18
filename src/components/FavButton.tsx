"use client";

import { useAuth } from "@/components/AuthProvider";

// Save/heart toggle on a listing card. Clicking it saves the home for a
// signed-in user, or opens the instant sign-up modal (and saves right after).
export default function FavButton({ listingKey }: { listingKey: string }) {
  const { isFav, toggleFav } = useAuth();
  const on = isFav(listingKey);
  return (
    <button
      className={`pcard__fav${on ? " on" : ""}`}
      aria-label={on ? "Saved" : "Save this home"}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFav(listingKey);
      }}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
