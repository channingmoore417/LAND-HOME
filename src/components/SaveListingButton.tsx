"use client";

import { useAuth } from "@/components/AuthProvider";

// Labeled "save this home" button for the property detail page. Saves for a
// signed-in user, or opens the instant sign-up modal then saves.
export default function SaveListingButton({ listingKey }: { listingKey: string }) {
  const { isFav, toggleFav } = useAuth();
  const on = isFav(listingKey);
  return (
    <button
      className={`savebtn${on ? " on" : ""}`}
      aria-pressed={on}
      onClick={() => toggleFav(listingKey)}
    >
      <span aria-hidden>{on ? "♥" : "♡"}</span> {on ? "Saved" : "Save this home"}
    </button>
  );
}
