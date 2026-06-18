"use client";

import { useState } from "react";

// A "Filters" button that opens the filter controls in a slide-in drawer.
// Used on the map view (where the persistent sidebar isn't shown).
export default function FilterDrawer({ children, active }: { children: React.ReactNode; active?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="filterbtn" onClick={() => setOpen(true)}>
        <span aria-hidden>⚙</span> Filters{active ? ` (${active})` : ""}
      </button>
      {open && (
        <div className="filterdrawer" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="filterdrawer__panel" onClick={(e) => e.stopPropagation()}>
            <div className="filterdrawer__head">
              <h3>Filters</h3>
              <button type="button" className="filterdrawer__close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
            </div>
            {children}
            <button type="button" className="btn btn--primary filterdrawer__done" onClick={() => setOpen(false)}>Show results</button>
          </div>
        </div>
      )}
    </>
  );
}
