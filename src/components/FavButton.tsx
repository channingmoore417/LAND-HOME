"use client";

import { useState } from "react";

// Save/heart toggle on a listing card. Visual-only for now (favorites are a
// service-role table); wire to a real saved-favorites flow when auth lands.
export default function FavButton() {
  const [on, setOn] = useState(false);
  return (
    <button
      className={`pcard__fav${on ? " on" : ""}`}
      aria-label={on ? "Saved" : "Save"}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOn((v) => !v);
      }}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
