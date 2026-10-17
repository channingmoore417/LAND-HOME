"use client";

import { useState } from "react";

// The "Search by city, address, or ZIP" box. Deliberately NOT a <form>: GoHighLevel's tracking
// script (see the root layout) records every submitted <form> as a lead, so a plain search was
// creating empty "Unidentified Form" contacts in GHL. Enter / the button just navigates.
export default function SearchBar({
  view,
  defaultQuery = "",
  className = "hsearch",
}: {
  view: "split" | "list";
  defaultQuery?: string;
  className?: string;
}) {
  const [q, setQ] = useState(defaultQuery);

  function go() {
    const p = new URLSearchParams();
    p.set("view", view);
    if (q.trim()) p.set("q", q.trim());
    window.location.assign(`/homes-for-sale?${p}`);
  }

  return (
    <div className={className} role="search">
      <input
        className="hsearch__input"
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(); } }}
        placeholder="Search by city, address, or ZIP…"
        aria-label="Search properties"
        enterKeyHint="search"
      />
      <button className="hsearch__btn" type="button" onClick={go}>Search</button>
    </div>
  );
}
