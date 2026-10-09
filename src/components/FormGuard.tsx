"use client";

import { useCallback, useEffect, useId, useRef } from "react";

// ============================================================
// Client half of the spam filter. Every form on the site uses this so the
// server sees the same signals everywhere:
//
//   company            — honeypot; hidden from humans, bots fill it in
//   form_loaded_at     — when the form was rendered (catches instant submits)
//   human_interactions — key/pointer events before submit (catches headless
//                        bots that write values straight into the DOM)
//
// Nothing here blocks a submission on its own; the server scores these in
// src/lib/spam.ts. See that file for how they are weighted.
//
// Call useFormGuard() once PER FORM — the honeypot ref belongs to a single
// input, so a page with several forms (a listing page has three) needs one
// guard each. Interaction counting is shared page-wide, below.
// ============================================================

// Page-level, so N guards on a page still install one set of listeners.
let interactions = 0;
let listenerRefs = 0;
const EVENTS = ["keydown", "pointerdown", "touchstart"] as const;

function bump() {
  interactions += 1;
}

function watchInteractions(): () => void {
  if (listenerRefs === 0) {
    for (const e of EVENTS) window.addEventListener(e, bump, { passive: true });
  }
  listenerRefs += 1;
  return () => {
    listenerRefs -= 1;
    if (listenerRefs === 0) {
      for (const e of EVENTS) window.removeEventListener(e, bump);
    }
  };
}

export interface GuardSignals {
  company: string;
  form_loaded_at: number;
  human_interactions: number;
}

export function useFormGuard() {
  const loadedAt = useRef<number>(Date.now());
  const hpRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => watchInteractions(), []);

  const signals = useCallback(
    (): GuardSignals => ({
      company: hpRef.current?.value ?? "",
      form_loaded_at: loadedAt.current,
      human_interactions: interactions,
    }),
    [],
  );

  /** POSTs to the single /api/forms webhook with the spam signals attached. */
  const submit = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
          ...payload,
          ...signals(),
        }),
      });
      return res.ok;
    },
    [signals],
  );

  return { hpRef, signals, submit };
}

/** Render inside every guarded form. Off-screen via .hp-field, never focusable. */
export function HoneypotField({
  inputRef,
}: {
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
}) {
  const id = useId();
  return (
    <div className="hp-field" aria-hidden="true">
      <label htmlFor={id}>Company (leave this blank)</label>
      <input
        type="text"
        id={id}
        name="company"
        ref={inputRef}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
